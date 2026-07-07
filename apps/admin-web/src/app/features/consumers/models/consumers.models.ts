import type { ClinicalSummaryRow } from '@vitalis/homeopathy-approaches';
import type { SupportNoteCategory } from '../constants/support-note.constants';

export type Consumer = {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
  patientCode?: string;
  consultations: number;
};

export type ConsumerDetail = {
  consumer: {
    id: string;
    name: string;
    email?: string;
    mobile?: string;
    patientCode?: string;
    allergies?: string | null;
    currentMedications?: string | null;
    chronicConditions?: string | null;
  };
  consultations: Array<{
    id: string;
    status: string;
    createdAt: string;
    disease?: { name?: string };
    assignedDoctor?: { name?: string } | null;
    prescriptions?: Array<{ id: string; status?: string }>;
  }>;
  adherence: {
    total: number;
    taken: number;
    skipped: number;
    missed: number;
    percent: number;
  };
  doseNotes?: Array<{
    id: string;
    status: 'SKIPPED' | 'MISSED';
    scheduledFor: string;
    interactedAt: string | null;
    note: string | null;
    medicineName: string;
  }>;
};

export type ActiveDoctor = {
  id: string;
  name: string;
  doctorProfile?: { specialty?: string } | null;
};

export type SupportNote = {
  id: string;
  category: SupportNoteCategory;
  body: string;
  consultationId?: string | null;
  createdAt: string;
  author?: { name?: string; email?: string };
  consultation?: { id: string; status: string; disease?: { name?: string } } | null;
};

export type SupportContext = {
  account: { isActive: boolean; patientCode?: string | null; mobile?: string | null; email?: string | null };
  reminderPreferences?: {
    inApp: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  } | null;
  consultations: Array<{
    id: string;
    status: string;
    diseaseName: string;
    doctorName?: string | null;
    paymentStatus?: string | null;
    prescriptionCount: number;
    messageCount: number;
    createdAt: string;
  }>;
  adherenceSummary: { total: number; taken: number; skipped: number; missed: number; percent: number | null };
  flags: string[];
  recentAudit: Array<{
    id: string;
    action: string;
    summary?: string | null;
    createdAt: string;
    actorName?: string | null;
  }>;
  safeActions: string[];
};

export type ClinicalSummary = {
  prescriptions: Array<{
    id: string;
    diagnosis: string | null;
    status: string;
    createdAt: string;
    methodOption?: { label: string } | null;
    doctor?: { name: string } | null;
  }>;
  analyses: Array<{
    id: string;
    status: string;
    createdAt: string;
    methodOption?: { label: string } | null;
    selectedRemedy?: { name: string } | null;
    doctor?: { name: string } | null;
    approachTitle: string;
    caseSheetRows: ClinicalSummaryRow[];
    approachRows: ClinicalSummaryRow[];
  }>;
  prescriptionTotal: number;
  analysisTotal: number;
};

export function clinicalRecordsQuery(
  patientId: string,
  tab: 'prescriptions' | 'analyses' = 'prescriptions',
  consultationId?: string
) {
  const query: Record<string, string> = { tab, patientId };
  if (consultationId) query['consultationId'] = consultationId;
  return query;
}
