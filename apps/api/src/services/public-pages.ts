import { Prisma, PublicContentStatus } from '@prisma/client';
import { prisma } from '../db.js';
import type { PublicPageUpsertInput } from '../types/public-pages.js';

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return (value ?? {}) as Prisma.InputJsonValue;
}

export const PUBLIC_PAGE_SEEDS: PublicPageUpsertInput[] = [
  {
    slug: 'home',
    title: 'Personalised care for every health concern.',
    subtitle: 'Provider-led healthcare',
    summary:
      'Acute illnesses, chronic conditions, skin and hair issues, digestive problems, allergies, mental wellness, nutrition, rehabilitation, and more - consult qualified healthcare providers online with guidance, prescriptions where appropriate, and follow-up.',
    status: 'PUBLISHED',
    sortOrder: 10,
    content: {
      ctaTitle: 'Start your consultation today.',
      ctaBody:
        'Book online for any health concern, or chat with us on WhatsApp - our team will guide you to the right provider.'
    },
    seo: {
      seoTitle: 'HopeHub Care | Provider-Led Healthcare for All Conditions',
      seoDescription:
        'Book online healthcare consultations for any health concern. Licensed providers, prescriptions where appropriate, follow-up, and secure patient support.',
      canonicalPath: '/'
    }
  },
  {
    slug: 'about',
    title: 'We are a provider-led healthcare platform for patients of all ages and concerns.',
    subtitle: 'Who we are',
    summary:
      'HopeHub Care and Research Centre brings structured online care under one trusted clinic brand. Patients choose their health concern, share symptoms, and our internal provider panel guides the full journey.',
    status: 'PUBLISHED',
    sortOrder: 20,
    seo: {
      seoTitle: 'About HopeHub Care and Research Centre | Provider-Led Healthcare',
      seoDescription:
        'Learn about HopeHub Care - a provider-led healthcare platform offering online consultations for acute, chronic, mental wellness, preventive, and supportive care.',
      canonicalPath: '/about'
    }
  },
  {
    slug: 'treatments',
    title: 'Care for acute, chronic, and everyday health concerns.',
    subtitle: 'Treatments',
    summary:
      'HopeHub Care and Research Centre offers provider-led online consultations across disease categories and provider types.',
    status: 'PUBLISHED',
    sortOrder: 30,
    seo: {
      seoTitle: 'Treatments | HopeHub Care and Research Centre',
      seoDescription:
        'Explore provider-led care at HopeHub Care for acute and chronic conditions across body systems, age groups, and care needs.',
      canonicalPath: '/treatments'
    }
  },
  {
    slug: 'chronic-care',
    title: 'Acute, chronic, and preventive care across every disease category.',
    subtitle: 'Comprehensive care',
    summary:
      'Whether your concern is recent or long-standing, our providers take detailed history, match the right care approach, and support you through follow-up.',
    status: 'PUBLISHED',
    sortOrder: 40,
    seo: {
      seoTitle: 'Provider-Led Care | HopeHub Care',
      seoDescription:
        'Comprehensive provider-led care at HopeHub Care for acute, chronic, mental wellness, preventive, and supportive health needs.',
      canonicalPath: '/chronic-care'
    }
  },
  {
    slug: 'our-providers',
    title: 'Experienced providers. Dedicated to patient care.',
    subtitle: 'Our provider team',
    summary:
      'HopeHub Care and Research Centre maintains an internal panel of qualified healthcare providers across acute care, chronic disease support, mental wellness, nutrition, rehabilitation, and more.',
    status: 'PUBLISHED',
    sortOrder: 50,
    seo: {
      seoTitle: 'Our Providers | HopeHub Care and Research Centre',
      seoDescription:
        'Meet qualified healthcare providers at HopeHub Care. Our internal provider team is matched to patients based on their concern for personalised care.',
      canonicalPath: '/our-providers'
    }
  },
  {
    slug: 'faq',
    title: 'Frequently asked questions.',
    subtitle: 'FAQ',
    summary: 'Questions about consultations, treatment flow, prescriptions, and patient support.',
    status: 'PUBLISHED',
    sortOrder: 60,
    seo: {
      seoTitle: 'FAQ | HopeHub Care',
      seoDescription:
        'Frequently asked questions about consultations, treatment flow, and patient support at HopeHub Care.',
      canonicalPath: '/faq'
    }
  },
  {
    slug: 'safety',
    title: 'Not for emergency care.',
    subtitle: 'Safety and trust',
    summary:
      'HopeHub Care is for planned online consultation and follow-up. Severe or sudden symptoms require immediate offline medical care.',
    status: 'PUBLISHED',
    sortOrder: 70,
    seo: {
      seoTitle: 'Safety and Trust | HopeHub Care',
      seoDescription:
        'Review safety guidance, medical disclaimers, and emergency-care boundaries for HopeHub Care consultations.',
      canonicalPath: '/safety'
    }
  },
  {
    slug: 'legal',
    title: 'Privacy, terms, and clinic policies.',
    subtitle: 'Legal',
    summary:
      'Read how HopeHub handles your data, consultations, payments, medicine orders, delivery, and returns.',
    status: 'PUBLISHED',
    sortOrder: 80,
    seo: {
      seoTitle: 'Legal & Policies | HopeHub Care',
      seoDescription:
        'Privacy policy, terms and conditions, return and exchange, shipping, and payment policies for HopeHub Care.',
      canonicalPath: '/legal'
    }
  }
];

export function mapPublicPage(row: {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  content: unknown;
  seo: unknown;
  status: PublicContentStatus;
  sortOrder: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return row;
}

export async function seedPublicPages() {
  let created = 0;
  let updated = 0;

  for (const page of PUBLIC_PAGE_SEEDS) {
    const existing = await prisma.publicPage.findUnique({ where: { slug: page.slug } });
    await prisma.publicPage.upsert({
      where: { slug: page.slug },
      create: {
        slug: page.slug,
        title: page.title,
        subtitle: page.subtitle ?? null,
        summary: page.summary ?? null,
        content: jsonValue(page.content),
        seo: jsonValue(page.seo),
        status: page.status ?? PublicContentStatus.PUBLISHED,
        sortOrder: page.sortOrder ?? 0,
        publishedAt: page.publishedAt ?? new Date()
      },
      update: {
        title: page.title,
        subtitle: page.subtitle ?? null,
        summary: page.summary ?? null,
        content: jsonValue(page.content),
        seo: jsonValue(page.seo),
        status: page.status ?? PublicContentStatus.PUBLISHED,
        sortOrder: page.sortOrder ?? 0,
        publishedAt: page.publishedAt ?? new Date()
      }
    });
    if (existing) updated += 1;
    else created += 1;
  }

  return { created, updated, total: PUBLIC_PAGE_SEEDS.length };
}
