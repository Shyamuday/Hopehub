import { Router } from 'express';
import { EmployeeStatus, WorkShift } from '@prisma/client';
import { HR_API_ROUTES } from '../../constants/hr-api-routes.constants.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../utils/helpers.js';
import { formatSalary, formatShift, generateLetterNumber, getAccess, hrAuthMiddleware } from './shared.js';

export function registerHrStoreStaffRoutes(router: Router) {
// ─── Store Staff HR (accessible to HR + store manager) ────────────────────────

router.get(HR_API_ROUTES.STORE_STAFF, hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { storeIds } = getAccess(req);
  const staff = await prisma.storeStaff.findMany({
    where: storeIds ? { storeId: { in: storeIds } } : {},
    include: { joiningLetter: true, store: { select: { id: true, name: true } } },
    orderBy: { joiningDate: 'asc' }
  });
  res.json({ staff });
}));

router.get(HR_API_ROUTES.STORE_STAFF_BY_ID, hrAuthMiddleware, asyncRoute(async (req, res) => {
  const staff = await prisma.storeStaff.findUniqueOrThrow({
    where: { id: req.params['id'] as string },
    include: {
      joiningLetter: true, store: true,
      leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 }
    }
  });
  res.json({ staff });
}));

router.put('/store/staff/:id', hrAuthMiddleware, asyncRoute(async (req, res) => {
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

router.post('/store/staff/:id/letter', hrAuthMiddleware, asyncRoute(async (req, res) => {
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

router.get('/store/staff/:id/letter', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const letter = await prisma.joiningLetter.findUnique({ where: { staffId: req.params['id'] as string } });
  if (!letter) { res.status(404).json({ error: 'Letter not yet generated' }); return; }
  res.json({ letter });
}));
}
