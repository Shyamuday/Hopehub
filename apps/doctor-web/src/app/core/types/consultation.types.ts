export type ConsultationMessage = {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role?: string };
};

export type ConsultationSessionNote = {
  id: string;
  body: string;
  category?: string;
  createdAt: string;
  updatedAt?: string;
  author: { id: string; name: string; role?: string };
};

export type ConsultationAssessmentAttempt = {
  id: string;
  assessmentId: string;
  assessmentType: string;
  category?: string | null;
  title: string;
  totalScore: number;
  maxScore: number;
  level: string;
  color?: string | null;
  safetyFlag: boolean;
  retakeNumber: number;
  previousId?: string | null;
  completedAt: string;
};

export type ConsultationAssessmentSummary = {
  attempts: ConsultationAssessmentAttempt[];
  latest: ConsultationAssessmentAttempt[];
  safetyFlaggedCount: number;
};

export type ConsultationSessionOutcome = {
  outcome?: 'COMPLETED' | 'USER_MISSED' | 'PROVIDER_NO_SHOW' | 'RESCHEDULE_NEEDED' | string;
  closedAt?: string;
  closedByRole?: string;
  privateNote?: string;
  userSummary?: string;
  recommendedNextStep?: string;
  packageRestored?: boolean;
  payoutAction?: string;
};

export type ConsultationCallSession = {
  id: string;
  consultationId: string;
  initiatedByUserId: string;
  targetUserId: string;
  mode: string;
  status: string;
  startedAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  durationSeconds?: number | null;
  endReason?: string | null;
  lastSignalEvent?: string | null;
  metadata?: {
    usedTurnRelay?: boolean;
    localCandidateType?: string;
    remoteCandidateType?: string;
    transportProtocol?: string;
    networkType?: string;
    currentRoundTripTime?: number;
    bytesSent?: number;
    bytesReceived?: number;
    [key: string]: unknown;
  } | null;
};

export type DoctorConsultation = {
  id: string;
  status: string;
  consultationMode?: 'CLINIC_QUEUE' | 'INSTANT_ONLINE' | string;
  pricingSnapshot?: {
    sessionOutcome?: ConsultationSessionOutcome | null;
    [key: string]: unknown;
  } | null;
  intakeAnswers?: Record<string, unknown> | null;
  patient?: {
    id: string;
    name: string;
    patientCode?: string | null;
    profileImageUrl?: string | null;
  };
  disease?: { id: string; name: string; intakeQuestions?: string[] };
  messages?: ConsultationMessage[];
};
