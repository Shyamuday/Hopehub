import { Router } from 'express';
import { EmployeeStatus, HomeopathicDoctorType, HomeopathicSpecialtyFocus, WorkShift } from '@prisma/client';
import { HR_API_ROUTES } from '../../constants/hr-api-routes.constants.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../utils/helpers.js';
import { formatSalary, formatShift, generateLetterNumber, getAccess, hrAuthMiddleware } from './shared.js';
import { doctorTypeLabel } from '../../constants/homeopathic-doctor-types.js';

export function registerHrDoctorRoutes(router: Router) {
// ─── Doctor HR (accessible to HR + Admin) ────────────────────────────────────

router.get(HR_API_ROUTES.DOCTORS, hrAuthMiddleware, asyncRoute(async (req, res) => {
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

router.get(HR_API_ROUTES.DOCTOR_BY_ID, hrAuthMiddleware, asyncRoute(async (req, res) => {
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

router.put('/doctors/:id', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const id = req.params['id'] as string;
  const {
    designation, department, phone, address, joiningDate, probationEndDate,
    salaryPerMonth, consultationFee, workShift, shiftStart, shiftEnd,
    weeklyOffDays, emergencyContact, emergencyPhone, employeeStatus, employeeId,
    doctorType, specialtyFocus
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
      employeeId: employeeId as string | undefined,
      doctorType: doctorType as HomeopathicDoctorType | undefined,
      specialtyFocus: specialtyFocus as HomeopathicSpecialtyFocus | null | undefined
    },
    include: { user: { select: { id: true, name: true, email: true } } }
  });
  res.json({ doctor: updated });
}));

router.post(HR_API_ROUTES.DOCTOR_LETTER, hrAuthMiddleware, asyncRoute(async (req, res) => {
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
    designation: doctor.designation ?? doctorTypeLabel(doctor.doctorType),
    department: doctor.department ?? doctor.specialty,
    doctorType: doctorTypeLabel(doctor.doctorType),
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

router.get(HR_API_ROUTES.DOCTOR_LETTER, hrAuthMiddleware, asyncRoute(async (req, res) => {
  const letter = await prisma.joiningLetter.findUnique({ where: { doctorUserId: req.params['id'] as string } });
  if (!letter) { res.status(404).json({ error: 'Letter not yet generated' }); return; }
  res.json({ letter });
}));
// ─── Doctor isOnline / clinicStore assignment ─────────────────────────────────

// PUT /hr/doctors/:id/assignment — HR or Admin sets doctor online/offline + clinic store
router.put(HR_API_ROUTES.DOCTOR_ASSIGNMENT, hrAuthMiddleware, asyncRoute(async (req, res) => {
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
}
