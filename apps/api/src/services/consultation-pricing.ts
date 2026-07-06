import { prisma } from '../db.js';

export const ONLINE_LOCATION_KEY = 'ONLINE';

export function clinicStoreToLocationKey(clinicStoreId: string | null | undefined): string {
  return clinicStoreId ?? ONLINE_LOCATION_KEY;
}

export async function resolveDiseaseConsultationFee(
  diseaseId: string,
  clinicStoreId: string | null | undefined
): Promise<number> {
  const locationKey = clinicStoreToLocationKey(clinicStoreId);
  const override = await prisma.diseaseLocationFee.findUnique({
    where: { diseaseId_locationKey: { diseaseId, locationKey } }
  });
  if (override) return override.feeInPaise;

  const disease = await prisma.disease.findUnique({
    where: { id: diseaseId },
    select: { feeInPaise: true }
  });
  return disease?.feeInPaise ?? 0;
}

export async function listDiseaseLocationFees(diseaseId?: string) {
  return prisma.diseaseLocationFee.findMany({
    where: diseaseId ? { diseaseId } : undefined,
    include: { disease: { select: { id: true, name: true, feeInPaise: true } } },
    orderBy: [{ disease: { name: 'asc' } }, { locationKey: 'asc' }]
  });
}

export async function upsertDiseaseLocationFee(input: {
  diseaseId: string;
  locationKey: string;
  feeInPaise: number;
}) {
  return prisma.diseaseLocationFee.upsert({
    where: {
      diseaseId_locationKey: {
        diseaseId: input.diseaseId,
        locationKey: input.locationKey
      }
    },
    create: input,
    update: { feeInPaise: input.feeInPaise }
  });
}

export async function deleteDiseaseLocationFee(diseaseId: string, locationKey: string) {
  await prisma.diseaseLocationFee.delete({
    where: { diseaseId_locationKey: { diseaseId, locationKey } }
  });
}
