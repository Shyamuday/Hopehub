export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export type User = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  patientCode?: string | null;
  role: Role;
};

export type PatientSelectionCandidate = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  patientCode?: string | null;
};

export type PatientSelectionResponse = {
  requiresPatientSelection: true;
  email?: string;
  patients: PatientSelectionCandidate[];
};

export type DiseaseFaqItem = {
  question: string;
  answer: string;
};

export type Disease = {
  id: string;
  name: string;
  slug?: string | null;
  description: string;
  publicDescription?: string | null;
  publicImageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publicFaq?: DiseaseFaqItem[];
  publicPage?: DiseaseInfo | null;
  feeInPaise: number;
  intakeQuestions: string[];
  publicCategory?: string | null;
};

export type GroupedDiseaseCategory = {
  key: string;
  label: string;
  diseases: Array<{
    id: string;
    name: string;
    description: string;
    publicCategory: string | null;
    feeInPaise: number;
    isActive: boolean;
  }>;
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
  billingPlanCode?: string | null;
  lineItems?: Record<string, unknown> | null;
  providerOrderId?: string | null;
};

export type BillingPlan = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  planType: 'ONE_TIME_APPOINTMENT' | 'STARTER_MONTHLY' | 'CONTINUITY_QUARTERLY';
  priceInPaise: number;
  consultationsLimit?: number | null;
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

export type LabReferralLine = {
  id: string;
  testName: string;
  testCode?: string | null;
  specimen?: string | null;
  resultSummary?: string | null;
  resultFileUrl?: string | null;
  completedAt?: string | null;
};

export type LabResult = {
  id: string;
  referralNumber: string;
  status: string;
  clinicalNotes?: string | null;
  expectedResultDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
  diagnosticCenter: { id: string; code: string; name: string; phone?: string | null };
  store: { id: string; name: string; code: string };
  lines: LabReferralLine[];
  totals: { testCount: number; completedTests: number };
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
  billingPlanCode?: string | null;
  pricingSnapshot?: Record<string, unknown> | null;
  payment?: Payment | null;
  messages: Message[];
  prescription?: Prescription | null;
  prescriptions?: Prescription[];
  consultationMode?: 'CLINIC_QUEUE' | 'INSTANT_ONLINE';
};

export type Doctor = User & {
  isActive: boolean;
  doctorProfile?: {
    providerType?: string;
    providerTypeLabel?: string;
    providerCategory?: string;
    specialization?: string | null;
    specialty: string;
    registrationNo?: string | null;
    isAvailable: boolean;
  };
};
