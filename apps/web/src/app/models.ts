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
  notes: string;
  fileUrl?: string | null;
  createdAt: string;
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
};

export type Doctor = User & {
  isActive: boolean;
  doctorProfile?: {
    specialty: string;
    registrationNo?: string | null;
    isAvailable: boolean;
  };
};
