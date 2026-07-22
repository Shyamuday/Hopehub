import { z } from 'zod';

export const publicContentStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export const publicPageSeoSchema = z
  .object({
    seoTitle: z.string().max(200).optional(),
    seoDescription: z.string().max(500).optional(),
    seoKeywords: z.array(z.string().min(1).max(120)).optional(),
    ogTitle: z.string().max(200).optional(),
    ogDescription: z.string().max(500).optional(),
    ogImage: z.string().url().max(500).optional(),
    canonicalPath: z.string().max(200).optional()
  })
  .passthrough()
  .optional();

export const publicPageContentSchema = z.record(z.string(), z.unknown()).optional();

export const publicPageUpsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-/_:]+$/),
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(200).nullable().optional(),
  summary: z.string().trim().max(20_000).nullable().optional(),
  content: publicPageContentSchema.nullable().optional(),
  seo: publicPageSeoSchema.nullable().optional(),
  status: publicContentStatusSchema.optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  publishedAt: z.coerce.date().nullable().optional()
});

export type PublicPageUpsertInput = z.infer<typeof publicPageUpsertSchema>;
