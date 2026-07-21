import type { ApproachDefinition } from './types';
import { allApproachDefinitions } from './registry';

export type MarketingApproachContent = {
  slug: string;
  title: string;
  developedBy?: string;
  shortDescription: string;
  focus: string;
  bestFor: string[];
  processSteps: string[];
  strengths: string[];
  limits: string[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogTitle: string;
    ogDescription: string;
  };
};

function buildSeo(def: ApproachDefinition): MarketingApproachContent['seo'] {
  const publicSlug = def.marketingSlug || def.slug;
  return {
    metaTitle: `${def.title} | HopeHub Care and Research Centre`,
    metaDescription: def.shortDescription,
    keywords: Array.from(
      new Set([
        def.title,
        `${publicSlug} homeopathy`,
        'homeopathy method',
        'clinical homeopathy',
        'HopeHub Care and Research Centre',
        'doctor-led care',
        ...def.bestFor.slice(0, 4)
      ])
    ),
    ogTitle: `${def.title} Approach | HopeHub Care and Research Centre`,
    ogDescription: def.shortDescription
  };
}

export function toMarketingApproach(def: ApproachDefinition): MarketingApproachContent {
  return {
    slug: def.marketingSlug || def.slug,
    title: def.title,
    developedBy: def.developedBy,
    shortDescription: def.shortDescription,
    focus: def.focus,
    bestFor: def.bestFor,
    processSteps: def.processSteps,
    strengths: def.strengths,
    limits: def.limits,
    seo: buildSeo(def)
  };
}

export function allMarketingApproaches(): MarketingApproachContent[] {
  return allApproachDefinitions().map(toMarketingApproach);
}
