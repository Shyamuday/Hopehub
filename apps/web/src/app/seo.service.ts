import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { diseaseInfos, homeopathyApproaches } from './constants';
import { resolveHomeLaunchDisease } from './home-launch-disease';
import { homeLaunchQueryFromUrlTree, isHomePath } from './home-launch-query';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  // Replace with your production domain after deployment.
  private readonly siteUrl = 'https://vitalisclinic.com';
  private readonly defaultTitle = 'Vitalis Care and Research Centre | Doctor-Led Digital Care';
  private readonly defaultDescription =
    'Vitalis Care and Research Centre provides doctor-led online consultations with structured intake, follow-up, and secure digital care.';
  private readonly defaultImage = `${this.siteUrl}/favicon.ico`;

  init() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        const routeData = this.getLeafRoute(this.activatedRoute).snapshot.data;
        const diseaseSeo = { ...this.getHomeLaunchDiseaseSeo(), ...this.getDiseaseSeoFromUrl() };
        const approachSeo = this.getApproachSeoFromPage();

        const seoTitle = diseaseSeo.metaTitle || approachSeo.metaTitle || routeData['seoTitle'] || this.defaultTitle;
        const seoDescription =
          diseaseSeo.metaDescription || approachSeo.metaDescription || routeData['seoDescription'] || this.defaultDescription;
        const seoKeywords = diseaseSeo.keywords || approachSeo.keywords || routeData['seoKeywords'] || [];
        const canonicalPath = diseaseSeo.canonicalPath || this.stripQueryForCanonical(this.router.url);
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

  /** Homepage `/?for=` / `?keyword=` — matches the single launch banner; treatment URL SEO wins when path is `/treatments/:slug`. */
  private getHomeLaunchDiseaseSeo() {
    if (!isHomePath(this.router.url)) {
      return {};
    }
    const tree = this.router.parseUrl(this.router.url);
    const disease = resolveHomeLaunchDisease(homeLaunchQueryFromUrlTree(tree));
    return disease?.seo || {};
  }

  private stripQueryForCanonical(url: string) {
    return url.split('?')[0].split('#')[0] || '/';
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
