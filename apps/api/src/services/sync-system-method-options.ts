import { PrescriptionOptionType, type PrismaClient } from '@prisma/client';
import homeopathyApproaches from '@vitalis/homeopathy-approaches';

const lib = homeopathyApproaches as {
  allApproachDefinitions: () => Array<{ title: string; methodNormalizedLabel: string }>;
};

/** Keep PrescriptionOption METHOD rows aligned with homeopathy-approaches registry. */
export async function syncSystemMethodOptions(prisma: PrismaClient) {
  const definitions = lib.allApproachDefinitions();

  for (const def of definitions) {
    const existing = await prisma.prescriptionOption.findFirst({
      where: {
        type: PrescriptionOptionType.METHOD,
        OR: [
          { normalizedLabel: def.methodNormalizedLabel },
          { label: { equals: def.title, mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    });

    if (existing) {
      await prisma.prescriptionOption.update({
        where: { id: existing.id },
        data: {
          label: def.title,
          normalizedLabel: def.methodNormalizedLabel,
          isSystem: true
        }
      });
      continue;
    }

    await prisma.prescriptionOption.create({
      data: {
        type: PrescriptionOptionType.METHOD,
        label: def.title,
        normalizedLabel: def.methodNormalizedLabel,
        isSystem: true
      }
    });
  }
}
