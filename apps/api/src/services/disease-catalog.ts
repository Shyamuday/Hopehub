import { PrescriptionOptionType } from '@prisma/client';
import {
  DEFAULT_DOCTOR_DISEASE_FEE_PAISE,
  DEFAULT_DISEASE_INTAKE_QUESTIONS,
  DISEASE_PUBLIC_CATEGORIES
} from '../constants/disease-categories.constants.js';
import { DISEASE_CATALOG_TEMPLATE } from '../constants/disease-catalog-template.constants.js';
import { prisma } from '../db.js';
import { normalizeOptionLabel } from '../utils/helpers.js';

export type DiseaseListItem = {
  id: string;
  name: string;
  description: string;
  publicCategory: string | null;
  feeInPaise: number;
  isActive: boolean;
};

export class DiseaseCatalogError extends Error {
  constructor(
    readonly code: 'DISEASE_EXISTS' | 'INVALID_CATEGORY',
    message: string
  ) {
    super(message);
  }
}

export function diseaseCategoryLabel(key: string | null | undefined) {
  if (!key) return 'Other';
  const hit = DISEASE_PUBLIC_CATEGORIES.find((item) => item.key === key);
  return hit?.label ?? key.replace(/-/g, ' ');
}

export function isKnownDiseaseCategory(key: string) {
  return DISEASE_PUBLIC_CATEGORIES.some((item) => item.key === key);
}

export async function listDiseasesForDoctor(filters: {
  q?: string;
  category?: string;
  limit?: number;
  activeOnly?: boolean;
}) {
  return listDiseases(filters);
}

export async function listDiseases(filters: {
  q?: string;
  category?: string;
  limit?: number;
  activeOnly?: boolean;
}) {
  const q = filters.q?.trim();

  return prisma.disease.findMany({
    where: {
      ...(filters.activeOnly === false ? {} : { isActive: true }),
      ...(filters.category ? { publicCategory: filters.category } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {})
    },
    select: {
      id: true,
      name: true,
      description: true,
      publicCategory: true,
      feeInPaise: true,
      isActive: true
    },
    orderBy: [{ publicCategory: 'asc' }, { name: 'asc' }],
    take: filters.limit ?? (q ? 50 : 500)
  });
}

export function groupDiseasesByCategory(
  diseases: DiseaseListItem[],
  options?: { includeEmpty?: boolean }
) {
  const byKey = new Map<string, DiseaseListItem[]>();
  const uncategorized: DiseaseListItem[] = [];

  for (const disease of diseases) {
    const key = disease.publicCategory?.trim() || '';
    if (!key) {
      uncategorized.push(disease);
      continue;
    }
    const bucket = byKey.get(key) ?? [];
    bucket.push(disease);
    byKey.set(key, bucket);
  }

  const categories: Array<{ key: string; label: string; diseases: DiseaseListItem[] }> = [];

  for (const category of DISEASE_PUBLIC_CATEGORIES) {
    const items = byKey.get(category.key) ?? [];
    if (items.length || options?.includeEmpty) {
      categories.push({ key: category.key, label: category.label, diseases: items });
    }
  }

  for (const [key, items] of byKey) {
    if (!DISEASE_PUBLIC_CATEGORIES.some((category) => category.key === key) && items.length) {
      categories.push({ key, label: diseaseCategoryLabel(key), diseases: items });
    }
  }

  return { categories, uncategorized };
}

export async function createDoctorDisease(input: {
  name: string;
  publicCategory: string;
  description?: string;
  feeInPaise?: number;
  createdById: string;
}) {
  const name = input.name.trim();
  if (!name) {
    throw new DiseaseCatalogError('INVALID_CATEGORY', 'Disease name is required.');
  }

  if (!isKnownDiseaseCategory(input.publicCategory)) {
    throw new DiseaseCatalogError('INVALID_CATEGORY', 'Choose a valid disease category.');
  }

  const existing = await prisma.disease.findUnique({ where: { name } });
  if (existing) {
    throw new DiseaseCatalogError('DISEASE_EXISTS', 'A disease with this name already exists.');
  }

  const disease = await prisma.disease.create({
    data: {
      name,
      description: input.description?.trim() || `${name} — doctor-added condition`,
      publicCategory: input.publicCategory,
      feeInPaise: input.feeInPaise ?? DEFAULT_DOCTOR_DISEASE_FEE_PAISE,
      intakeQuestions: DEFAULT_DISEASE_INTAKE_QUESTIONS,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      description: true,
      publicCategory: true,
      feeInPaise: true,
      isActive: true
    }
  });

  const normalized = normalizeOptionLabel(name);
  await prisma.prescriptionOption.upsert({
    where: { type_normalizedLabel: { type: PrescriptionOptionType.DIAGNOSED_DISEASE, normalizedLabel: normalized } },
    update: { label: name },
    create: {
      type: PrescriptionOptionType.DIAGNOSED_DISEASE,
      label: name,
      normalizedLabel: normalized,
      isSystem: false,
      createdById: input.createdById
    }
  });

  return disease;
}

export async function syncDiseaseCatalog(defaultFeeInPaise = DEFAULT_DOCTOR_DISEASE_FEE_PAISE) {
  let created = 0;
  let categorized = 0;

  for (const group of DISEASE_CATALOG_TEMPLATE) {
    for (const name of group.names) {
      const existing = await prisma.disease.findUnique({ where: { name } });
      if (existing) {
        if (!existing.publicCategory) {
          await prisma.disease.update({
            where: { id: existing.id },
            data: { publicCategory: group.publicCategory }
          });
          categorized += 1;
        }
        continue;
      }

      await prisma.disease.create({
        data: {
          name,
          description: `Consultation for ${name}.`,
          publicCategory: group.publicCategory,
          feeInPaise: defaultFeeInPaise,
          intakeQuestions: DEFAULT_DISEASE_INTAKE_QUESTIONS,
          isActive: true
        }
      });
      created += 1;
    }
  }

  const total = await prisma.disease.count();
  return { created, categorized, total };
}
