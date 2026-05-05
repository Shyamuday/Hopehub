export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export type User = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  role: Role;
};

export type Disease = {
  id: string;
  name: string;
  description: string;
  feeInPaise: number;
  intakeQuestions: string[];
};

export type DiseaseInfo = {
  name: string;
  shortName: string;
  slug: string;
  imageUrl: string;
  imageAlt: string;
  category?: string;
  diseaseType?: string;
  icdCode?: string;
  summary: string;
  about: string;
  ourApproach?: {
    title: string;
    intro: string;
    points: string[];
  };
  symptoms: string[];
  causes?: string[];
  riskFactors?: string[];
  diagnosis?: string;
  tests?: string[];
  treatmentOptions?: {
    allopathy?: string;
    ayurveda?: string;
    homeopathy?: string;
    lifestyle?: string;
  };
  medications?: string[];
  homeCare?: string[];
  prevention?: string[];
  severityLevel?: string;
  whenToSeeDoctor?: string;
  emergencySigns?: string[];
  duration?: string;
  stages?: string[];
  commonIn?: {
    ageGroup?: string;
    gender?: string;
  };
  faq?: Array<{
    question: string;
    answer: string;
  }>;
  reviewedBy?: string;
  lastUpdated?: string;
  references?: string[];
  careApproach: string[];
  details: string[];
  warning?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    canonicalPath?: string;
  };
};

export type HomeopathyApproach = {
  slug: string;
  title: string;
  developedBy?: string;
  shortDescription: string;
  focus: string;
  bestFor: string[];
  processSteps: string[];
  strengths: string[];
  limits: string[];
  digitalMapping?: string[];
  uiFlow?: string[];
  uiComponents?: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
  };
};

export type Payment = {
  id: string;
  amountInPaise: number;
  status: 'CREATED' | 'PAID' | 'FAILED';
  providerOrderId?: string | null;
};

export type Message = {
  id: string;
  body: string;
  createdAt: string;
  sender: User;
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
  items?: PrescriptionItem[];
  createdAt: string;
};

export type PrescriptionItem = {
  id: string;
  medicineName: string;
  strength?: string | null;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
};

export type DoseEvent = {
  id: string;
  scheduledFor: string;
  status: 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED';
  note?: string | null;
  takenAt?: string | null;
  skippedAt?: string | null;
  prescriptionItem: PrescriptionItem;
};

export type Consultation = {
  id: string;
  status:
    | 'PAYMENT_PENDING'
    | 'PAID'
    | 'ASSIGNED'
    | 'IN_PROGRESS'
    | 'PRESCRIPTION_UPLOADED'
    | 'COMPLETED'
    | 'CANCELLED';
  intakeAnswers: Record<string, string>;
  createdAt: string;
  patient: User;
  assignedDoctor?: User | null;
  disease: Disease;
  payment?: Payment | null;
  messages: Message[];
  prescription?: Prescription | null;
  prescriptions?: Prescription[];
};

export type Doctor = User & {
  isActive: boolean;
  doctorProfile?: {
    specialty: string;
    registrationNo?: string | null;
    isAvailable: boolean;
  };
};
