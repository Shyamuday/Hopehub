import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import { SEO_DEFAULTS } from './core/constants/branding.constants';

type DiseaseSeo = {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalPath?: string;
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
  private readonly defaultImage = `${this.siteUrl}/favicon.ico`;

  init() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        void this.applyRouteSeo();
      });
  }

  private async applyRouteSeo() {
    const routeData = this.getLeafRoute(this.activatedRoute).snapshot.data;
    const diseaseSeo = await this.getDiseaseSeoFromUrl();
    const approachSeo = await this.getApproachSeoFromPage();

    const seoTitle =
      diseaseSeo.metaTitle || approachSeo.metaTitle || routeData['seoTitle'] || this.defaultTitle;
    const seoDescription =
      diseaseSeo.metaDescription ||
      approachSeo.metaDescription ||
      routeData['seoDescription'] ||
      this.defaultDescription;
    const seoKeywords =
      diseaseSeo.keywords || approachSeo.keywords || routeData['seoKeywords'] || [];
    const canonicalPath = diseaseSeo.canonicalPath || this.router.url;
    const canonicalUrl = `${this.siteUrl}${canonicalPath === '/' ? '' : canonicalPath}`;
    const ogTitle = diseaseSeo.ogTitle || approachSeo.ogTitle || seoTitle;
    const ogDescription = diseaseSeo.ogDescription || approachSeo.ogDescription || seoDescription;
    const ogImage = diseaseSeo.ogImage || this.defaultImage;

    this.title.setTitle(seoTitle);
    this.meta.updateTag({ name: 'description', content: seoDescription });
    this.meta.updateTag({
      name: 'keywords',
      content: Array.isArray(seoKeywords) ? seoKeywords.join(', ') : '',
    });

    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:title', content: ogTitle });
    this.meta.updateTag({ property: 'og:description', content: ogDescription });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:image', content: ogImage });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: ogTitle });
    this.meta.updateTag({ name: 'twitter:description', content: ogDescription });
    this.meta.updateTag({ name: 'twitter:image', content: ogImage });

    this.upsertCanonical(canonicalUrl);
  }

  private getLeafRoute(route: ActivatedRoute): ActivatedRoute {
    let current = route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
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

  private async getDiseaseSeoFromUrl(): Promise<DiseaseSeo> {
    const match = this.router.url.match(/^\/treatments\/([^/?#]+)/);
    if (!match) {
      return {};
    }

    const slug = decodeURIComponent(match[1]);
    const canonicalPath = `/treatments/${slug}`;

    try {
      const response = await this.apiClient.get<{
        disease: {
          seoTitle?: string | null;
          seoDescription?: string | null;
          publicImageUrl?: string | null;
          name: string;
        };
      }>(`/diseases/by-slug/${encodeURIComponent(slug)}`);

      const live = response.disease;
      const metaTitle = live.seoTitle || `${live.name} | HopeHub Care`;
      const metaDescription = live.seoDescription || '';

      return {
        metaTitle,
        metaDescription,
        ogTitle: metaTitle,
        ogDescription: metaDescription,
        ogImage: live.publicImageUrl || undefined,
        canonicalPath,
      };
    } catch {
      return { canonicalPath };
    }
  }

  private async getApproachSeoFromPage(): Promise<DiseaseSeo> {
    if (!this.router.url.startsWith('/why-successful')) {
      return {};
    }

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
