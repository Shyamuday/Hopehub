import { Router } from 'express';
import { EmployeeStatus, HomeopathicDoctorType, HomeopathicSpecialtyFocus, WorkShift } from '@prisma/client';
import { HR_API_ROUTES } from '../../constants/hr-api-routes.constants.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../utils/helpers.js';
import { formatSalary, formatShift, generateLetterNumber, getAccess, hrAuthMiddleware } from './shared.js';
import {
  applyDoctorHrProfileFields,
  buildDoctorJoiningLetterContent,
  doctorHrDefaults,
  suggestedProbationEndDate
} from '../../constants/doctor-hr-defaults.js';
import { doctorTypeLabel } from '../../constants/homeopathic-doctor-types.js';

function mapDoctorForHr(d: {
  id: string;
  user: { id: string; name: string; email: string | null; mobile: string | null };
  clinicStore?: { id: string; name: string; address: string | null } | null;
  joiningLetter?: { id: string } | null;
  doctorType: HomeopathicDoctorType;
  specialtyFocus: HomeopathicSpecialtyFocus | null;
  specialty: string;
  designation: string | null;
  department: string | null;
  joiningDate: Date | null;
  probationEndDate: Date | null;
  employeeStatus: EmployeeStatus;
  workShift: WorkShift;
  shiftStart: string | null;
  shiftEnd: string | null;
  weeklyOffDays: string[];
  employeeId: string | null;
  phone: string | null;
  salaryPerMonth: number | null;
  consultationFee: number | null;
  isOnline: boolean;
}) {
  return {
    id: d.id,
    empType: 'DOCTOR' as const,
    name: d.user.name,
    email: d.user.email,
    phone: d.phone ?? d.user.mobile,
    doctorType: d.doctorType,
    doctorTypeLabel: doctorTypeLabel(d.doctorType),
    specialtyFocus: d.specialtyFocus,
    designation: d.designation ?? doctorTypeLabel(d.doctorType),
    department: d.department ?? d.specialty,
    specialty: d.specialty,
    joiningDate: d.joiningDate,
    probationEndDate: d.probationEndDate,
    employeeStatus: d.employeeStatus,
    workShift: d.workShift,
    shiftStart: d.shiftStart,
    shiftEnd: d.shiftEnd,
    weeklyOffDays: d.weeklyOffDays,
    employeeId: d.employeeId,
    salary: d.salaryPerMonth,
    consultationFee: d.consultationFee,
    hasLetter: !!d.joiningLetter,
    isOnline: d.isOnline,
    clinicStore: d.clinicStore,
    user: d.user
  };
}

export function registerHrDoctorRoutes(router: Router) {
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
      joiningLetter: { select: { id: true } }
    },
    orderBy: { joiningDate: 'asc' }
  });
  res.json({ doctors: doctors.map(mapDoctorForHr) });
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
  res.json({ doctor: mapDoctorForHr({ ...doctor, joiningLetter: doctor.joiningLetter }) });
}));

