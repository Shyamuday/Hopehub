import { z } from 'zod';
import { PrescriptionStatus } from '@prisma/client';

export const prescriptionItemInputSchema = z.object({
  medicineName: z.string().min(2),
  strength: z.string().min(1).optional(),
  dose: z.string().min(1).optional(),
  frequency: z.string().min(1).optional(),
  duration: z.string().min(1).optional(),
  instructions: z.string().min(1).optional(),
  durationDays: z.number().int().min(1).max(120).optional(),
  intakeTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(6).optional()
});

export const prescriptionInputSchema = z.object({
  methodOptionId: z.string().min(1),
  diagnosedDiseaseOptionId: z.string().min(1),
  diagnosis: z.string().min(3),
  advice: z.string().min(3).optional(),
  notes: z.string().min(5),
  fileUrl: z.string().url().optional().or(z.literal('')),
  followUpDate: z.coerce.date().optional(),
  status: z.nativeEnum(PrescriptionStatus).default(PrescriptionStatus.DRAFT),
  items: z.array(prescriptionItemInputSchema).min(1),
  safetyAcknowledged: z.boolean().optional().default(false)
});

export const templateItemSchema = z.object({
  medicineName: z.string().min(1),
  strength: z.string().optional(),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0)
});

export const templateInputSchema = z.object({
  name: z.string().min(1).max(120),
  diagnosis: z.string().max(500).default(''),
  advice: z.string().max(2000).optional(),
  notes: z.string().max(2000).default(''),
  items: z.array(templateItemSchema).min(1)
});
