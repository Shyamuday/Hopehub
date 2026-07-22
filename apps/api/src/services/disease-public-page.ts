import { prisma } from '../db.js';
import {
  diseasePublicPageContentSchema,
  type DiseasePublicPageContent,
  type MergedDiseasePublicPage
} from '../types/disease-public-page.js';
import { parsePublicFaq } from './disease-catalog.js';

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
