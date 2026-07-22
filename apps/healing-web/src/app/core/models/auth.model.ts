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