router.put('/doctors/:id', hrAuthMiddleware, asyncRoute(async (req, res) => {
  const id = req.params['id'] as string;
  const existing = await prisma.doctor.findUniqueOrThrow({ where: { id } });
  const {
    designation, department, phone, address, joiningDate, probationEndDate,
    salaryPerMonth, consultationFee, workShift, shiftStart, shiftEnd,
    weeklyOffDays, emergencyContact, emergencyPhone, employeeStatus, employeeId,
    doctorType, specialtyFocus, specialty
  } = req.body as Record<string, unknown>;

  const nextDoctorType = (doctorType as HomeopathicDoctorType | undefined) ?? existing.doctorType;
  const nextFocus =
    specialtyFocus === null
      ? null
      : ((specialtyFocus as HomeopathicSpecialtyFocus | undefined) ?? existing.specialtyFocus);

  const hrFields = applyDoctorHrProfileFields({
    doctorType: nextDoctorType,
    specialtyFocus: nextFocus,
    specialty: (specialty as string | undefined) ?? existing.specialty,
    designation: designation as string | undefined,
    department: department as string | undefined
  });

  const parsedJoiningDate = joiningDate
    ? new Date(joiningDate as string)
    : existing.joiningDate ?? undefined;

  const parsedProbation =
    probationEndDate === null
      ? null
      : probationEndDate
        ? new Date(probationEndDate as string)
        : parsedJoiningDate && !existing.probationEndDate
          ? suggestedProbationEndDate(parsedJoiningDate, nextDoctorType)
          : existing.probationEndDate;

  const updated = await prisma.doctor.update({
    where: { id },
    data: {
      ...hrFields,
      phone: phone as string | undefined,
      address: address as string | undefined,
      joiningDate: parsedJoiningDate,
      probationEndDate: parsedProbation,
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
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true } },
      joiningLetter: { select: { id: true } }
    }
  });
  res.json({ doctor: mapDoctorForHr(updated) });
}));

router.post(HR_API_ROUTES.DOCTOR_LETTER, hrAuthMiddleware, asyncRoute(async (req, res) => {
  const id = req.params['id'] as string;
  const { clinicName, clinicAddress } = req.body as { clinicName?: string; clinicAddress?: string };

  const doctor = await prisma.doctor.findUniqueOrThrow({ where: { id }, include: { user: true } });
  const hr = doctorHrDefaults(doctor.doctorType, doctor.specialtyFocus);

  const letterNumber = generateLetterNumber('JL-DOC');
  const issuedDate = new Date();
  const joiningDate = doctor.joiningDate ?? issuedDate;

  const content = buildDoctorJoiningLetterContent({
    letterNumber,
    issuedDate,
    organizationName: clinicName ?? 'Vitalis Homeopathic Clinic',
    organizationAddress: clinicAddress ?? '',
    employeeName: doctor.user.name,
    employeeEmail: doctor.user.email ?? '',
    employeeCode: doctor.employeeId ?? `DOC-${doctor.id.slice(0, 6).toUpperCase()}`,
    doctorType: doctor.doctorType,
    specialtyFocus: doctor.specialtyFocus,
    designation: doctor.designation ?? hr.designation,
    department: doctor.department ?? hr.department,
    specialty: doctor.specialty,
    registrationNo: doctor.registrationNo ?? 'N/A',
    joiningDate,
    probationEndDate: doctor.probationEndDate,
    salaryLabel: formatSalary(doctor.salaryPerMonth),
    consultationFeeLabel: doctor.consultationFee
      ? `₹${(doctor.consultationFee / 100).toFixed(0)}`
      : 'As per schedule',
    shiftLabel: formatShift(doctor.workShift, doctor.shiftStart, doctor.shiftEnd),
    weeklyOff: (doctor.weeklyOffDays ?? []).join(', ') || 'Sunday',
    phone: doctor.phone ?? doctor.user.mobile ?? '',
    address: doctor.address ?? ''
  });

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

router.put(HR_API_ROUTES.DOCTOR_ASSIGNMENT, hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { storeIds } = getAccess(req);
  const id = req.params['id'] as string;
  const { isOnline, clinicStoreId } = req.body as { isOnline?: boolean; clinicStoreId?: string | null };

  if (clinicStoreId && storeIds && !storeIds.includes(clinicStoreId)) {
    res.status(403).json({ error: 'You do not have access to that store' }); return;
  }

  const doctor = await prisma.doctor.update({
    where: { id },
    data: {
      isOnline: isOnline ?? undefined,
      clinicStoreId: isOnline ? null : (clinicStoreId ?? undefined)
    },
    include: {
      user: { select: { id: true, name: true, email: true, mobile: true } },
      clinicStore: { select: { id: true, name: true, address: true } },
      joiningLetter: { select: { id: true } }
    }
  });
  res.json({ doctor: mapDoctorForHr(doctor) });
}));
}
