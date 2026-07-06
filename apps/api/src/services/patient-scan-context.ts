import { ConsultationStatus, Role } from '@prisma/client';
import { SERVER_CONFIG } from '../constants/config.constants.js';
import { prisma } from '../db.js';
import {
  buildPatientScanUrl,
  doctorCanAccessPatient,
  resolvePatientByCode
} from './patient-identity.js';

export type ScanDestinationKind =
  | 'doctor_scan'
  | 'store_dispense'
  | 'reception_walk_in'
  | 'patient_lookup'
  | 'admin_consumer'
  | 'patient_dashboard'
  | 'unsupported';

export type ScanDestination = {
  kind: ScanDestinationKind;
  path: string;
  query?: Record<string, string>;
  message?: string;
};

export type ScanContextResult = {
  patient: NonNullable<Awaited<ReturnType<typeof resolvePatientByCode>>>;
  scanUrl: string;
  destination: ScanDestination;
  primaryConsultationId: string | null;
  consultations: Array<{
    id: string;
    status: string;
    createdAt: Date;
    disease?: { name: string } | null;
  }>;
};

async function loadDoctorConsultations(doctorUserId: string, patientId: string) {
  const consultations = await prisma.consultation.findMany({
    where: {
      patientId,
      assignedDoctorId: doctorUserId,
      status: {
        in: [
          ConsultationStatus.ASSIGNED,
          ConsultationStatus.IN_PROGRESS,
          ConsultationStatus.PRESCRIPTION_UPLOADED,
          ConsultationStatus.PAID
        ]
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      status: true,
      createdAt: true,
      disease: { select: { name: true } }
    }
  });

  const primaryConsultation =
    consultations.find(
      (c) => c.status === ConsultationStatus.IN_PROGRESS || c.status === ConsultationStatus.ASSIGNED
    ) ||
    consultations[0] ||
    null;

  if (primaryConsultation?.status === ConsultationStatus.ASSIGNED) {
    await prisma.consultation.update({
      where: { id: primaryConsultation.id },
      data: { status: ConsultationStatus.IN_PROGRESS }
    });
    primaryConsultation.status = ConsultationStatus.IN_PROGRESS;
    const listed = consultations.find((c) => c.id === primaryConsultation.id);
    if (listed) listed.status = ConsultationStatus.IN_PROGRESS;
  }

  return { consultations, primaryConsultationId: primaryConsultation?.id ?? null };
}

function destinationForRole(
  role: Role,
  patientCode: string,
  options: { isStoreManager?: boolean; isStoreCounter?: boolean } = {}
): ScanDestination {
  const code = encodeURIComponent(patientCode);

  if (options.isStoreCounter || options.isStoreManager) {
    const base = options.isStoreManager ? 'store-manager' : 'store';
    return { kind: 'store_dispense', path: `/${base}/scan/patient/${code}` };
  }

  switch (role) {
    case Role.DOCTOR:
      return { kind: 'doctor_scan', path: `/scan/patient/${code}` };
    case Role.RECEPTIONIST:
      return {
        kind: 'reception_walk_in',
        path: '/walk-in',
        query: { patientCode }
      };
    case Role.CALL_CENTER:
    case Role.CLINIC_MANAGER:
    case Role.PATIENT_COORDINATOR:
      return {
        kind: 'patient_lookup',
        path: '/patients',
        query: { q: patientCode }
      };
    case Role.ADMIN:
    case Role.HR:
      return {
        kind: 'admin_consumer',
        path: '/consumers',
        query: { patientCode }
      };
    case Role.PATIENT:
      return { kind: 'patient_dashboard', path: '/patient/dashboard' };
    default:
      return {
        kind: 'unsupported',
        path: '',
        message: 'Patient scan is not configured for your role yet.'
      };
  }
}

export async function buildPatientScanContext(params: {
  patientCode: string;
  role: Role;
  userId: string;
  isStoreCounter?: boolean;
  isStoreManager?: boolean;
}): Promise<ScanContextResult | null> {
  const patient = await resolvePatientByCode(params.patientCode);
  if (!patient?.patientCode) {
    return null;
  }

  if (params.role === Role.DOCTOR) {
    const allowed = await doctorCanAccessPatient(params.userId, patient.id);
    if (!allowed) {
      throw new Error('PATIENT_ACCESS_DENIED');
    }
  }

  const destination = destinationForRole(params.role, patient.patientCode, {
    isStoreCounter: params.isStoreCounter,
    isStoreManager: params.isStoreManager
  });

  let consultations: ScanContextResult['consultations'] = [];
  let primaryConsultationId: string | null = null;

  if (params.role === Role.DOCTOR) {
    const doctorData = await loadDoctorConsultations(params.userId, patient.id);
    consultations = doctorData.consultations;
    primaryConsultationId = doctorData.primaryConsultationId;
  } else if (params.role === Role.ADMIN || params.role === Role.HR) {
    const recent = await prisma.consultation.findMany({
      where: { patientId: patient.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        disease: { select: { name: true } }
      }
    });
    consultations = recent;
    primaryConsultationId = recent[0]?.id ?? null;
  }

  if (params.role === Role.PATIENT && params.userId !== patient.id) {
    throw new Error('PATIENT_MISMATCH');
  }

  return {
    patient,
    scanUrl: buildPatientScanUrl(patient.patientCode),
    destination,
    primaryConsultationId,
    consultations
  };
}

export function adminScanDestination(patientCode: string): ScanDestination {
  return {
    kind: 'admin_consumer',
    path: '/consumers',
    query: { patientCode }
  };
}

export function doctorCaseAnalysisPath(consultationId: string): string {
  return `${SERVER_CONFIG.ORIGINS.DOCTOR}/consultations/${consultationId}/case-analysis`;
}
