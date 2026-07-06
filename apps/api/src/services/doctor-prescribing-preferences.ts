import { PrescriptionOptionType } from '@prisma/client';
import { prisma } from '../db.js';

export async function resolveDoctorDefaultMethodOptionId(userId: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { defaultMethodOptionId: true }
  });
  return doctor?.defaultMethodOptionId ?? null;
}

export async function assertMethodOptionId(methodOptionId: string | null | undefined) {
  if (!methodOptionId) return null;
  const option = await prisma.prescriptionOption.findFirst({
    where: { id: methodOptionId, type: PrescriptionOptionType.METHOD },
    select: { id: true, label: true }
  });
  return option;
}
