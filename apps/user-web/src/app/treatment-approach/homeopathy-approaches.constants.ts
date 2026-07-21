import { allMarketingApproaches } from '@hopehub/homeopathy-approaches';
import type { HomeopathyApproach } from '../models';

/** Marketing pages — sourced from shared homeopathy-approaches registry. */
export const homeopathyApproaches: HomeopathyApproach[] = allMarketingApproaches().map((approach) => ({
  slug: approach.slug,
  title: approach.title,
  developedBy: approach.developedBy,
  shortDescription: approach.shortDescription,
  focus: approach.focus,
  bestFor: approach.bestFor,
  processSteps: approach.processSteps,
  strengths: approach.strengths,
  limits: approach.limits,
  seo: approach.seo
}));
