import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { WorkShift, EmployeeStatus, LeaveStatus, LeaveType, EmployeeType } from '@prisma/client';
import { prisma } from './db.js';

const hrRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function asyncRoute(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

interface AuthPayload { userId: string; role: string }
interface HrRequest extends Request {
  hrPayload: AuthPayload;
  accessibleStoreIds: string[] | null; // null = ADMIN (all stores)
}

/** Accepts both ADMIN and HR roles. Attaches accessible store IDs to request. */
function hrAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload;
    if (payload.role !== 'ADMIN' && payload.role !== 'HR') {
      res.status(403).json({ error: 'HR or Admin access required' }); return;
    }
    const hrReq = req as HrRequest;
    hrReq.hrPayload = payload;

    if (payload.role === 'ADMIN') {
      // Admin sees everything
      hrReq.accessibleStoreIds = null;
      next();
    } else {
      // HR: load their assigned stores
      prisma.hrStoreAccess.findMany({
        where: { hrUserId: payload.userId },
        select: { storeId: true }
      }).then(rows => {
        hrReq.accessibleStoreIds = rows.map(r => r.storeId);
        next();
      }).catch(() => { res.status(500).json({ error: 'Failed to load store access' }); });
    }
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

/** Admin-only (for creating HR users and managing access) */
function adminOnly(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload;
    if (payload.role !== 'ADMIN') { res.status(403).json({ error: 'Admin only' }); return; }
    (req as HrRequest).hrPayload = payload;
    (req as HrRequest).accessibleStoreIds = null;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function getAccess(req: Request): { userId: string; storeIds: string[] | null } {
  const hrReq = req as HrRequest;
  return { userId: hrReq.hrPayload.userId, storeIds: hrReq.accessibleStoreIds };
}

// Store-manager middleware (re-declared here to keep hr-routes independent)
interface StorePayload { staffId: string; storeId: string; role: string }

function storeManagerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as StorePayload;
    if (payload.role !== 'MANAGER') { res.status(403).json({ error: 'Manager only' }); return; }
    (req as Request & { storePayload: StorePayload }).storePayload = payload;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function generateLetterNumber(prefix: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}-${rand}`;
}

function formatSalary(paise: number | null | undefined): string {
  if (!paise) return 'As discussed';
  return `₹${(paise / 100).toLocaleString('en-IN')} per month`;
}

function formatShift(shift: WorkShift, start?: string | null, end?: string | null): string {
  const names: Record<WorkShift, string> = {
    MORNING: 'Morning Shift', AFTERNOON: 'Afternoon Shift', EVENING: 'Evening Shift',
    NIGHT: 'Night Shift', FULL_DAY: 'Full Day', CUSTOM: 'Custom Hours'
  };
  const label = names[shift] ?? shift;
  if (start && end) return `${label} (${start} – ${end})`;
  return label;
}

// ─── HR User Auth ─────────────────────────────────────────────────────────────

// POST /hr/auth/login
hrRouter.post(
  '/auth/login',
  asyncRoute(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }

    const bcrypt = await import('bcryptjs');
    const user = await prisma.user.findUnique({
      where: { email },
      include: { hrProfile: true }
    });

    if (!user || user.role !== 'HR') { res.status(401).json({ error: 'Invalid credentials' }); return; }
    if (!user.isActive) { res.status(401).json({ error: 'Account deactivated' }); return; }
    if (!user.passwordHash) { res.status(401).json({ error: 'Password not set' }); return; }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) { res.status(401).json({ error: 'Invalid credentials' }); return; }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        hrProfile: user.hrProfile
      }
    });
  })
);

// GET /hr/auth/me
hrRouter.get(
  '/auth/me',
  hrAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { userId } = (req as Request & { hrPayload: AuthPayload }).hrPayload;
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { hrProfile: true }
    });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, hrProfile: user.hrProfile } });
  })
);

// ─── HR Dashboard ─────────────────────────────────────────────────────────────

hrRouter.get(
  '/dashboard',
  hrAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeIds } = getAccess(req);
    // storeIds = null means admin (all stores); [] means HR with no stores assigned yet
    const staffWhere = storeIds ? { storeId: { in: storeIds } } : {};
    const doctorWhere = storeIds
      ? { OR: [ { isOnline: true }, { clinicStoreId: { in: storeIds } } ] }
      : {};
    const leaveWhere = storeIds
      ? {
          OR: [
            { employeeType: 'DOCTOR' as const, doctor: { OR: [{ isOnline: true }, { clinicStoreId: { in: storeIds } }] } },
            { employeeType: 'STORE_STAFF' as const, storeStaff: { storeId: { in: storeIds } } }
          ]
        }
      : {};

    const [totalDoctors, activeDoctors, totalStoreStaff, activeStoreStaff, pendingLeaves, recentJoins, leaveStats] = await Promise.all([
      prisma.doctor.count({ where: doctorWhere }),
      prisma.doctor.count({ where: { ...doctorWhere, employeeStatus: 'ACTIVE' } }),
      prisma.storeStaff.count({ where: staffWhere }),
      prisma.storeStaff.count({ where: { ...staffWhere, employeeStatus: 'ACTIVE' } }),
      prisma.leaveRequest.count({ where: { ...leaveWhere, status: 'PENDING' } }),
      prisma.doctor.findMany({
        where: { ...doctorWhere, joiningDate: { not: null } },
        orderBy: { joiningDate: 'desc' },
        take: 5,
        include: { user: { select: { name: true } } }
      }),
      prisma.leaveRequest.groupBy({ by: ['status'], where: leaveWhere, _count: { id: true } })
    ]);

    const leaveByStatus = Object.fromEntries(leaveStats.map(s => [s.status, s._count.id]));
    const accessibleStores = storeIds
      ? await prisma.store.findMany({ where: { id: { in: storeIds } }, select: { id: true, name: true, code: true } })
      : await prisma.store.findMany({ select: { id: true, name: true, code: true } });

    res.json({
      totalDoctors, activeDoctors, totalStoreStaff, activeStoreStaff,
      totalEmployees: totalDoctors + totalStoreStaff,
      pendingLeaves, leaveStats: leaveByStatus,
      accessibleStores,
      recentJoins: recentJoins.map(d => ({ id: d.id, name: d.user.name, designation: d.designation, joiningDate: d.joiningDate }))
    });
  })
);

// ─── Employee Directory ────────────────────────────────────────────────────────

hrRouter.get(
  '/employees',
  hrAuthMiddleware,
  asyncRoute(async (req, res) => {
    const { storeIds } = getAccess(req);
    const q = (req.query['q'] as string) ?? '';
    const type = (req.query['type'] as string) ?? 'ALL';
    const status = (req.query['status'] as string) ?? 'ALL';

    const results: unknown[] = [];

    if (type === 'ALL' || type === 'DOCTOR') {
      // Online doctors are visible to all HR; location-based only if clinic store is accessible
      const docStoreFilter = storeIds
        ? { OR: [{ isOnline: true }, { clinicStoreId: { in: storeIds } }] }
        : {};
      const doctors = await prisma.doctor.findMany({
        where: {
          ...docStoreFilter,
          employeeStatus: status !== 'ALL' ? (status as EmployeeStatus) : undefined,
          user: q ? { name: { contains: q, mode: 'insensitive' } } : undefined
        },
        include: {
          user: { select: { id: true, name: true, email: true, mobile: true } },
          clinicStore: { select: { id: true, name: true, address: true } },
          joiningLetter: { select: { id: true, letterNumber: true, issuedDate: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      results.push(...doctors.map(d => ({
        id: d.id, empType: 'DOCTOR', name: d.user.name, email: d.user.email,
        phone: d.phone ?? d.user.mobile, designation: d.designation ?? 'Doctor',
        department: d.department ?? d.specialty, specialty: d.specialty,
        joiningDate: d.joiningDate, employeeStatus: d.employeeStatus,
        workShift: d.workShift, shiftStart: d.shiftStart, shiftEnd: d.shiftEnd,
        weeklyOffDays: d.weeklyOffDays, employeeId: d.employeeId,
        hasLetter: !!d.joiningLetter,
        isOnline: d.isOnline,
        clinicStore: d.clinicStore
      })));
    }

    if (type === 'ALL' || type === 'STORE_STAFF') {
      const staff = await prisma.storeStaff.findMany({
        where: {
          storeId: storeIds ? { in: storeIds } : undefined,
          employeeStatus: status !== 'ALL' ? (status as EmployeeStatus) : undefined,
          name: q ? { contains: q, mode: 'insensitive' } : undefined
        },
        include: {
          store: { select: { name: true } },
          joiningLetter: { select: { id: true, letterNumber: true, issuedDate: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      results.push(...staff.map(s => ({
        id: s.id, empType: 'STORE_STAFF', name: s.name, email: s.email,
        phone: s.phone, designation: s.designation ?? s.role,
        department: s.department ?? s.store.name, storeName: s.store.name,
        joiningDate: s.joiningDate, employeeStatus: s.employeeStatus,
        workShift: s.workShift, shiftStart: s.shiftStart, shiftEnd: s.shiftEnd,
        weeklyOffDays: s.weeklyOffDays, employeeId: s.employeeId ?? s.staffCode,
        hasLetter: !!s.joiningLetter
      })));
    }

    res.json({ employees: results, total: results.length });
  })
);

// ─── Doctor HR (accessible to HR + Admin) ────────────────────────────────────

hrRouter.get('/doctors', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { storeIds } = getAccess(req);
  const docWhere = storeIds
    ? { OR: [{ isOnline: true }, { clinicStoreId: { in: storeIds } }] }
    : {};
  const doctors = await prisma.doctor.findMany({
    where: docWhere,
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true } },
      clinicStore: { select: { id: true, name: true, address: true } },
      joiningLetter: true
    },
    orderBy: { joiningDate: 'asc' }
  });
  res.json({ doctors });
}));

hrRouter.get('/doctors/:id', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const doctor = await prisma.doctor.findUniqueOrThrow({
    where: { id: req.params['id'] as string },
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true } },
      joiningLetter: true,
      leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 }
    }
  });
  res.json({ doctor });
}));

hrRouter.put('/doctors/:id', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const id = req.params['id'] as string;
  const {
    designation, department, phone, address, joiningDate, probationEndDate,
    salaryPerMonth, consultationFee, workShift, shiftStart, shiftEnd,
    weeklyOffDays, emergencyContact, emergencyPhone, employeeStatus, employeeId
  } = req.body as Record<string, unknown>;

  const updated = await prisma.doctor.update({
    where: { id },
    data: {
      designation: designation as string | undefined,
      department: department as string | undefined,
      phone: phone as string | undefined,
      address: address as string | undefined,
      joiningDate: joiningDate ? new Date(joiningDate as string) : undefined,
      probationEndDate: probationEndDate ? new Date(probationEndDate as string) : undefined,
      salaryPerMonth: salaryPerMonth as number | undefined,
      consultationFee: consultationFee as number | undefined,
      workShift: workShift as WorkShift | undefined,
      shiftStart: shiftStart as string | undefined,
      shiftEnd: shiftEnd as string | undefined,
      weeklyOffDays: weeklyOffDays as string[] | undefined,
      emergencyContact: emergencyContact as string | undefined,
      emergencyPhone: emergencyPhone as string | undefined,
      employeeStatus: employeeStatus as EmployeeStatus | undefined,
      employeeId: employeeId as string | undefined
    },
    include: { user: { select: { id: true, name: true, email: true } } }
  });
  res.json({ doctor: updated });
}));

hrRouter.post('/doctors/:id/letter', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const id = req.params['id'] as string;
  const { clinicName, clinicAddress } = req.body as { clinicName?: string; clinicAddress?: string };

  const doctor = await prisma.doctor.findUniqueOrThrow({ where: { id }, include: { user: true } });

  const letterNumber = generateLetterNumber('JL-DOC');
  const issuedDate = new Date();

  const content = {
    letterNumber, issuedDate: issuedDate.toISOString(),
    organizationName: clinicName ?? 'Betelgeuse Homeopathic Clinic',
    organizationAddress: clinicAddress ?? '',
    employeeName: doctor.user.name, employeeEmail: doctor.user.email ?? '',
    employeeCode: doctor.employeeId ?? `DOC-${doctor.id.slice(0, 6).toUpperCase()}`,
    designation: doctor.designation ?? 'Doctor',
    department: doctor.department ?? doctor.specialty,
    specialty: doctor.specialty, registrationNo: doctor.registrationNo ?? 'N/A',
    joiningDate: doctor.joiningDate ? doctor.joiningDate.toISOString() : issuedDate.toISOString(),
    probationEndDate: doctor.probationEndDate?.toISOString() ?? null,
    salary: formatSalary(doctor.salaryPerMonth),
    consultationFee: doctor.consultationFee ? `₹${(doctor.consultationFee / 100).toFixed(0)}` : 'As per schedule',
    shift: formatShift(doctor.workShift, doctor.shiftStart, doctor.shiftEnd),
    weeklyOff: (doctor.weeklyOffDays ?? []).join(', ') || 'Sunday',
    phone: doctor.phone ?? doctor.user.mobile ?? '',
    address: doctor.address ?? '',
  };

  const letter = await prisma.joiningLetter.upsert({
    where: { doctorUserId: id },
    create: { letterNumber, issuedDate, content, doctorUserId: id },
    update: { letterNumber, issuedDate, content }
  });
  res.json({ letter });
}));

hrRouter.get('/doctors/:id/letter', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const letter = await prisma.joiningLetter.findUnique({ where: { doctorUserId: req.params['id'] as string } });
  if (!letter) { res.status(404).json({ error: 'Letter not yet generated' }); return; }
  res.json({ letter });
}));

// ─── Store Staff HR (accessible to HR + store manager) ────────────────────────

hrRouter.get('/store/staff', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { storeIds } = getAccess(req);
  const staff = await prisma.storeStaff.findMany({
    where: storeIds ? { storeId: { in: storeIds } } : {},
    include: { joiningLetter: true, store: { select: { id: true, name: true } } },
    orderBy: { joiningDate: 'asc' }
  });
  res.json({ staff });
}));

hrRouter.get('/store/staff/:id', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const staff = await prisma.storeStaff.findUniqueOrThrow({
    where: { id: req.params['id'] as string },
    include: {
      joiningLetter: true, store: true,
      leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 }
    }
  });
  res.json({ staff });
}));

hrRouter.put('/store/staff/:id', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const id = req.params['id'] as string;
  const {
    designation, department, phone, email, address, joiningDate, probationEndDate,
    salaryPerMonth, workShift, shiftStart, shiftEnd, weeklyOffDays,
    emergencyContact, emergencyPhone, employeeStatus, employeeId
  } = req.body as Record<string, unknown>;

  const updated = await prisma.storeStaff.update({
    where: { id },
    data: {
      designation: designation as string | undefined,
      department: department as string | undefined,
      phone: phone as string | undefined,
      email: email as string | undefined,
      address: address as string | undefined,
      joiningDate: joiningDate ? new Date(joiningDate as string) : undefined,
      probationEndDate: probationEndDate ? new Date(probationEndDate as string) : undefined,
      salaryPerMonth: salaryPerMonth as number | undefined,
      workShift: workShift as WorkShift | undefined,
      shiftStart: shiftStart as string | undefined,
      shiftEnd: shiftEnd as string | undefined,
      weeklyOffDays: (weeklyOffDays as string[] | undefined) ?? [],
      emergencyContact: emergencyContact as string | undefined,
      emergencyPhone: emergencyPhone as string | undefined,
      employeeStatus: employeeStatus as EmployeeStatus | undefined,
      employeeId: employeeId as string | undefined
    }
  });
  res.json({ staff: updated });
}));

hrRouter.post('/store/staff/:id/letter', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const id = req.params['id'] as string;
  const staff = await prisma.storeStaff.findUniqueOrThrow({ where: { id }, include: { store: true } });

  const letterNumber = generateLetterNumber('JL-STORE');
  const issuedDate = new Date();

  const content = {
    letterNumber, issuedDate: issuedDate.toISOString(),
    storeName: staff.store.name, storeAddress: staff.store.address ?? '',
    storePhone: staff.store.phone ?? '',
    employeeName: staff.name,
    employeeCode: staff.employeeId ?? staff.staffCode,
    designation: staff.designation ?? staff.role,
    department: staff.department ?? 'Store Operations',
    joiningDate: staff.joiningDate ? staff.joiningDate.toISOString() : issuedDate.toISOString(),
    probationEndDate: staff.probationEndDate?.toISOString() ?? null,
    salary: formatSalary(staff.salaryPerMonth),
    shift: formatShift(staff.workShift, staff.shiftStart, staff.shiftEnd),
    weeklyOff: (staff.weeklyOffDays ?? []).join(', ') || 'Sunday',
    phone: staff.phone ?? '', address: staff.address ?? '',
  };

  const letter = await prisma.joiningLetter.upsert({
    where: { staffId: id },
    create: { letterNumber, issuedDate, content, staffId: id },
    update: { letterNumber, issuedDate, content }
  });
  res.json({ letter });
}));

hrRouter.get('/store/staff/:id/letter', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const letter = await prisma.joiningLetter.findUnique({ where: { staffId: req.params['id'] as string } });
  if (!letter) { res.status(404).json({ error: 'Letter not yet generated' }); return; }
  res.json({ letter });
}));

// ─── Leave Management ─────────────────────────────────────────────────────────

// GET /hr/leaves?status=PENDING&type=ALL&empType=ALL
hrRouter.get('/leaves', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const status = (req.query['status'] as string) ?? 'ALL';
  const empType = (req.query['empType'] as string) ?? 'ALL';
  const page = parseInt(req.query['page'] as string) || 1;
  const pageSize = parseInt(req.query['pageSize'] as string) || 20;

  const where = {
    status: status !== 'ALL' ? (status as LeaveStatus) : undefined,
    employeeType: empType !== 'ALL' ? (empType as EmployeeType) : undefined
  };

  const [leaves, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: {
        doctor: { include: { user: { select: { name: true } } } },
        storeStaff: { select: { name: true, staffCode: true, store: { select: { name: true } } } },
        approvedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.leaveRequest.count({ where })
  ]);

  res.json({ leaves, total, page, pageSize });
}));

// GET /hr/leaves/:id
hrRouter.get('/leaves/:id', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const leave = await prisma.leaveRequest.findUniqueOrThrow({
    where: { id: req.params['id'] as string },
    include: {
      doctor: { include: { user: { select: { name: true, email: true } } } },
      storeStaff: { select: { name: true, staffCode: true, store: { select: { name: true } } } },
      approvedBy: { select: { name: true } }
    }
  });
  res.json({ leave });
}));

// POST /hr/leaves  — HR can manually add a leave record
hrRouter.post('/leaves', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const {
    employeeType, doctorId, storeStaffId, type, startDate, endDate, reason
  } = req.body as {
    employeeType: EmployeeType; doctorId?: string; storeStaffId?: string;
    type: LeaveType; startDate: string; endDate: string; reason: string;
  };

  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const leave = await prisma.leaveRequest.create({
    data: { employeeType, doctorId, storeStaffId, type, startDate: start, endDate: end, totalDays, reason }
  });
  res.status(201).json({ leave });
}));

// PATCH /hr/leaves/:id — approve or reject
hrRouter.patch('/leaves/:id', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const id = req.params['id'] as string;
  const { status, hrNote } = req.body as { status: LeaveStatus; hrNote?: string };
  const { userId } = (req as Request & { hrPayload: AuthPayload }).hrPayload;

  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status,
      hrNote,
      approvedById: (status === 'APPROVED' || status === 'REJECTED') ? userId : undefined
    }
  });

  // Update employeeStatus if on leave / returning
  if (status === 'APPROVED') {
    if (leave.employeeType === 'DOCTOR' && leave.doctorId) {
      await prisma.doctor.update({ where: { id: leave.doctorId }, data: { employeeStatus: 'ON_LEAVE' } });
    } else if (leave.employeeType === 'STORE_STAFF' && leave.storeStaffId) {
      await prisma.storeStaff.update({ where: { id: leave.storeStaffId }, data: { employeeStatus: 'ON_LEAVE' } });
    }
  }

  res.json({ leave });
}));

// ─── Store & Manager Management (HR can create/manage) ───────────────────────

// GET /hr/stores — list only accessible stores
hrRouter.get('/stores', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { storeIds } = getAccess(req);
  const stores = await prisma.store.findMany({
    where: storeIds ? { id: { in: storeIds } } : {},
    include: {
      _count: { select: { staff: true } },
      staff: { where: { role: 'MANAGER' }, select: { id: true, name: true, email: true, isActive: true, employeeStatus: true } },
      hrAccess: { include: { hrUser: { select: { id: true, name: true, email: true } } } }
    },
    orderBy: { createdAt: 'asc' }
  });
  res.json({ stores });
}));

// POST /hr/stores — HR creates a new store
hrRouter.post('/stores', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { name, code, address, phone } = req.body as {
    name: string; code: string; address?: string; phone?: string;
  };
  if (!name || !code) { res.status(400).json({ error: 'name and code are required' }); return; }

  const existing = await prisma.store.findUnique({ where: { code: code.toUpperCase() } });
  if (existing) { res.status(409).json({ error: 'Store code already exists' }); return; }

  const store = await prisma.store.create({
    data: { name, code: code.toUpperCase(), address, phone }
  });
  res.status(201).json({ store });
}));

// POST /hr/stores/:storeId/managers — HR creates a store manager
hrRouter.post('/stores/:storeId/managers', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const storeId = req.params['storeId'] as string;
  const { name, email, password, designation, joiningDate } = req.body as {
    name: string; email: string; password: string; designation?: string; joiningDate?: string;
  };
  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' }); return;
  }

  await prisma.store.findUniqueOrThrow({ where: { id: storeId } });

  const bcrypt = await import('bcryptjs');
  const pinHash = await bcrypt.hash(password, 10);

  // Generate unique staff code
  const count = await prisma.storeStaff.count({ where: { storeId } });
  const staffCode = `MGR-${String(count + 1).padStart(3, '0')}`;

  const manager = await prisma.storeStaff.create({
    data: {
      name,
      staffCode,
      email,
      pinHash,
      role: 'MANAGER',
      storeId,
      designation: designation ?? 'Store Manager',
      department: 'Store Management',
      joiningDate: joiningDate ? new Date(joiningDate) : undefined
    },
    include: { store: { select: { name: true } } }
  });

  res.status(201).json({
    staff: {
      id: manager.id,
      name: manager.name,
      staffCode: manager.staffCode,
      email: manager.email,
      role: manager.role,
      storeName: manager.store.name
    }
  });
}));

// POST /hr/stores/:storeId/staff — HR creates a regular store staff member
hrRouter.post('/stores/:storeId/staff', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const storeId = req.params['storeId'] as string;
  const { name, staffCode, pin, designation, phone, joiningDate } = req.body as {
    name: string; staffCode: string; pin: string;
    designation?: string; phone?: string; joiningDate?: string;
  };
  if (!name || !staffCode || !pin) {
    res.status(400).json({ error: 'name, staffCode, and pin are required' }); return;
  }
  if (pin.length < 4) { res.status(400).json({ error: 'PIN must be at least 4 digits' }); return; }

  await prisma.store.findUniqueOrThrow({ where: { id: storeId } });

  const existing = await prisma.storeStaff.findUnique({ where: { staffCode: staffCode.toUpperCase() } });
  if (existing) { res.status(409).json({ error: 'Staff code already taken' }); return; }

  const bcrypt = await import('bcryptjs');
  const pinHash = await bcrypt.hash(pin, 10);

  const staff = await prisma.storeStaff.create({
    data: {
      name,
      staffCode: staffCode.toUpperCase(),
      pinHash,
      phone,
      designation: designation ?? 'Store Staff',
      department: 'Store Operations',
      role: 'STAFF',
      storeId,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined
    },
    include: { store: { select: { name: true } } }
  });

  res.status(201).json({
    staff: {
      id: staff.id,
      name: staff.name,
      staffCode: staff.staffCode,
      role: staff.role,
      storeName: staff.store.name
    }
  });
}));

// PATCH /hr/store/staff/:id/status — HR can activate/deactivate staff
hrRouter.patch('/store/staff/:id/status', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { isActive, employeeStatus } = req.body as { isActive?: boolean; employeeStatus?: EmployeeStatus };
  const staff = await prisma.storeStaff.update({
    where: { id: req.params['id'] as string },
    data: { isActive, employeeStatus }
  });
  res.json({ staff: { id: staff.id, name: staff.name, isActive: staff.isActive, employeeStatus: staff.employeeStatus } });
}));

// ─── HR User Management (Admin only) ─────────────────────────────────────────

// POST /hr/users  — super admin creates an HR user
hrRouter.post('/users', adminOnly, asyncRoute(async (req, res) => {
  const { name, email, password, designation, department } = req.body as {
    name: string; email: string; password: string; designation?: string; department?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' }); return;
  }

  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) { res.status(409).json({ error: 'Email already in use' }); return; }

  const user = await prisma.user.create({
    data: {
      name, email, passwordHash, role: 'HR',
      hrProfile: { create: { designation: designation ?? 'HR Manager', department: department ?? 'Human Resources' } }
    },
    include: { hrProfile: true }
  });

  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, hrProfile: user.hrProfile }
  });
}));

// GET /hr/users  — list all HR users
hrRouter.get('/users', adminOnly, asyncRoute(async (_req, res) => {
  const hrUsers = await prisma.user.findMany({
    where: { role: 'HR' },
    include: { hrProfile: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json({ hrUsers });
}));

// PATCH /hr/users/:id/status — activate/deactivate HR user
hrRouter.patch('/users/:id/status', adminOnly, asyncRoute(async (req, res) => {
  const { isActive } = req.body as { isActive: boolean };
  const user = await prisma.user.update({
    where: { id: req.params['id'] as string },
    data: { isActive }
  });
  res.json({ user: { id: user.id, name: user.name, isActive: user.isActive } });
}));

// GET /hr/users/:id/stores — list stores this HR user can access
hrRouter.get('/users/:id/stores', adminOnly, asyncRoute(async (req, res) => {
  const hrUserId = req.params['id'] as string;
  const accesses = await prisma.hrStoreAccess.findMany({
    where: { hrUserId },
    include: { store: { select: { id: true, name: true, code: true, address: true } } }
  });
  const allStores = await prisma.store.findMany({ select: { id: true, name: true, code: true, address: true } });
  res.json({ assigned: accesses.map(a => a.store), all: allStores });
}));

// POST /hr/users/:id/stores — grant HR user access to a store
hrRouter.post('/users/:id/stores', adminOnly, asyncRoute(async (req, res) => {
  const hrUserId = req.params['id'] as string;
  const { storeId } = req.body as { storeId: string };
  const { userId } = (req as HrRequest).hrPayload;

  await prisma.user.findUniqueOrThrow({ where: { id: hrUserId, role: 'HR' } });
  await prisma.store.findUniqueOrThrow({ where: { id: storeId } });

  const access = await prisma.hrStoreAccess.upsert({
    where: { hrUserId_storeId: { hrUserId, storeId } },
    create: { hrUserId, storeId, grantedById: userId },
    update: {}
  });
  res.status(201).json({ access });
}));

// DELETE /hr/users/:id/stores/:storeId — revoke HR user access to a store
hrRouter.delete('/users/:id/stores/:storeId', adminOnly, asyncRoute(async (req, res) => {
  const hrUserId = req.params['id'] as string;
  const storeId = req.params['storeId'] as string;
  await prisma.hrStoreAccess.deleteMany({ where: { hrUserId, storeId } });
  res.json({ ok: true });
}));

// POST /hr/users/:id/stores/all — grant access to ALL stores (bulk)
hrRouter.post('/users/:id/stores/all', adminOnly, asyncRoute(async (req, res) => {
  const hrUserId = req.params['id'] as string;
  const { userId } = (req as HrRequest).hrPayload;
  const stores = await prisma.store.findMany({ select: { id: true } });
  await prisma.hrStoreAccess.createMany({
    data: stores.map(s => ({ hrUserId, storeId: s.id, grantedById: userId })),
    skipDuplicates: true
  });
  res.json({ granted: stores.length });
}));

// ─── Doctor isOnline / clinicStore assignment ─────────────────────────────────

// PUT /hr/doctors/:id/assignment — HR or Admin sets doctor online/offline + clinic store
hrRouter.put('/doctors/:id/assignment', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { storeIds } = getAccess(req);
  const id = req.params['id'] as string;
  const { isOnline, clinicStoreId } = req.body as { isOnline?: boolean; clinicStoreId?: string | null };

  // HR can only assign to stores they have access to
  if (clinicStoreId && storeIds && !storeIds.includes(clinicStoreId)) {
    res.status(403).json({ error: 'You do not have access to that store' }); return;
  }

  const doctor = await prisma.doctor.update({
    where: { id },
    data: {
      isOnline: isOnline ?? undefined,
      clinicStoreId: isOnline ? null : (clinicStoreId ?? undefined)
    },
    include: { clinicStore: { select: { id: true, name: true, address: true } } }
  });
  res.json({ doctor });
}));

// ─── Payroll Summary ──────────────────────────────────────────────────────────

// GET /hr/payroll?month=YYYY-MM — monthly payroll summary
hrRouter.get('/payroll', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { storeIds } = getAccess(req);
  const monthStr = (req.query['month'] as string) ?? new Date().toISOString().slice(0, 7);
  const [year, month] = monthStr.split('-').map(Number);

  // Doctors
  const doctorWhere = storeIds ? { clinicStoreId: { in: storeIds } } : {};
  const doctors = await prisma.doctor.findMany({
    where: { ...doctorWhere, employeeStatus: { not: 'TERMINATED' } },
    select: {
      id: true, designation: true, department: true,
      salaryPerMonth: true, employeeStatus: true,
      user: { select: { name: true } }
    }
  });

  // Store Staff
  const staffWhere = storeIds ? { storeId: { in: storeIds } } : {};
  const storeStaff = await prisma.storeStaff.findMany({
    where: { ...staffWhere, employeeStatus: { not: 'TERMINATED' } },
    select: {
      id: true, name: true, designation: true, department: true,
      salaryPerMonth: true, employeeStatus: true,
      store: { select: { name: true } }
    }
  });

  // Leave deductions: ON_LEAVE staff get 0 in that month (simple approach)
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0);

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: monthEnd },
      endDate:   { gte: monthStart }
    },
    select: { doctorId: true, storeStaffId: true, startDate: true, endDate: true, totalDays: true }
  });

  const leaveDaysMap = new Map<string, number>();
  const daysInMonth = monthEnd.getDate();
  for (const l of approvedLeaves) {
    const overlapStart = l.startDate < monthStart ? monthStart : l.startDate;
    const overlapEnd   = l.endDate   > monthEnd   ? monthEnd   : l.endDate;
    const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const empId = l.doctorId ?? l.storeStaffId ?? '';
    leaveDaysMap.set(empId, (leaveDaysMap.get(empId) ?? 0) + days);
  }

  const calcNet = (salaryPaise: number | null, leaveDays: number): number => {
    if (!salaryPaise) return 0;
    const dailyRate = salaryPaise / daysInMonth;
    return Math.round(salaryPaise - dailyRate * leaveDays);
  };

  const doctorRows = doctors.map(d => ({
    id: d.id, empType: 'DOCTOR', name: d.user?.name ?? '—',
    designation: d.designation, department: d.department,
    grossPaise: d.salaryPerMonth ?? 0,
    leaveDays: leaveDaysMap.get(d.id) ?? 0,
    netPaise: calcNet(d.salaryPerMonth, leaveDaysMap.get(d.id) ?? 0),
    employeeStatus: d.employeeStatus
  }));

  const staffRows = storeStaff.map(s => ({
    id: s.id, empType: 'STORE_STAFF', name: s.name,
    designation: s.designation, department: s.department ?? s.store?.name,
    grossPaise: s.salaryPerMonth ?? 0,
    leaveDays: leaveDaysMap.get(s.id) ?? 0,
    netPaise: calcNet(s.salaryPerMonth, leaveDaysMap.get(s.id) ?? 0),
    employeeStatus: s.employeeStatus
  }));

  const rows = [...doctorRows, ...staffRows];
  const totalGross = rows.reduce((a, r) => a + r.grossPaise, 0);
  const totalNet   = rows.reduce((a, r) => a + r.netPaise, 0);
  const totalLeave = rows.reduce((a, r) => a + r.leaveDays, 0);

  res.json({ month: monthStr, rows, summary: { totalGross, totalNet, totalLeave, headcount: rows.length } });
}));

// ─── Self-Service Leave Requests ─────────────────────────────────────────────
// Doctors and store staff submit their own leave requests (status = PENDING)

// POST /hr/self/doctor-leave — authenticated doctor submits leave
hrRouter.post('/self/doctor-leave', asyncRoute(async (req, res) => {
  const authHeader = req.header('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }

  let userId: string;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    userId = decoded.userId;
  } catch { res.status(401).json({ error: 'Invalid token' }); return; }

  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  if (!doctor) { res.status(403).json({ error: 'Doctor record not found' }); return; }

  const { type, startDate, endDate, reason } = req.body as {
    type: LeaveType; startDate: string; endDate: string; reason?: string;
  };
  if (!type || !startDate || !endDate) { res.status(400).json({ error: 'type, startDate, endDate are required' }); return; }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    res.status(400).json({ error: 'Invalid date range' }); return;
  }
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const leave = await prisma.leaveRequest.create({
    data: { employeeType: 'DOCTOR', doctorId: doctor.id, type, startDate: start, endDate: end, totalDays, reason: reason ?? '' }
  });
  res.status(201).json({ leave });
}));

// POST /hr/self/staff-leave — store staff submits own leave
hrRouter.post('/self/staff-leave', asyncRoute(async (req, res) => {
  const { staffCode, storeCode, type, startDate, endDate, reason } = req.body as {
    staffCode: string; storeCode: string; type: LeaveType;
    startDate: string; endDate: string; reason?: string;
  };
  if (!staffCode || !storeCode || !type || !startDate || !endDate) {
    res.status(400).json({ error: 'staffCode, storeCode, type, startDate, endDate are required' }); return;
  }

  const store = await prisma.store.findUnique({ where: { code: storeCode }, select: { id: true } });
  if (!store) { res.status(404).json({ error: 'Store not found' }); return; }

  const staff = await prisma.storeStaff.findFirst({ where: { staffCode, storeId: store.id, isActive: true } });
  if (!staff) { res.status(404).json({ error: 'Staff not found' }); return; }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    res.status(400).json({ error: 'Invalid date range' }); return;
  }
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const leave = await prisma.leaveRequest.create({
    data: { employeeType: 'STORE_STAFF', storeStaffId: staff.id, type, startDate: start, endDate: end, totalDays, reason: reason ?? '' }
  });
  res.status(201).json({ leave });
}));

// GET /hr/self/doctor-leaves — doctor views their own leaves
hrRouter.get('/self/doctor-leaves', asyncRoute(async (req, res) => {
  const authHeader = req.header('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }

  let userId: string;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    userId = decoded.userId;
  } catch { res.status(401).json({ error: 'Invalid token' }); return; }

  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  if (!doctor) { res.status(403).json({ error: 'Doctor record not found' }); return; }

  const leaves = await prisma.leaveRequest.findMany({
    where: { doctorId: doctor.id },
    orderBy: { createdAt: 'desc' },
    include: { approvedBy: { select: { name: true } } }
  });
  res.json({ leaves });
}));

export { hrRouter };
