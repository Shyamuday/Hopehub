export const GENDER_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' }
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'SINGLE', label: 'Single' },
  { value: 'MARRIED', label: 'Married' },
  { value: 'DIVORCED', label: 'Divorced' },
  { value: 'WIDOWED', label: 'Widowed' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' }
] as const;

export const BLOOD_GROUP_OPTIONS = [
  '',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'Unknown'
] as const;

export const LIFESTYLE_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'NEVER', label: 'Never' },
  { value: 'FORMER', label: 'Former' },
  { value: 'OCCASIONAL', label: 'Occasional' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' }
] as const;

export const LANGUAGE_SUGGESTIONS = [
  'English',
  'Hindi',
  'Bengali',
  'Tamil',
  'Telugu',
  'Marathi',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Punjabi',
  'Odia',
  'Urdu'
] as const;

export const EMERGENCY_RELATION_OPTIONS = [
  '',
  'Spouse',
  'Parent',
  'Child',
  'Sibling',
  'Friend',
  'Other'
] as const;

export type ReminderPreferences = {
  inApp: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

export type PatientProfile = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  alternateMobile?: string | null;
  patientCode?: string | null;
  hasPassword?: boolean;
  homeClinicStore?: { id: string; name: string; code: string; address?: string | null } | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  occupation?: string | null;
  maritalStatus?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  allergies?: string | null;
  currentMedications?: string | null;
  chronicConditions?: string | null;
  pastSurgeries?: string | null;
  familyMedicalHistory?: string | null;
  smokingStatus?: string | null;
  alcoholUse?: string | null;
  preferredLanguage?: string | null;
  patientNotes?: string | null;
};

export function emptyProfileForm() {
  return {
    name: '',
    email: '',
    alternateMobile: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    occupation: '',
    maritalStatus: '',
    heightCm: '',
    weightKg: '',
    allergies: '',
    currentMedications: '',
    chronicConditions: '',
    pastSurgeries: '',
    familyMedicalHistory: '',
    smokingStatus: '',
    alcoholUse: '',
    preferredLanguage: '',
    patientNotes: ''
  };
}

export function emptyReminderForm(): ReminderPreferences {
  return {
    inApp: true,
    sms: true,
    whatsapp: false,
    push: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00'
  };
}

export function profileToForm(profile: PatientProfile) {
  return {
    name: profile.name || '',
    email: profile.email || '',
    alternateMobile: profile.alternateMobile || '',
    dateOfBirth: profile.dateOfBirth || '',
    gender: profile.gender || '',
    bloodGroup: profile.bloodGroup || '',
    addressLine1: profile.addressLine1 || '',
    addressLine2: profile.addressLine2 || '',
    city: profile.city || '',
    state: profile.state || '',
    pincode: profile.pincode || '',
    country: profile.country || 'India',
    emergencyContactName: profile.emergencyContactName || '',
    emergencyContactPhone: profile.emergencyContactPhone || '',
    emergencyContactRelation: profile.emergencyContactRelation || '',
    occupation: profile.occupation || '',
    maritalStatus: profile.maritalStatus || '',
    heightCm: profile.heightCm != null ? String(profile.heightCm) : '',
    weightKg: profile.weightKg != null ? String(profile.weightKg) : '',
    allergies: profile.allergies || '',
    currentMedications: profile.currentMedications || '',
    chronicConditions: profile.chronicConditions || '',
    pastSurgeries: profile.pastSurgeries || '',
    familyMedicalHistory: profile.familyMedicalHistory || '',
    smokingStatus: profile.smokingStatus || '',
    alcoholUse: profile.alcoholUse || '',
    preferredLanguage: profile.preferredLanguage || '',
    patientNotes: profile.patientNotes || ''
  };
}

export function formToProfilePayload(form: ReturnType<typeof emptyProfileForm>) {
  const numOrNull = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  };

  const enumOrNull = (value: string) => (value.trim() ? value.trim() : null);

  return {
    name: form.name.trim(),
    email: form.email.trim() || null,
    alternateMobile: form.alternateMobile.trim() || null,
    dateOfBirth: form.dateOfBirth.trim() || null,
    gender: enumOrNull(form.gender),
    bloodGroup: form.bloodGroup.trim() || null,
    addressLine1: form.addressLine1.trim() || null,
    addressLine2: form.addressLine2.trim() || null,
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    pincode: form.pincode.trim() || null,
    country: form.country.trim() || 'India',
    emergencyContactName: form.emergencyContactName.trim() || null,
    emergencyContactPhone: form.emergencyContactPhone.trim() || null,
    emergencyContactRelation: form.emergencyContactRelation.trim() || null,
    occupation: form.occupation.trim() || null,
    maritalStatus: enumOrNull(form.maritalStatus),
    heightCm: numOrNull(form.heightCm),
    weightKg: numOrNull(form.weightKg),
    allergies: form.allergies.trim() || null,
    currentMedications: form.currentMedications.trim() || null,
    chronicConditions: form.chronicConditions.trim() || null,
    pastSurgeries: form.pastSurgeries.trim() || null,
    familyMedicalHistory: form.familyMedicalHistory.trim() || null,
    smokingStatus: enumOrNull(form.smokingStatus),
    alcoholUse: enumOrNull(form.alcoholUse),
    preferredLanguage: form.preferredLanguage.trim() || null,
    patientNotes: form.patientNotes.trim() || null
  };
}
