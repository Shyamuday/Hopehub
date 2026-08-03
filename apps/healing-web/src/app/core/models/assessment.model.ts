export enum AssessmentType {
  PHQ9 = 'PHQ-9',
  PHQ2 = 'PHQ-2',
  GAD7 = 'GAD-7',
  DASS21 = 'DASS-21',
  BDI = 'BDI-II',
  HAMD = 'HAM-D',
  CESD = 'CES-D',
  WHO5 = 'WHO-5',
  PSS = 'PSS-10',
  BURNOUT = 'Burnout Assessment',
  RELATIONSHIP = 'Relationship Health',
  SLEEP = 'Sleep Quality',
  BREAKUP = 'Breakup Recovery',
  PANIC = 'Panic Symptoms',
  SOCIAL_ANXIETY = 'Social Anxiety',
  LONELINESS = 'Loneliness',
  SELF_ESTEEM = 'Self-Esteem',
  ANGER = 'Anger Regulation',
  GRIEF = 'Grief Support',
  GENERAL = 'GENERAL',
}

export enum AssessmentCategory {
  DEPRESSION = 'Depression',
  ANXIETY = 'Anxiety',
  STRESS = 'Stress',
  WELLBEING = 'Well-being',
  COMBINED = 'Combined',
  BURNOUT = 'Burnout',
  RELATIONSHIP = 'Relationship',
  SLEEP = 'Sleep',
  BREAKUP = 'Breakup Recovery',
  PANIC = 'Panic',
  SOCIAL_ANXIETY = 'Social Anxiety',
  LONELINESS = 'Loneliness',
  SELF_ESTEEM = 'Self-Esteem',
  ANGER = 'Anger',
  GRIEF = 'Grief',
}

export interface AssessmentQuestion {
  id: number;
  text: string;
  category?: string;
  subcategory?: string;
}

export interface ResponseOption {
  value: number;
  label: string;
}

export interface ScoreInterpretation {
  min: number;
  max: number;
  level: string;
  color: string;
  description: string;
  suggestions: string[];
}

export interface AssessmentConfig {
  id: string;
  type: AssessmentType;
  category: AssessmentCategory;
  title: string;
  description: string;
  instructions: string;
  timeframe?: string;
  questions: AssessmentQuestion[];
  responseOptions: ResponseOption[];
  scoring: ScoreInterpretation[];
  disclaimer: string;
  emergencyHelplines: { name: string; number: string }[];
  safetyQuestionIndex?: number;
  duration: string;
  references?: string[];
  access?: AssessmentAccess;
}

export interface AssessmentAccess {
  accessMode: 'FREE' | 'LOGIN_REQUIRED' | 'PAID';
  canAccess?: boolean;
  reason?: 'FREE' | 'SIGNED_IN' | 'GRANTED' | 'SIGN_IN_REQUIRED' | 'PAYMENT_REQUIRED';
  priceInPaise?: number | null;
  couponLabel?: string | null;
  couponDiscountType?: 'FREE' | 'PERCENT' | 'FLAT';
  couponDiscountValue?: number | null;
  accessNote?: string | null;
}

export interface AssessmentResult {
  assessmentId: string;
  assessmentType: AssessmentType;
  total: number;
  maxScore: number;
  level: string;
  color: string;
  description: string;
  suggestions: string[];
  safetyFlag: boolean;
  completedAt: Date;
  answers: number[];
}
