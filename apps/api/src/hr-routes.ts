import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, WorkShift, EmployeeStatus, LeaveStatus, LeaveType, EmployeeType } from '@prisma/client';

const hrRouter = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function asyncRoute(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}

interface AuthPayload { userId: string; role: string }

/** Accepts both ADMIN and HR roles */
function hrAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload;
    if (payload.role !== 'ADMIN' && payload.role !== 'HR') {
      res.status(403).json({ error: 'HR or Admin access required' }); return;
    }
    (req as Request & { hrPayload: AuthPayload }).hrPayload = payload;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

/** Admin-only (for creating HR users) */
function adminOnly(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload;
    if (payload.role !== 'ADMIN') { res.status(403).json({ error: 'Admin only' }); return; }
    (req as Request & { hrPayload: AuthPayload }).hrPayload = payload;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
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
  asyncRoute(async (_req, res) => {
    const [
      totalDoctors,
      activeDoctors,
      totalStoreStaff,
      activeStoreStaff,
      pendingLeaves,
      recentJoins,
      leaveStats
    ] = await Promise.all([
      prisma.doctor.count(),
      prisma.doctor.count({ where: { employeeStatus: 'ACTIVE' } }),
      prisma.storeStaff.count(),
      prisma.storeStaff.count({ where: { employeeStatus: 'ACTIVE' } }),
      prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      prisma.doctor.findMany({
        where: { joiningDate: { not: null } },
        orderBy: { joiningDate: 'desc' },
        take: 5,
        include: { user: { select: { name: true } } }
      }),
      prisma.leaveRequest.groupBy({
        by: ['status'],
        _count: { id: true }
      })
    ]);

    const leaveByStatus = Object.fromEntries(leaveStats.map(s => [s.status, s._count.id]));

    res.json({
      totalDoctors, activeDoctors,
      totalStoreStaff, activeStoreStaff,
      totalEmployees: totalDoctors + totalStoreStaff,
      pendingLeaves,
      leaveStats: leaveByStatus,
      recentJoins: recentJoins.map(d => ({
        id: d.id, name: d.user.name, designation: d.designation, joiningDate: d.joiningDate
      }))
    });
  })
);

// ─── Employee Directory ────────────────────────────────────────────────────────

hrRouter.get(
  '/employees',
  hrAuthMiddleware,
  asyncRoute(async (req, res) => {
    const q = (req.query['q'] as string) ?? '';
    const type = (req.query['type'] as string) ?? 'ALL';
    const status = (req.query['status'] as string) ?? 'ALL';

    const results: unknown[] = [];

    if (type === 'ALL' || type === 'DOCTOR') {
      const doctors = await prisma.doctor.findMany({
        where: {
          employeeStatus: status !== 'ALL' ? (status as EmployeeStatus) : undefined,
          user: q ? { name: { contains: q, mode: 'insensitive' } } : undefined
        },
        include: {
          user: { select: { id: true, name: true, email: true, mobile: true } },
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
        hasLetter: !!d.joiningLetter
      })));
    }

    if (type === 'ALL' || type === 'STORE_STAFF') {
      const staff = await prisma.storeStaff.findMany({
        where: {
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

hrRouter.get('/doctors', hrAuthMiddleware, asyncRoute(async (_req, res) => {
  const doctors = await prisma.doctor.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true } },
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

hrRouter.get('/store/staff', hrAuthMiddleware, asyncRoute(async (_req, res) => {
  const staff = await prisma.storeStaff.findMany({
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

export { hrRouter };
