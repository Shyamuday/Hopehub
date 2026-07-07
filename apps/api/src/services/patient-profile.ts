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
  smokingStatus: z.enum(['NEVER', 'FORMER', 'OCCASIONAL', 'REGULAR', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  alcoholUse: z.enum(['NEVER', 'FORMER', 'OCCASIONAL', 'REGULAR', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  preferredLanguage: optionalText(60),
  patientNotes: optionalLongText(2000)
});

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
