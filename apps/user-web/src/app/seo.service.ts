import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import { BRAND_ASSETS, SEO_DEFAULTS } from './core/constants/branding.constants';
import { API_PATHS } from './core/constants/api-paths.constants';
import { FAQ_FALLBACK_ENTRIES } from './faq/constants/faq-fallback.constants';
import { isUserWebBlogSlug } from './core/constants/blog-audience.constants';

type StructuredData = Record<string, unknown>;
type FaqItem = { question: string; answer: string };

type PageSeo = {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  canonicalPath?: string;
  structuredData?: StructuredData | StructuredData[];
  noIndex?: boolean;
};

type BlogSeoResponse = {
  post: {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    authorName?: string | null;
    authorRole?: string | null;
    publishedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

@Service()
export class SeoService {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly apiClient = inject(ClinicApiClient);

  private readonly siteUrl = SEO_DEFAULTS.SITE_URL;
  private readonly defaultTitle = SEO_DEFAULTS.DEFAULT_TITLE;
  private readonly defaultDescription = SEO_DEFAULTS.DEFAULT_DESCRIPTION;
  private readonly defaultImage = `${this.siteUrl}${BRAND_ASSETS.OG_IMAGE_PATH}`;

  init() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        void this.applyRouteSeo();
      });
  }

  private async applyRouteSeo() {
    const leafRoute = this.getLeafRoute(this.activatedRoute);
    const routeData = leafRoute.snapshot.data;
    const cleanPath = this.cleanPath(this.router.url);
    const [diseaseSeo, blogSeo, blogIndexSeo, faqSeo, doctorsSeo] = await Promise.all([
      this.getDiseaseSeoFromUrl(cleanPath),
      this.getBlogSeoFromUrl(cleanPath),
      this.getBlogIndexSeo(cleanPath),
      this.getFaqSeoFromPage(cleanPath),
      this.getDoctorsSeoFromPage(cleanPath),
    ]);

    const dynamicSeo = {
      ...faqSeo,
      ...doctorsSeo,
      ...blogIndexSeo,
      ...diseaseSeo,
      ...blogSeo,
    };
    const seoTitle = dynamicSeo.metaTitle || routeData['seoTitle'] || this.defaultTitle;
    const seoDescription =
      dynamicSeo.metaDescription || routeData['seoDescription'] || this.defaultDescription;
    const seoKeywords = dynamicSeo.keywords || routeData['seoKeywords'] || [];
    const canonicalPath = dynamicSeo.canonicalPath || cleanPath;
    const canonicalUrl = `${this.siteUrl}${canonicalPath}`;
    const ogTitle = dynamicSeo.ogTitle || seoTitle;
    const ogDescription = dynamicSeo.ogDescription || seoDescription;
    const ogImage = dynamicSeo.ogImage || this.defaultImage;
    const noIndex =
      Boolean(routeData['noIndex']) ||
      Boolean(dynamicSeo.noIndex) ||
      this.isPrivateOrUtilityPath(cleanPath);

    this.title.setTitle(seoTitle);
    this.meta.updateTag({ name: 'description', content: seoDescription });
    this.meta.updateTag({
      name: 'robots',
      content: noIndex ? 'noindex, nofollow' : 'index, follow',
    });
    this.meta.updateTag({
      name: 'googlebot',
      content: noIndex ? 'noindex, nofollow' : 'index, follow',
    });
    this.meta.updateTag({
      name: 'keywords',
      content: Array.isArray(seoKeywords) ? seoKeywords.join(', ') : '',
    });

    this.meta.updateTag({ property: 'og:type', content: dynamicSeo.ogType || 'website' });
    this.meta.updateTag({ property: 'og:title', content: ogTitle });
    this.meta.updateTag({ property: 'og:description', content: ogDescription });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:image', content: ogImage });
    this.meta.updateTag({ property: 'og:site_name', content: 'HopeHub Care' });
    this.meta.updateTag({ property: 'og:locale', content: 'en_IN' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: ogTitle });
    this.meta.updateTag({ name: 'twitter:description', content: ogDescription });
    this.meta.updateTag({ name: 'twitter:image', content: ogImage });
    this.meta.updateTag({ name: 'twitter:url', content: canonicalUrl });

    this.upsertCanonical(canonicalUrl);
    this.upsertStructuredData(
      this.buildRouteStructuredData(
        cleanPath,
        canonicalUrl,
        seoTitle,
        seoDescription,
        dynamicSeo.structuredData,
      ),
    );
  }

  private getLeafRoute(route: ActivatedRoute): ActivatedRoute {
    let current = route;
    while (current.firstChild) current = current.firstChild;
    return current;
  }

  private cleanPath(url: string): string {
    const path = (url.split(/[?#]/, 1)[0] || '/').replace(/\/+$/, '');
    return path || '/';
  }

  private isPrivateOrUtilityPath(path: string): boolean {
    return /^(?:\/login|\/auth(?:\/|$)|\/patient(?:\/|$)|\/get-app(?:\/|$))/.test(path);
  }

  private upsertCanonical(url: string) {
    let link: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private upsertStructuredData(value: StructuredData) {
    const id = 'hopehub-route-structured-data';
    let script = this.document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(value).replace(/</g, '\\u003c');
  }

  private buildRouteStructuredData(
    path: string,
    canonicalUrl: string,
    title: string,
    description: string,
    pageSpecific?: StructuredData | StructuredData[],
  ): StructuredData {
    const graph: StructuredData[] = [
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        isPartOf: { '@id': `${this.siteUrl}/#website` },
        inLanguage: 'en-IN',
      },
    ];

    const segments = path.split('/').filter(Boolean);
    if (segments.length) {
      graph.push({
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${this.siteUrl}/`,
          },
          ...segments.map((segment, index) => ({
            '@type': 'ListItem',
            position: index + 2,
            name: this.humanizePathSegment(segment),
            item: `${this.siteUrl}/${segments.slice(0, index + 1).join('/')}`,
          })),
        ],
      });
    }

    if (pageSpecific) {
      graph.push(...(Array.isArray(pageSpecific) ? pageSpecific : [pageSpecific]));
    }
    return { '@context': 'https://schema.org', '@graph': graph };
  }

  private humanizePathSegment(value: string): string {
    return decodeURIComponent(value)
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private async getDiseaseSeoFromUrl(path: string): Promise<PageSeo> {
    const match = path.match(/^\/treatments\/([^/]+)$/);
    if (!match) return {};

    const slug = decodeURIComponent(match[1]);
    const canonicalPath = `/treatments/${encodeURIComponent(slug)}`;
    try {
      const response = await this.apiClient.get<{
        disease: {
          seoTitle?: string | null;
          seoDescription?: string | null;
          publicImageUrl?: string | null;
          name: string;
          updatedAt?: string | null;
          publicFaq?: FaqItem[] | null;
          publicPage?: {
            faq?: FaqItem[];
            reviewedBy?: string;
            lastUpdated?: string;
            references?: string[];
          } | null;
        };
      }>(`/diseases/by-slug/${encodeURIComponent(slug)}`);
      const live = response.disease;
      const metaTitle = this.normalizeSeoTitle(live.seoTitle || `${live.name} | HopeHub Care`);
      const metaDescription = this.normalizeMetaDescription(
        live.seoDescription ||
          `Learn about ${live.name}, common symptoms, safety guidance, and when to consult a doctor.`,
      );
      const faq = live.publicFaq?.length ? live.publicFaq : live.publicPage?.faq || [];
      const medicalPage: StructuredData = {
        '@type': 'MedicalWebPage',
        name: metaTitle,
        description: metaDescription,
        url: `${this.siteUrl}${canonicalPath}`,
        about: { '@type': 'MedicalCondition', name: live.name },
        ...(live.publicPage?.reviewedBy
          ? {
              reviewedBy: {
                '@type': 'Organization',
                name: live.publicPage.reviewedBy,
              },
            }
          : {}),
        ...(live.publicPage?.lastUpdated || live.updatedAt
          ? { lastReviewed: live.publicPage?.lastUpdated || live.updatedAt }
          : {}),
        ...(live.publicPage?.references?.length ? { citation: live.publicPage.references } : {}),
      };
      return {
        metaTitle,
        metaDescription,
        ogTitle: metaTitle,
        ogDescription: metaDescription,
        ogImage: live.publicImageUrl || undefined,
        canonicalPath,
        structuredData: [medicalPage, ...(faq.length ? [this.buildFaqStructuredData(faq)] : [])],
      };
    } catch {
      return { canonicalPath };
    }
  }

  private async getBlogSeoFromUrl(path: string): Promise<PageSeo> {
    const match = path.match(/^\/blog\/([^/]+)$/);
    if (!match) return {};

    const slug = decodeURIComponent(match[1]);
    const canonicalPath = `/blog/${encodeURIComponent(slug)}`;
    if (!isUserWebBlogSlug(slug)) return { canonicalPath, noIndex: true };
    try {
      const { post } = await this.apiClient.get<BlogSeoResponse>(
        `/blog/${encodeURIComponent(slug)}?trackView=false`,
      );
      const author = post.authorName
        ? {
            '@type': 'Person',
            name: post.authorName,
            ...(post.authorRole ? { jobTitle: post.authorRole } : {}),
          }
        : { '@type': 'Organization', name: 'HopeHub Care editorial team' };
      return {
        metaTitle: `${post.title} | HopeHub Care`,
        metaDescription: post.excerpt,
        ogTitle: post.title,
        ogDescription: post.excerpt,
        ogType: 'article',
        canonicalPath,
        structuredData: {
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt,
          articleSection: post.category,
          datePublished: post.publishedAt || post.createdAt,
          dateModified: post.updatedAt,
          author,
          publisher: { '@id': `${this.siteUrl}/#clinic` },
          mainEntityOfPage: `${this.siteUrl}${canonicalPath}`,
        },
      };
    } catch {
      return { canonicalPath };
    }
  }

  private async getBlogIndexSeo(path: string): Promise<PageSeo> {
    if (path !== '/blog') return {};
    try {
      const payload = await this.apiClient.get<{
        posts?: Array<{ slug: string }>;
      }>('/blog?sort=recent');
      const hasUserWebArticles = (payload.posts ?? []).some((post) => isUserWebBlogSlug(post.slug));
      return { noIndex: !hasUserWebArticles };
    } catch {
      return { noIndex: true };
    }
  }

  private async getFaqSeoFromPage(path: string): Promise<PageSeo> {
    if (path !== '/faq') return {};
    let entries: FaqItem[] = FAQ_FALLBACK_ENTRIES;
    try {
      const response = await this.apiClient.get<{ entries?: FaqItem[] }>(API_PATHS.FAQ);
      if (response.entries?.length) entries = response.entries;
    } catch {
      // The FAQ page renders the same fallback entries when the API is unavailable.
    }
    return { structuredData: this.buildFaqStructuredData(entries) };
  }

  private async getDoctorsSeoFromPage(path: string): Promise<PageSeo> {
    if (path !== '/our-doctors') return {};
    try {
      const response = await this.apiClient.get<{
        doctors?: Array<{
          id: string;
          specialty?: string | null;
          designation?: string | null;
          bio?: string | null;
          registrationNo?: string | null;
          credentialVerified?: boolean;
          user: { name: string; profileImageUrl?: string | null };
        }>;
      }>(API_PATHS.DOCTORS);
      const doctors = response.doctors ?? [];
      if (!doctors.length) return {};
      return {
        structuredData: {
          '@type': 'ItemList',
          name: 'HopeHub Care doctors',
          itemListElement: doctors.map((doctor, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Person',
              '@id': `${this.siteUrl}/our-doctors#doctor-${encodeURIComponent(doctor.id)}`,
              name: doctor.user.name,
              jobTitle: doctor.designation || doctor.specialty || 'Homeopathic Doctor',
              ...(doctor.bio ? { description: doctor.bio } : {}),
              ...(doctor.user.profileImageUrl ? { image: doctor.user.profileImageUrl } : {}),
              ...(doctor.registrationNo && doctor.credentialVerified
                ? {
                    hasCredential: {
                      '@type': 'EducationalOccupationalCredential',
                      credentialCategory: 'Professional registration',
                      identifier: doctor.registrationNo,
                    },
                  }
                : {}),
            },
          })),
        },
      };
    } catch {
      return {};
    }
  }

  private buildFaqStructuredData(entries: FaqItem[]): StructuredData {
    return {
      '@type': 'FAQPage',
      mainEntity: entries.map((entry) => ({
        '@type': 'Question',
        name: entry.question,
        acceptedAnswer: { '@type': 'Answer', text: entry.answer },
      })),
    };
  }

  private normalizeSeoTitle(value: string): string {
    const deDuplicated = value.trim().replace(/\bTreatment\s+Treatment\b/gi, 'Treatment');
    if (deDuplicated.length <= 65) return deDuplicated;
    const shortenedBrand = deDuplicated.replace(
      /\s*\|\s*HopeHub Care and Research Centre$/i,
      ' | HopeHub Care',
    );
    return shortenedBrand.length <= 65
      ? shortenedBrand
      : `${shortenedBrand.slice(0, 62).trim()}...`;
  }

  private normalizeMetaDescription(value: string): string {
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (normalized.length <= 165) return normalized;
    const clipped = normalized.slice(0, 162);
    const lastSpace = clipped.lastIndexOf(' ');
    return `${clipped.slice(0, lastSpace > 120 ? lastSpace : 162).replace(/[.,;:]$/, '')}...`;
  }
}
