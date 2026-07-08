import { PrescriptionOptionType } from '@prisma/client';
import {
  DEFAULT_DOCTOR_DISEASE_FEE_PAISE,
  DEFAULT_DISEASE_INTAKE_QUESTIONS,
  DISEASE_PUBLIC_CATEGORIES
} from '../constants/disease-categories.constants.js';
import { DISEASE_CATALOG_TEMPLATE } from '../constants/disease-catalog-template.constants.js';
import { resolveDiseaseSlug } from '../constants/disease-slugs.constants.js';
import { prisma } from '../db.js';
import { normalizeOptionLabel } from '../utils/helpers.js';

export type DiseaseFaqItem = { question: string; answer: string };

export type DiseaseListItem = {
  id: string;
  name: string;
  slug: string | null;
  description: string;
  publicDescription: string | null;
  publicImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publicFaq: DiseaseFaqItem[];
  publicCategory: string | null;
  feeInPaise: number;
  isActive: boolean;
  prescriptionOptionId?: string | null;
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

  const rows = await prisma.disease.findMany({
    where: {
      ...(filters.activeOnly === false ? {} : { isActive: true }),
      ...(filters.category ? { publicCategory: filters.category } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {})
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      publicDescription: true,
      publicImageUrl: true,
      seoTitle: true,
      seoDescription: true,
      publicFaq: true,
      publicCategory: true,
      feeInPaise: true,
      isActive: true
    },
    orderBy: [{ publicCategory: 'asc' }, { name: 'asc' }],
    take: filters.limit ?? (q ? 50 : 500)
  });

  return attachPrescriptionOptionIds(rows);
}

async function attachPrescriptionOptionIds<T extends { name: string }>(diseases: T[]) {
  if (!diseases.length) return diseases as Array<T & { prescriptionOptionId: string | null }>;

  const normalizedLabels = diseases.map((disease) => normalizeOptionLabel(disease.name));
  const options = await prisma.prescriptionOption.findMany({
    where: {
      type: PrescriptionOptionType.DIAGNOSED_DISEASE,
      normalizedLabel: { in: normalizedLabels }
    },
    select: { id: true, normalizedLabel: true }
  });
  const optionByLabel = new Map(options.map((option) => [option.normalizedLabel, option.id]));

  return diseases.map((disease) => ({
    ...disease,
    publicFaq: parsePublicFaq(disease.publicFaq),
    prescriptionOptionId: optionByLabel.get(normalizeOptionLabel(disease.name)) ?? null
  }));
}

export function parsePublicFaq(value: unknown): DiseaseFaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is DiseaseFaqItem => {
      if (!item || typeof item !== 'object') return false;
      const row = item as Record<string, unknown>;
      return typeof row.question === 'string' && typeof row.answer === 'string';
    })
    .map((item) => ({
      question: item.question.trim(),
      answer: item.answer.trim()
    }))
    .filter((item) => item.question && item.answer);
}

export async function resolveDiseaseSlugInput(name: string, slugInput: string | null | undefined, excludeId?: string) {
  const normalized = slugInput?.trim().toLowerCase();
  if (normalized) {
    return ensureUniqueSlug(normalized, excludeId);
  }
  if (excludeId) {
    const existing = await prisma.disease.findUnique({ where: { id: excludeId }, select: { slug: true } });
    if (existing?.slug) return existing.slug;
  }
  return assignDiseaseSlug(name, excludeId);
}

export async function reconcileDiagnosedDiseaseOptions() {
  const diseases = await prisma.disease.findMany({ where: { isActive: true }, select: { name: true } });
  for (const disease of diseases) {
    await syncDiagnosedDiseaseOption(disease.name);
  }
  return { synced: diseases.length };
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

export async function syncDiagnosedDiseaseOption(name: string, createdById?: string) {
  const normalized = normalizeOptionLabel(name);
  await prisma.prescriptionOption.upsert({
    where: { type_normalizedLabel: { type: PrescriptionOptionType.DIAGNOSED_DISEASE, normalizedLabel: normalized } },
    update: { label: name },
    create: {
      type: PrescriptionOptionType.DIAGNOSED_DISEASE,
      label: name,
      normalizedLabel: normalized,
      isSystem: false,
      createdById: createdById ?? null
    }
  });
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;
  while (true) {
    const existing = await prisma.disease.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {})
      },
      select: { id: true }
    });
    if (!existing) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export async function assignDiseaseSlug(name: string, excludeId?: string) {
  const base = resolveDiseaseSlug(name);
  return ensureUniqueSlug(base, excludeId);
}

export async function getDiseaseBySlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const direct = await prisma.disease.findFirst({
    where: { slug: normalized, isActive: true }
  });
  if (direct) return direct;

  return prisma.disease.findFirst({
    where: { slug: { equals: normalized, mode: 'insensitive' }, isActive: true }
  });
}

export async function backfillDiseaseSlugs() {
  const diseases = await prisma.disease.findMany({ select: { id: true, name: true, slug: true } });
  let updated = 0;

  for (const disease of diseases) {
    if (disease.slug) continue;
    const slug = await assignDiseaseSlug(disease.name, disease.id);
    await prisma.disease.update({ where: { id: disease.id }, data: { slug } });
    updated += 1;
  }

  return updated;
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

  const slug = await assignDiseaseSlug(name);
  const disease = await prisma.disease.create({
    data: {
      name,
      slug,
      description: input.description?.trim() || `${name} — doctor-added condition`,
      publicCategory: input.publicCategory,
      feeInPaise: input.feeInPaise ?? DEFAULT_DOCTOR_DISEASE_FEE_PAISE,
      intakeQuestions: DEFAULT_DISEASE_INTAKE_QUESTIONS,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      publicCategory: true,
      feeInPaise: true,
      isActive: true
    }
  });

  await syncDiagnosedDiseaseOption(name, input.createdById);

  const [withOption] = await attachPrescriptionOptionIds([disease]);
  return withOption;
}

export async function syncDiseaseCatalog(defaultFeeInPaise = DEFAULT_DOCTOR_DISEASE_FEE_PAISE) {
  let created = 0;
  let categorized = 0;
  let prescriptionOptionsSynced = 0;

  for (const group of DISEASE_CATALOG_TEMPLATE) {
    for (const name of group.names) {
      const existing = await prisma.disease.findUnique({ where: { name } });
      if (existing) {
        const updates: { publicCategory?: string; slug?: string } = {};
        if (!existing.publicCategory) {
          updates.publicCategory = group.publicCategory;
          categorized += 1;
        }
        if (!existing.slug) {
          updates.slug = await assignDiseaseSlug(name, existing.id);
        }
        if (Object.keys(updates).length) {
          await prisma.disease.update({ where: { id: existing.id }, data: updates });
        }
        await syncDiagnosedDiseaseOption(name);
        prescriptionOptionsSynced += 1;
        continue;
      }

      const slug = await assignDiseaseSlug(name);
      await prisma.disease.create({
        data: {
          name,
          slug,
          description: `Consultation for ${name}.`,
          publicCategory: group.publicCategory,
          feeInPaise: defaultFeeInPaise,
          intakeQuestions: DEFAULT_DISEASE_INTAKE_QUESTIONS,
          isActive: true
        }
      });
      await syncDiagnosedDiseaseOption(name);
      prescriptionOptionsSynced += 1;
      created += 1;
    }
  }

  const slugsBackfilled = await backfillDiseaseSlugs();
  const total = await prisma.disease.count();
  return { created, categorized, slugsBackfilled, prescriptionOptionsSynced, total };
}
