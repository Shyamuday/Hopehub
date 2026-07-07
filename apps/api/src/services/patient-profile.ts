import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null));

const optionalLongText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v?.trim() ? v.trim() : null));

const lifestyleEnum = z.enum(['NEVER', 'FORMER', 'OCCASIONAL', 'REGULAR', 'PREFER_NOT_TO_SAY']).optional().nullable();
const dietEnum = z.enum(['VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'EGGETARIAN', 'MIXED']).optional().nullable();
const thermalEnum = z.enum(['HOT_NATURED', 'COLD_NATURED', 'MIXED', 'NEUTRAL']).optional().nullable();

const homeopathicFields = {
  dietType: dietEnum,
  foodHabits: optionalLongText(3000),
  foodCravings: optionalLongText(2000),
  foodAversions: optionalLongText(2000),
  appetiteNotes: optionalLongText(2000),
  thirstNotes: optionalLongText(2000),
  sleepPattern: optionalLongText(2000),
  dreamNotes: optionalLongText(2000),
  thermalPreference: thermalEnum,
  perspirationNotes: optionalLongText(2000),
  bowelHabits: optionalLongText(2000),
  urineHabits: optionalLongText(2000),
  menstrualHistory: optionalLongText(2000),
  mentalTemperament: optionalLongText(3000),
  fearsPhobias: optionalLongText(2000),
  angerGriefPatterns: optionalLongText(2000),
  concentrationMemory: optionalLongText(2000),
  socialBehaviour: optionalLongText(2000),
  stressTriggers: optionalLongText(2000),
  childhoodIllnesses: optionalLongText(2000),
  vaccinationHistory: optionalLongText(2000),
  previousHomeopathicTreatment: optionalLongText(3000),
  aggravatingFactors: optionalLongText(2000),
  relievingFactors: optionalLongText(2000),
  exerciseHabits: optionalLongText(2000),
  stimulantHabits: optionalLongText(2000),
  constitutionalNotes: optionalLongText(3000),
  skinHairNailNotes: optionalLongText(2000),
  weatherSensitivity: optionalLongText(2000)
};

export const patientProfileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z
    .string()
    .email()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v?.trim() ? v.trim() : null)),
  alternateMobile: optionalText(20),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v?.trim() ? v.trim() : null)),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  bloodGroup: optionalText(8),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(100),
  state: optionalText(100),
  pincode: optionalText(12),
  country: optionalText(80),
  emergencyContactName: optionalText(100),
  emergencyContactPhone: optionalText(20),
  emergencyContactRelation: optionalText(80),
  occupation: optionalText(120),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  heightCm: z
    .preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().int().min(50).max(280).nullable())
    .optional(),
  weightKg: z
    .preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().min(1).max(500).nullable())
    .optional(),
  allergies: optionalLongText(2000),
  currentMedications: optionalLongText(2000),
  chronicConditions: optionalLongText(2000),
  pastSurgeries: optionalLongText(2000),
  familyMedicalHistory: optionalLongText(2000),
  smokingStatus: lifestyleEnum,
  alcoholUse: lifestyleEnum,
  preferredLanguage: optionalText(60),
  patientNotes: optionalLongText(2000),
  ...homeopathicFields
});

export type PatientProfileUpdateInput = z.infer<typeof patientProfileUpdateSchema>;

export function mapProfileUpdateToUserData(body: PatientProfileUpdateInput, alternateMobile: string | null) {
  return {
    name: body.name,
    email: body.email,
    alternateMobile,
    dateOfBirth: parseDateOfBirth(body.dateOfBirth),
    gender: body.gender,
    bloodGroup: body.bloodGroup,
    addressLine1: body.addressLine1,
    addressLine2: body.addressLine2,
    city: body.city,
    state: body.state,
    pincode: body.pincode,
    country: body.country ?? 'India',
    emergencyContactName: body.emergencyContactName,
    emergencyContactPhone: body.emergencyContactPhone,
    emergencyContactRelation: body.emergencyContactRelation,
    occupation: body.occupation,
    maritalStatus: body.maritalStatus,
    heightCm: body.heightCm,
    weightKg: body.weightKg,
    allergies: body.allergies,
    currentMedications: body.currentMedications,
    chronicConditions: body.chronicConditions,
    pastSurgeries: body.pastSurgeries,
    familyMedicalHistory: body.familyMedicalHistory,
    smokingStatus: body.smokingStatus,
    alcoholUse: body.alcoholUse,
    preferredLanguage: body.preferredLanguage,
    patientNotes: body.patientNotes,
    dietType: body.dietType,
    foodHabits: body.foodHabits,
    foodCravings: body.foodCravings,
    foodAversions: body.foodAversions,
    appetiteNotes: body.appetiteNotes,
    thirstNotes: body.thirstNotes,
    sleepPattern: body.sleepPattern,
    dreamNotes: body.dreamNotes,
    thermalPreference: body.thermalPreference,
    perspirationNotes: body.perspirationNotes,
    bowelHabits: body.bowelHabits,
    urineHabits: body.urineHabits,
    menstrualHistory: body.menstrualHistory,
    mentalTemperament: body.mentalTemperament,
    fearsPhobias: body.fearsPhobias,
    angerGriefPatterns: body.angerGriefPatterns,
    concentrationMemory: body.concentrationMemory,
    socialBehaviour: body.socialBehaviour,
    stressTriggers: body.stressTriggers,
    childhoodIllnesses: body.childhoodIllnesses,
    vaccinationHistory: body.vaccinationHistory,
    previousHomeopathicTreatment: body.previousHomeopathicTreatment,
    aggravatingFactors: body.aggravatingFactors,
    relievingFactors: body.relievingFactors,
    exerciseHabits: body.exerciseHabits,
    stimulantHabits: body.stimulantHabits,
    constitutionalNotes: body.constitutionalNotes,
    skinHairNailNotes: body.skinHairNailNotes,
    weatherSensitivity: body.weatherSensitivity
  };
}

export const patientPasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128)
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword']
  });

export const reminderPreferencesSchema = z.object({
  inApp: z.boolean(),
  sms: z.boolean(),
  whatsapp: z.boolean(),
  push: z.boolean(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/)
});

export function formatDateOfBirth(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function parseDateOfBirth(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
