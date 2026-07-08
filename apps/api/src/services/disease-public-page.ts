import { prisma } from '../db.js';
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

  return {
    ...(content || {}),
    name: disease.name,
    slug,
    summary,
    imageUrl,
    imageAlt,
    faq,
    seo: {
      metaTitle: disease.seoTitle || undefined,
      metaDescription: disease.seoDescription || undefined,
      ogImage: imageUrl || undefined,
      canonicalPath: slug ? `/treatments/${slug}` : undefined
    }
  };
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
    seo,
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
    warning
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
    ...(warning ? { warning } : {})
  };

  return {
    slug,
    publicImageUrl: imageUrl?.trim() || null,
    publicDescription: summary?.trim() || about?.trim() || null,
    publicFaq: faq ?? [],
    seoTitle: seo?.metaTitle?.trim() || null,
    seoDescription: seo?.metaDescription?.trim() || null,
    publicPageContent
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
          publicPageContent: fields.publicPageContent
        }
      });
      matched += 1;
      updated += 1;
      continue;
    }

    unmatched.push(entry.name);
  }

  return { matched, updated, created, unmatched, total: entries.length };
}
