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
  medicineName: string;
  strength: string;
  dose: string;
  frequency: string;
  duration: string;
  durationDays: number;
  instructions: string;
  intakeTimesText: string;
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
  items: Array<{
    medicineName: string;
    strength?: string | null;
    dose?: string | null;
    frequency?: string | null;
    duration?: string | null;
    durationDays?: number | null;
    instructions?: string | null;
    intakeTimes?: string[] | null;
  }>;
};

export type PrescriptionPayload = {
  methodOptionId: string;
  diagnosedDiseaseOptionId: string;
  diagnosis: string;
  notes: string;
  advice?: string;
  followUpDate?: string;
  status: 'DRAFT' | 'PUBLISHED';
  safetyAcknowledged?: boolean;
  items: Array<{
    medicineName: string;
    strength?: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    durationDays?: number;
    instructions?: string;
    intakeTimes?: string[];
  }>;
};

export type SaveTemplatePayload = {
  name: string;
  diagnosis: string;
  advice: string;
  notes: string;
  items: Array<{
    medicineName: string;
    strength?: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    sortOrder: number;
  }>;
};
