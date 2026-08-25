import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import { BRAND_ASSETS, SEO_DEFAULTS } from './core/constants/branding.constants';
import { FAQ_FALLBACK_ENTRIES } from './faq/constants/faq-fallback.constants';
import { isUserWebBlogSlug } from './core/constants/blog-audience.constants';

type StructuredData = Record<string, unknown>;

type PageSeo = {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  canonicalPath?: string;
  structuredData?: StructuredData;
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
    const [diseaseSeo, blogSeo, blogIndexSeo, approachSeo] = await Promise.all([
      this.getDiseaseSeoFromUrl(cleanPath),
      this.getBlogSeoFromUrl(cleanPath),
      this.getBlogIndexSeo(cleanPath),
      this.getApproachSeoFromPage(cleanPath),
    ]);

    const dynamicSeo = { ...approachSeo, ...blogIndexSeo, ...diseaseSeo, ...blogSeo };
    const seoTitle = dynamicSeo.metaTitle || routeData['seoTitle'] || this.defaultTitle;
    const seoDescription =
      dynamicSeo.metaDescription || routeData['seoDescription'] || this.defaultDescription;
    const seoKeywords = dynamicSeo.keywords || routeData['seoKeywords'] || [];
    const canonicalPath = dynamicSeo.canonicalPath || cleanPath;
    const canonicalUrl = `${this.siteUrl}${canonicalPath === '/' ? '' : canonicalPath}`;
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
    pageSpecific?: StructuredData,
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

    if (path === '/faq') {
      graph.push({
        '@type': 'FAQPage',
        mainEntity: FAQ_FALLBACK_ENTRIES.map((entry) => ({
          '@type': 'Question',
          name: entry.question,
          acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
      });
    }
    if (pageSpecific) graph.push(pageSpecific);
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
        };
      }>(`/diseases/by-slug/${encodeURIComponent(slug)}`);
      const live = response.disease;
      const metaTitle = live.seoTitle || `${live.name} | HopeHub Care`;
      const metaDescription =
        live.seoDescription ||
        `Learn about ${live.name}, common symptoms, safety guidance, and when to consult a doctor.`;
      return {
        metaTitle,
        metaDescription,
        ogTitle: metaTitle,
        ogDescription: metaDescription,
        ogImage: live.publicImageUrl || undefined,
        canonicalPath,
        structuredData: {
          '@type': 'MedicalWebPage',
          name: metaTitle,
          description: metaDescription,
          url: `${this.siteUrl}${canonicalPath}`,
          about: { '@type': 'MedicalCondition', name: live.name },
          ...(live.updatedAt ? { lastReviewed: live.updatedAt } : {}),
        },
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

  private async getApproachSeoFromPage(path: string): Promise<PageSeo> {
    if (path !== '/why-successful') return {};
    const { homeopathyApproaches } =
      await import('./treatment-approach/homeopathy-approaches.constants');
    const allKeywords = homeopathyApproaches.flatMap((approach) => approach.seo?.keywords || []);
    return {
      metaTitle: 'Homeopathy Approaches | HopeHub Care and Research Centre',
      metaDescription:
        'Explore structured homeopathy approaches used at HopeHub Care and Research Centre, including case frameworks, strengths, and limitations.',
      keywords: Array.from(new Set(allKeywords)).slice(0, 30),
      ogTitle: 'Homeopathy Approaches at HopeHub Care and Research Centre',
      ogDescription:
        'Compare method-led homeopathy approaches and their digital care mapping at HopeHub Care and Research Centre.',
    };
  }
}
