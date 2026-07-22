import { prisma } from '../db.js';
import { PublicPageStatus } from '@prisma/client';
import {
  DEFAULT_DISEASE_INTAKE_QUESTIONS,
  DEFAULT_DOCTOR_DISEASE_FEE_PAISE
} from '../constants/disease-categories.constants.js';
import {
  diseasePublicPageContentSchema,
  type DiseasePublicPageContent,
  type MergedDiseasePublicPage,
  type StaticDiseasePageImport
} from '../types/disease-public-page.js';
import { parsePublicFaq, resolveDiseaseSlugInput } from './disease-catalog.js';

type DiseaseRow = {
  name: string;
  slug: string | null;
  publicDescription: string | null;
  publicImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  publicFaq: unknown;
  publicPageContent: unknown;
  publicPageStatus?: PublicPageStatus;
  publicPagePublishedAt?: Date | null;
  publicPageReviewedAt?: Date | null;
};

export function parsePublicPageContent(value: unknown): DiseasePublicPageContent | null {
  if (!value || typeof value !== 'object') return null;
  const parsed = diseasePublicPageContentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function mergeDiseasePublicPage(disease: DiseaseRow): MergedDiseasePublicPage | null {
  const content = parsePublicPageContent(disease.publicPageContent);
  const faq = parsePublicFaq(disease.publicFaq);
  const slug = disease.slug?.trim() || '';
  const hasBody =
    Boolean(content) ||
    Boolean(disease.publicDescription?.trim()) ||
    Boolean(disease.publicImageUrl?.trim()) ||
    faq.length > 0;

  if (!hasBody) return null;

  const summary = disease.publicDescription?.trim() || content?.about?.trim() || '';
  const imageUrl = disease.publicImageUrl?.trim() || '';
  const imageAlt = content?.imageAlt?.trim() || disease.name;
  const contentSeo = content?.seo || {};

  return {
    ...(content || {}),
    name: disease.name,
    slug,
    summary,
    imageUrl,
    imageAlt,
    faq,
    seo: {
      ...contentSeo,
      metaTitle: disease.seoTitle || contentSeo.metaTitle,
      metaDescription: disease.seoDescription || contentSeo.metaDescription,
      ogImage: contentSeo.ogImage || imageUrl || undefined,
      canonicalPath: contentSeo.canonicalPath || (slug ? `/treatments/${slug}` : undefined)
    }
  };
}

function parseReviewedDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function staticImportToDbFields(info: StaticDiseasePageImport) {
  const {
    name,
    slug,
    imageUrl,
    imageAlt,
    summary,
    about,
    faq,
    shortName,
    category,
    diseaseType,
    icdCode,
    ourApproach,
    symptoms,
    causes,
    riskFactors,
    diagnosis,
    tests,
    treatmentOptions,
    medications,
    homeCare,
    prevention,
    severityLevel,
    whenToSeeDoctor,
    emergencySigns,
    duration,
    stages,
    commonIn,
    reviewedBy,
    lastUpdated,
    references,
    careApproach,
    details,
    warning,
    seo
  } = info;

  const publicPageContent: DiseasePublicPageContent = {
    ...(shortName ? { shortName } : {}),
    ...(imageAlt ? { imageAlt } : {}),
    ...(category ? { category } : {}),
    ...(diseaseType ? { diseaseType } : {}),
    ...(icdCode ? { icdCode } : {}),
    ...(about ? { about } : {}),
    ...(ourApproach ? { ourApproach } : {}),
    ...(symptoms?.length ? { symptoms } : {}),
    ...(causes?.length ? { causes } : {}),
    ...(riskFactors?.length ? { riskFactors } : {}),
    ...(diagnosis ? { diagnosis } : {}),
    ...(tests?.length ? { tests } : {}),
    ...(treatmentOptions ? { treatmentOptions } : {}),
    ...(medications?.length ? { medications } : {}),
    ...(homeCare?.length ? { homeCare } : {}),
    ...(prevention?.length ? { prevention } : {}),
    ...(severityLevel ? { severityLevel } : {}),
    ...(whenToSeeDoctor ? { whenToSeeDoctor } : {}),
    ...(emergencySigns?.length ? { emergencySigns } : {}),
    ...(duration ? { duration } : {}),
    ...(stages?.length ? { stages } : {}),
    ...(commonIn ? { commonIn } : {}),
    ...(reviewedBy ? { reviewedBy } : {}),
    ...(lastUpdated ? { lastUpdated } : {}),
    ...(references?.length ? { references } : {}),
    ...(careApproach?.length ? { careApproach } : {}),
    ...(details?.length ? { details } : {}),
    ...(warning ? { warning } : {}),
    ...(seo ? { seo } : {})
  };

  return {
    slug,
    publicImageUrl: imageUrl?.trim() || null,
    publicDescription: summary?.trim() || about?.trim() || null,
    publicFaq: faq ?? [],
    seoTitle: seo?.metaTitle?.trim() || null,
    seoDescription: seo?.metaDescription?.trim() || null,
    publicPageContent,
    publicPageStatus: PublicPageStatus.PUBLISHED,
    publicPagePublishedAt: parseReviewedDate(lastUpdated) ?? new Date(),
    publicPageReviewedAt: parseReviewedDate(lastUpdated)
  };
}

export async function getDiseasePublicPageEditPayload(diseaseId: string) {
  const disease = await prisma.disease.findUnique({ where: { id: diseaseId } });
  if (!disease) return null;

  return {
    id: disease.id,
    name: disease.name,
    slug: disease.slug,
    publicDescription: disease.publicDescription,
    publicImageUrl: disease.publicImageUrl,
    seoTitle: disease.seoTitle,
    seoDescription: disease.seoDescription,
    publicPageStatus: disease.publicPageStatus,
    publicPagePublishedAt: disease.publicPagePublishedAt,
    publicPageReviewedAt: disease.publicPageReviewedAt,
    publicFaq: parsePublicFaq(disease.publicFaq),
    publicPageContent: parsePublicPageContent(disease.publicPageContent),
    publicPage: mergeDiseasePublicPage(disease)
  };
}

export async function updateDiseasePublicPage(
  diseaseId: string,
  body: {
    publicDescription?: string | null;
    publicImageUrl?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    publicPageStatus?: PublicPageStatus;
    publicPagePublishedAt?: Date | null;
    publicPageReviewedAt?: Date | null;
    publicFaq?: Array<{ question: string; answer: string }> | null;
    publicPageContent?: DiseasePublicPageContent | null;
  }
) {
  const existing = await prisma.disease.findUnique({ where: { id: diseaseId } });
  if (!existing) return null;

  const disease = await prisma.disease.update({
    where: { id: diseaseId },
    data: {
      publicDescription: body.publicDescription,
      publicImageUrl: body.publicImageUrl ?? null,
      seoTitle: body.seoTitle ?? null,
      seoDescription: body.seoDescription ?? null,
      publicPageStatus: body.publicPageStatus,
      publicPagePublishedAt: body.publicPagePublishedAt,
      publicPageReviewedAt: body.publicPageReviewedAt,
      publicFaq: body.publicFaq ?? [],
      publicPageContent: body.publicPageContent ?? undefined
    }
  });

  return {
    disease: {
      ...disease,
      publicFaq: parsePublicFaq(disease.publicFaq),
      publicPageContent: parsePublicPageContent(disease.publicPageContent),
      publicPage: mergeDiseasePublicPage(disease)
    }
  };
}

export async function importStaticDiseasePages(entries: StaticDiseasePageImport[]) {
  let matched = 0;
  let updated = 0;
  let created = 0;
  const unmatched: string[] = [];

  for (const entry of entries) {
    const fields = staticImportToDbFields(entry);
    const slug = await resolveDiseaseSlugInput(entry.name, fields.slug);

    const bySlug = fields.slug
      ? await prisma.disease.findFirst({ where: { slug: fields.slug } })
      : null;
    const byName = await prisma.disease.findUnique({ where: { name: entry.name } });
    const existing = bySlug || byName;

    if (existing) {
      await prisma.disease.update({
        where: { id: existing.id },
        data: {
          slug: existing.slug || slug,
          publicDescription: fields.publicDescription,
          publicImageUrl: fields.publicImageUrl,
          publicFaq: fields.publicFaq,
          seoTitle: fields.seoTitle,
          seoDescription: fields.seoDescription,
          publicPageContent: fields.publicPageContent,
          publicPageStatus: fields.publicPageStatus,
          publicPagePublishedAt: fields.publicPagePublishedAt,
          publicPageReviewedAt: fields.publicPageReviewedAt
        }
      });
      matched += 1;
      updated += 1;
      continue;
    }

    await prisma.disease.create({
      data: {
        name: entry.name,
        slug,
        description: entry.summary || entry.about || `${entry.name} care at HopeHub Care.`,
        publicCategory: entry.category ?? null,
        feeInPaise: DEFAULT_DOCTOR_DISEASE_FEE_PAISE,
        intakeQuestions: DEFAULT_DISEASE_INTAKE_QUESTIONS,
        publicDescription: fields.publicDescription,
        publicImageUrl: fields.publicImageUrl,
        publicFaq: fields.publicFaq,
        seoTitle: fields.seoTitle,
        seoDescription: fields.seoDescription,
        publicPageContent: fields.publicPageContent,
        publicPageStatus: fields.publicPageStatus,
        publicPagePublishedAt: fields.publicPagePublishedAt,
        publicPageReviewedAt: fields.publicPageReviewedAt
      }
    });
    created += 1;
  }

  return { matched, updated, created, unmatched, total: entries.length };
}
