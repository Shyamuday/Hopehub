import { z } from 'zod';

export const diseaseStringListSchema = z.array(z.string().min(1)).optional();

export const diseasePublicPageContentSchema = z.object({
  shortName: z.string().max(120).optional(),
  imageAlt: z.string().max(200).optional(),
  category: z.string().max(120).optional(),
  diseaseType: z.string().max(120).optional(),
  icdCode: z.string().max(40).optional(),
  about: z.string().max(20_000).optional(),
  ourApproach: z
    .object({
      title: z.string().min(1),
      intro: z.string().min(1),
      points: z.array(z.string().min(1)).min(1)
    })
    .optional(),
  symptoms: diseaseStringListSchema,
  causes: diseaseStringListSchema,
  riskFactors: diseaseStringListSchema,
  diagnosis: z.string().max(5_000).optional(),
  tests: diseaseStringListSchema,
  treatmentOptions: z
    .object({
      allopathy: z.string().max(2_000).optional(),
      ayurveda: z.string().max(2_000).optional(),
      homeopathy: z.string().max(2_000).optional(),
      lifestyle: z.string().max(2_000).optional()
    })
    .optional(),
  medications: diseaseStringListSchema,
  homeCare: diseaseStringListSchema,
  prevention: diseaseStringListSchema,
  severityLevel: z.string().max(1_000).optional(),
  whenToSeeDoctor: z.string().max(2_000).optional(),
  emergencySigns: diseaseStringListSchema,
  duration: z.string().max(500).optional(),
  stages: diseaseStringListSchema,
  commonIn: z
    .object({
      ageGroup: z.string().max(120).optional(),
      gender: z.string().max(120).optional()
    })
    .optional(),
  reviewedBy: z.string().max(200).optional(),
  lastUpdated: z.string().max(40).optional(),
  references: diseaseStringListSchema,
  careApproach: diseaseStringListSchema,
  details: diseaseStringListSchema,
  warning: z.string().max(2_000).optional()
});

export type DiseasePublicPageContent = z.infer<typeof diseasePublicPageContentSchema>;

export type MergedDiseasePublicPage = DiseasePublicPageContent & {
  name: string;
  slug: string;
  summary: string;
  imageUrl: string;
  imageAlt: string;
  faq: Array<{ question: string; answer: string }>;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    canonicalPath?: string;
  };
};

export type StaticDiseasePageImport = {
  name: string;
  slug: string;
  shortName?: string;
  imageUrl?: string;
  imageAlt?: string;
  category?: string;
  diseaseType?: string;
  icdCode?: string;
  summary?: string;
  about?: string;
  ourApproach?: DiseasePublicPageContent['ourApproach'];
  symptoms?: string[];
  causes?: string[];
  riskFactors?: string[];
  diagnosis?: string;
  tests?: string[];
  treatmentOptions?: DiseasePublicPageContent['treatmentOptions'];
  medications?: string[];
  homeCare?: string[];
  prevention?: string[];
  severityLevel?: string;
  whenToSeeDoctor?: string;
  emergencySigns?: string[];
  duration?: string;
  stages?: string[];
  commonIn?: DiseasePublicPageContent['commonIn'];
  faq?: Array<{ question: string; answer: string }>;
  reviewedBy?: string;
  lastUpdated?: string;
  references?: string[];
  careApproach?: string[];
  details?: string[];
  warning?: string;
  seo?: MergedDiseasePublicPage['seo'];
};

export const diseasePublicPageUpdateSchema = z.object({
  publicDescription: z.string().max(20_000).nullable().optional(),
  publicImageUrl: z.string().url().max(500).nullable().optional().or(z.literal('').transform(() => null)),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
  publicFaq: z
    .array(z.object({ question: z.string().min(3), answer: z.string().min(3) }))
    .nullable()
    .optional(),
  publicPageContent: diseasePublicPageContentSchema.nullable().optional()
});
