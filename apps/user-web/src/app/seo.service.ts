import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { PUBLIC_SITE_BRAND } from './core/constants/public-site-content.constants';
import { SEO_DEFAULTS } from './core/constants/branding.constants';
import { diseaseInfos } from './disease/disease-info.constants';
import { homeopathyApproaches } from './treatment-approach/homeopathy-approaches.constants';

@Service()
export class SeoService {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  private readonly siteUrl = SEO_DEFAULTS.SITE_URL;
  private readonly defaultTitle = PUBLIC_SITE_BRAND.seo.defaultTitle;
  private readonly defaultDescription = PUBLIC_SITE_BRAND.seo.defaultDescription;
  private readonly defaultImage = `${this.siteUrl}/favicon.ico`;

  init() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        const routeData = this.getLeafRoute(this.activatedRoute).snapshot.data;
        const diseaseSeo = this.getDiseaseSeoFromUrl();
        const approachSeo = this.getApproachSeoFromPage();

        const seoTitle = diseaseSeo.metaTitle || approachSeo.metaTitle || routeData['seoTitle'] || this.defaultTitle;
        const seoDescription =
          diseaseSeo.metaDescription || approachSeo.metaDescription || routeData['seoDescription'] || this.defaultDescription;
        const seoKeywords = diseaseSeo.keywords || approachSeo.keywords || routeData['seoKeywords'] || [];
        const canonicalPath = diseaseSeo.canonicalPath || this.router.url;
        const canonicalUrl = `${this.siteUrl}${canonicalPath === '/' ? '' : canonicalPath}`;
        const ogTitle = diseaseSeo.ogTitle || approachSeo.ogTitle || seoTitle;
        const ogDescription = diseaseSeo.ogDescription || approachSeo.ogDescription || seoDescription;
        const ogImage = diseaseSeo.ogImage || this.defaultImage;

        this.title.setTitle(seoTitle);
        this.meta.updateTag({ name: 'description', content: seoDescription });
        this.meta.updateTag({ name: 'keywords', content: Array.isArray(seoKeywords) ? seoKeywords.join(', ') : '' });

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
      });
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

  private getDiseaseSeoFromUrl() {
    const match = this.router.url.match(/^\/treatments\/([^/?#]+)/);
    if (!match) {
      return {};
    }

    const slug = decodeURIComponent(match[1]);
    return diseaseInfos.find((item) => item.slug === slug)?.seo || {};
  }

  private getApproachSeoFromPage() {
    if (!this.router.url.startsWith('/why-successful')) {
      return {};
    }

    const allKeywords = homeopathyApproaches.flatMap((approach) => approach.seo?.keywords || []);
    return {
      metaTitle: 'Homeopathy Approaches | Vitalis Care and Research Centre',
      metaDescription:
        'Explore structured homeopathy approaches used at Vitalis Care and Research Centre, including case frameworks, strengths, and limitations.',
      keywords: Array.from(new Set(allKeywords)).slice(0, 30),
      ogTitle: 'Homeopathy Approaches at Vitalis Care and Research Centre',
      ogDescription:
        'Compare method-led homeopathy approaches and their digital care mapping at Vitalis Care and Research Centre.'
    };
  }
}
