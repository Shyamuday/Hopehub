import { Prisma, Role } from '@prisma/client';
import { SERVER_CONFIG } from '../constants/config.constants.js';
import { prisma } from '../db.js';

export const patientListSelect = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  patientCode: true,
  homeClinicStoreId: true,
  homeClinicStore: { select: { id: true, name: true, code: true, address: true } },
  allergies: true,
  currentMedications: true,
  chronicConditions: true,
  createdAt: true
} as const;

export function normalizeMobile(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8) return null;
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
}

export function isPatientCodeQuery(value: string) {
  return /^[A-Z]{2,12}-\d{4,8}$/i.test(value.trim());
}

export async function resolvePatientByCode(patientCode: string) {
  const code = patientCode.trim().toUpperCase();
  if (!isPatientCodeQuery(code)) {
    return null;
  }
  return prisma.user.findFirst({
    where: { patientCode: code, role: Role.PATIENT },
    select: patientListSelect
  });
}

export function buildPatientScanUrl(patientCode: string) {
  const { API_PUBLIC_URL } = SERVER_CONFIG;
  return `${API_PUBLIC_URL}/go/p/${encodeURIComponent(patientCode)}`;
}

export async function allocatePatientCode(homeClinicStoreId?: string | null) {
  let prefix = 'GEN';
  if (homeClinicStoreId) {
    const store = await prisma.store.findUnique({
      where: { id: homeClinicStoreId },
      select: { code: true }
    });
    if (store?.code) {
      prefix = store.code.toUpperCase();
    }
  }

  const existing = await prisma.user.count({
    where: {
      role: Role.PATIENT,
      patientCode: { startsWith: `${prefix}-`, mode: 'insensitive' }
    }
  });

  return `${prefix}-${String(existing + 1).padStart(6, '0')}`;
}

export function buildPatientSearchOr(query: string): Prisma.UserWhereInput[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const clauses: Prisma.UserWhereInput[] = [
    { name: { contains: trimmed, mode: 'insensitive' } }
  ];

  if (isPatientCodeQuery(trimmed)) {
    clauses.push({ patientCode: { equals: trimmed.toUpperCase(), mode: 'insensitive' } });
  }

  if (trimmed.length >= 20) {
    clauses.push({ id: trimmed });
  }

  const mobile = normalizeMobile(trimmed);
  if (mobile) {
    clauses.push({ mobile });
  }

  if (trimmed.includes('@')) {
    clauses.push({ email: { equals: trimmed, mode: 'insensitive' } });
  }

  return clauses;
}

export function clinicPatientScope(clinicStoreId: string): Prisma.UserWhereInput {
  return {
    OR: [
      { homeClinicStoreId: clinicStoreId },
      { patientConsults: { some: { clinicStoreId } } }
    ]
  };
}

export async function resolveActorClinicStoreId(userId: string, role: Role) {
  if (role === Role.DOCTOR) {
    const doctor = await prisma.doctor.findUnique({
      where: { userId },
      select: { clinicStoreId: true }
    });
    return doctor?.clinicStoreId ?? null;
  }
  return null;
}

export async function doctorCanAccessPatient(doctorUserId: string, patientId: string) {
  const linked = await prisma.consultation.findFirst({
    where: { patientId, assignedDoctorId: doctorUserId },
    select: { id: true }
  });
  if (linked) return true;

  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: { clinicStoreId: true }
  });
  if (!doctor?.clinicStoreId) return false;

  const atClinic = await prisma.user.findFirst({
    where: {
      id: patientId,
      role: Role.PATIENT,
      OR: [
        { homeClinicStoreId: doctor.clinicStoreId },
        { patientConsults: { some: { clinicStoreId: doctor.clinicStoreId } } }
      ]
    },
    select: { id: true }
  });

  return Boolean(atClinic);
}

export async function searchPatients(params: {
  query: string;
  clinicStoreId?: string | null;
  scope: 'auto' | 'clinic' | 'global';
  limit?: number;
}) {
  const limit = Math.min(params.limit ?? 25, 50);
  const orClause = buildPatientSearchOr(params.query);
  if (!orClause.length) {
    return { patients: [] as Array<Prisma.UserGetPayload<{ select: typeof patientListSelect }>>, scopeUsed: 'none' as const };
  }

  const baseWhere: Prisma.UserWhereInput = {
    role: Role.PATIENT,
    OR: orClause
  };

  const runSearch = (scopeWhere?: Prisma.UserWhereInput) =>
    prisma.user.findMany({
      where: scopeWhere ? { AND: [baseWhere, scopeWhere] } : baseWhere,
      select: patientListSelect,
      orderBy: [{ homeClinicStoreId: 'asc' }, { name: 'asc' }],
      take: limit
    });

  const clinicId = params.clinicStoreId ?? null;
  const wantsClinicFirst = params.scope !== 'global' && clinicId;

  if (wantsClinicFirst) {
    const clinicPatients = await runSearch(clinicPatientScope(clinicId));
    if (clinicPatients.length || params.scope === 'clinic') {
      return { patients: clinicPatients, scopeUsed: 'clinic' as const };
    }
  }

  const globalPatients = await runSearch();
  return { patients: globalPatients, scopeUsed: 'global' as const };
}

export async function createPatientRecord(data: {
  name: string;
  email?: string | null;
  mobile?: string | null;
  passwordHash?: string | null;
  homeClinicStoreId?: string | null;
}) {
  const email = data.email?.trim() || null;
  const mobile = normalizeMobile(data.mobile);

  if (email) {
    const emailTaken = await prisma.user.findFirst({
      where: { email, role: Role.PATIENT },
      select: { id: true }
    });
    if (emailTaken) {
      throw new Error('EMAIL_TAKEN');
    }
  }

  const patientCode = await allocatePatientCode(data.homeClinicStoreId);

  return prisma.user.create({
    data: {
      name: data.name.trim(),
      email,
      mobile,
      passwordHash: data.passwordHash ?? null,
      role: Role.PATIENT,
      patientCode,
      homeClinicStoreId: data.homeClinicStoreId ?? null
    },
    select: patientListSelect
  });
}

export type PatientIdCard = {
  patientCode: string;
  name: string;
  email: string | null;
  mobile: string | null;
  clinic: { id: string; name: string; code: string; address: string | null } | null;
  issuedAt: string;
  scanUrl: string;
};

export async function buildPatientIdCard(patientId: string): Promise<PatientIdCard | null> {
  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: Role.PATIENT },
    select: patientListSelect
  });

  if (!patient?.patientCode) {
    return null;
  }

  const scanUrl = buildPatientScanUrl(patient.patientCode);

  return {
    patientCode: patient.patientCode,
    name: patient.name,
    email: patient.email,
    mobile: patient.mobile,
    clinic: patient.homeClinicStore,
    issuedAt: new Date().toISOString(),
    scanUrl
  };
}
