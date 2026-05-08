export type PrescriptionItem = {
  id: string;
  medicineName: string;
  strength?: string | null;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
};

export type Prescription = {
  id: string;
  version?: number;
  diagnosis?: string;
  advice?: string | null;
  notes: string;
  fileUrl?: string | null;
  status?: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  followUpDate?: string | null;
  method?: string | null;
  diagnosedDisease?: string | null;
  /** Structured fields from doctor app (homeopathy method intake). */
  methodIntakeAnswers?: Record<string, string> | null;
  items?: PrescriptionItem[];
  createdAt: string;
};
