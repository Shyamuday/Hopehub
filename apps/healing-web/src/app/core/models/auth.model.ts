// ── API User shape (matches backend toAuthResponse) ───────────────────────────
export interface User {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  patientCode: string | null;
  role: 'PATIENT';
  // stored locally from preferences
  preferences?: UserPreferences;
  profile?: UserProfile;
}

export interface UserProfile {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  location?: string;
  timezone?: string;
  emergencyContact?: EmergencyContact;
  mentalHealthGoals?: string[];
}

export interface PatientProfile {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  patientCode: string | null;
  alternateMobile?: string | null;
  dateOfBirth?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  occupation?: string | null;
  maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'PREFER_NOT_TO_SAY' | null;
  preferredLanguage?: string | null;
  patientNotes?: string | null;
  currentMedications?: string | null;
  chronicConditions?: string | null;
  allergies?: string | null;
  sleepPattern?: string | null;
  mentalTemperament?: string | null;
  stressTriggers?: string | null;
  fearsPhobias?: string | null;
  concentrationMemory?: string | null;
  socialBehaviour?: string | null;
  hasPassword?: boolean;
}

export interface PatientProfileResponse {
  profile: PatientProfile;
  reminderPreferences?: {
    inApp: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  };
}

export interface PatientDailyPlanImage {
  id: string;
  taskId: string | null;
  mimeType: string;
  fileName: string | null;
  byteSize: number;
  caption: string | null;
  imageUrl: string;
  createdAt: string;
}

export interface PatientDailyPlanTask {
  id: string;
  title: string;
  notes: string | null;
  sortOrder: number;
  completed: boolean;
  completedAt: string | null;
  reviewTick: boolean;
  reviewNote: string | null;
  images: PatientDailyPlanImage[];
}

export interface PatientDailyPlan {
  id: string;
  planDate: string;
  title: string;
  focus: string | null;
  summary: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  tasks: PatientDailyPlanTask[];
  images: PatientDailyPlanImage[];
  createdAt: string;
  updatedAt: string;
}

export interface PatientDailyPlansResponse {
  plans: PatientDailyPlan[];
}

export interface PatientDailyPlanResponse {
  plan: PatientDailyPlan;
}

export interface PatientDailyPlanCreateRequest {
  planDate: string;
  title: string;
  focus?: string | null;
  summary?: string | null;
  tasks?: Array<{ title: string; notes?: string | null; sortOrder?: number }>;
}

export interface PatientDailyPlanUpdateRequest {
  title?: string;
  focus?: string | null;
  summary?: string | null;
  reviewNote?: string | null;
  reviewed?: boolean;
}

export interface PatientDailyPlanTaskUpdateRequest {
  title?: string;
  notes?: string | null;
  sortOrder?: number;
  completed?: boolean;
  reviewTick?: boolean;
  reviewNote?: string | null;
}

export interface PatientDailyPlanImageUploadRequest {
  taskId?: string | null;
  mimeType: string;
  fileName?: string;
  dataBase64: string;
  caption?: string | null;
}

export type PatientProfileUpdateRequest = Pick<
  PatientProfile,
  | 'name'
  | 'email'
  | 'alternateMobile'
  | 'dateOfBirth'
  | 'gender'
  | 'emergencyContactName'
  | 'emergencyContactPhone'
  | 'emergencyContactRelation'
  | 'occupation'
  | 'maritalStatus'
  | 'preferredLanguage'
  | 'patientNotes'
  | 'currentMedications'
  | 'chronicConditions'
  | 'allergies'
  | 'sleepPattern'
  | 'mentalTemperament'
  | 'stressTriggers'
  | 'fearsPhobias'
  | 'concentrationMemory'
  | 'socialBehaviour'
>;

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: NotificationPreferences;
  accessibility: AccessibilityPreferences;
  privacy: PrivacyPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  dailyReminders: boolean;
  weeklyReports: boolean;
  assessmentReminders: boolean;
  exerciseReminders: boolean;
  crisisAlerts: boolean;
}

export interface AccessibilityPreferences {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
}

export interface PrivacyPreferences {
  dataCollection: boolean;
  analytics: boolean;
  personalizedContent: boolean;
  shareProgress: boolean;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  photoURL?: string;
  profile?: Partial<UserProfile>;
  preferences?: Partial<UserPreferences>;
}

export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

// ── API response shapes ────────────────────────────────────────────────────────
export interface ApiAuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
    patientCode: string | null;
    role: string;
  };
}

// Multiple patients with same email — user must pick one
export interface PatientSelectionResponse {
  requiresPatientSelection: true;
  patients: Array<{
    id: string;
    name: string;
    email: string | null;
    patientCode: string | null;
  }>;
}
