import type { MethodIntakeFlatRow } from './method-intake';

export type OptionType = 'METHOD' | 'DIAGNOSED_DISEASE';

export type TemplateItem = {
  medicineName: string;
  strength?: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  sortOrder?: number;
};

export type PrescriptionTemplate = {
  id: string;
  name: string;
  diagnosis: string;
  advice?: string | null;
  notes: string;
  items: TemplateItem[];
};

export type PrescriptionOption = {
  id: string;
  label: string;
};

export type MedicineRow = {
  /** Encodes CGHS pick as tab-separated code, name, potency, amount; or `__other__`; or empty. */
  formularyKey: string;
  medicineName: string;
  strength: string;
  dose: string;
  frequency: string;
  duration: string;
  durationDays: number;
  instructions: string;
  intakeTimesText: string;
};

export type LoadedPrescriptionItem = {
  medicineName: string;
  strength?: string | null;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
  durationDays?: number | null;
  instructions?: string | null;
  intakeTimes?: string[] | null;
};

export type LoadedPrescription = {
  id: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  createdAt?: string;
  followUpDate?: string | null;
  diagnosis: string;
  advice?: string | null;
  notes: string;
  methodOptionId?: string | null;
  diagnosedDiseaseOptionId?: string | null;
  methodIntakeAnswers?: Record<string, string> | null;
  methodOption?: { id?: string; label?: string } | null;
  items: LoadedPrescriptionItem[];
};

export type ConsultationAttachmentRow = {
  id: string;
  kind: string;
  fileName?: string | null;
  mimeType?: string | null;
  caption?: string | null;
  fileUrl: string;
  createdAt?: string;
  uploadedBy?: { name?: string };
};

/** Method intake UI card (method profile only; kingdom/miasm use dedicated panels). */
export type MethodIntakeUiPanel = {
  id: string;
  heading: string;
  description: string;
  profileTitle?: string;
  profileHelper?: string;
  rows: Array<MethodIntakeFlatRow & { showSectionHeader: boolean }>;
};
