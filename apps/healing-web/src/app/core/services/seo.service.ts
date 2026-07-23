import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';
import { APP_CONSTANTS } from '../constants/app.constants';

export interface SEOData {
  title?: string;
  description?: string;
  keywords?: string | string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SEOService {
  private readonly defaultTitle = 'Hope Hub - Professional Mental Health Services';
  private readonly defaultDescription =
    'Professional mental health services including breakup counseling, career counseling, anxiety therapy, depression support, and more. Join our supportive community.';
  private readonly defaultKeywords =
    'mental health, counseling, therapy, hope hub, breakup counseling, career counseling, anxiety therapy, depression support, stress management';
  private readonly defaultImage = '/image/hopehub-hero-meditation.png';
  private readonly siteUrl = APP_CONSTANTS.SITE_URL || 'https://mind.hopehub.in';

  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  /**
   * Update SEO meta tags for the current page
   */
  updateSEO(data: SEOData): void {
    const title = data.title || this.defaultTitle;
    const description = data.description || this.defaultDescription;
    const keywords = Array.isArray(data.keywords)
      ? data.keywords.join(', ')
      : data.keywords || this.defaultKeywords;
    const image = data.image || this.defaultImage;
    const url =
      data.url || (isPlatformBrowser(this.platformId) ? window.location.href : this.siteUrl);
    const type = data.type || 'website';

    // Update title
    this.titleService.setTitle(title);

    // Basic meta tags
    this.updateOrCreateTag('name', 'description', description);
    this.updateOrCreateTag('name', 'keywords', keywords);
    this.updateOrCreateTag('name', 'author', data.author || 'Hope Hub');
    this.updateOrCreateTag('name', 'robots', this.getRobotsMeta(data.noindex, data.nofollow));

    // Open Graph tags
    this.updateOrCreateTag('property', 'og:title', title);
    this.updateOrCreateTag('property', 'og:description', description);
    this.updateOrCreateTag('property', 'og:type', type);
    this.updateOrCreateTag('property', 'og:image', this.getAbsoluteUrl(image));
    this.updateOrCreateTag('property', 'og:url', url);
    this.updateOrCreateTag('property', 'og:site_name', 'Hope Hub');
    this.updateOrCreateTag('property', 'og:locale', 'en_US');

    // Twitter Card tags
    this.updateOrCreateTag('name', 'twitter:card', 'summary_large_image');
    this.updateOrCreateTag('name', 'twitter:title', title);
    this.updateOrCreateTag('name', 'twitter:description', description);
    this.updateOrCreateTag('name', 'twitter:image', this.getAbsoluteUrl(image));

    // Article-specific meta tags
    if (type === 'article') {
      if (data.publishedTime) {
        this.updateOrCreateTag('property', 'article:published_time', data.publishedTime);
      }
      if (data.modifiedTime) {
        this.updateOrCreateTag('property', 'article:modified_time', data.modifiedTime);
      }
      if (data.author) {
        this.updateOrCreateTag('property', 'article:author', data.author);
      }
      if (data.section) {
        this.updateOrCreateTag('property', 'article:section', data.section);
      }
      if (data.tags && data.tags.length > 0) {
        data.tags.forEach((tag, index) => {
          this.updateOrCreateTag('property', `article:tag`, tag);
        });
      }
    }

    // Canonical URL
    if (data.canonicalUrl || isPlatformBrowser(this.platformId)) {
      this.updateCanonicalUrl(data.canonicalUrl || url);
    }
  }

  /**
   * Add structured data (JSON-LD) to the page
   */
  addStructuredData(data: any): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Remove existing structured data script
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
  }

  /**
   * Add Organization structured data
   */
  addOrganizationStructuredData(): void {
    const organizationData = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Hope Hub',
      url: this.siteUrl,
      logo: this.getAbsoluteUrl('/image/hopehub-hero-meditation.png'),
      description: this.defaultDescription,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        email: APP_CONSTANTS.CONTACT.EMAIL,
        availableLanguage: ['English'],
      },
      sameAs: [APP_CONSTANTS.TELEGRAM?.GROUP_URL || ''].filter(Boolean),
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
      },
    };

    this.addStructuredData(organizationData);
  }

  /**
   * Add Service structured data
   */
  addServiceStructuredData(service: {
    name: string;
    description: string;
    provider?: string;
    areaServed?: string;
    serviceType?: string;
  }): void {
    const serviceData = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: service.name,
      description: service.description,
      provider: {
        '@type': 'Organization',
        name: service.provider || 'Hope Hub',
        url: this.siteUrl,
      },
      areaServed: service.areaServed || 'Worldwide',
      serviceType: service.serviceType || 'Mental Health Counseling',
      url: `${this.siteUrl}/services/${service.name.toLowerCase().replace(/\s+/g, '-')}`,
    };

    this.addStructuredData(serviceData);
  }

  /**
   * Add Article structured data
   */
  addArticleStructuredData(article: {
    headline: string;
    description: string;
    image?: string;
    author: string;
    datePublished: string;
    dateModified?: string;
    articleSection?: string;
  }): void {
    const articleData = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.headline,
      description: article.description,
      image: article.image ? this.getAbsoluteUrl(article.image) : this.defaultImage,
      author: {
        '@type': 'Person',
        name: article.author,
      },
      publisher: {
        '@type': 'Organization',
        name: 'Hope Hub',
        logo: {
          '@type': 'ImageObject',
          url: this.getAbsoluteUrl('/image/hopehub-hero-meditation.png'),
        },
      },
      datePublished: article.datePublished,
      dateModified: article.dateModified || article.datePublished,
      articleSection: article.articleSection || 'Mental Health',
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': isPlatformBrowser(this.platformId) ? window.location.href : this.siteUrl,
      },
    };

    this.addStructuredData(articleData);
  }

  /**
   * Add BreadcrumbList structured data
   */
  addBreadcrumbStructuredData(breadcrumbs: Array<{ name: string; url: string }>): void {
    const breadcrumbData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: this.getAbsoluteUrl(crumb.url),
      })),
    };

    this.addStructuredData(breadcrumbData);
  }

  /**
   * Add FAQ structured data
   */
  addFAQStructuredData(faqs: Array<{ question: string; answer: string }>): void {
    const faqData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };

    this.addStructuredData(faqData);
  }

  /**
   * Update or create a meta tag
   */
  private updateOrCreateTag(attr: 'name' | 'property', selector: string, content: string): void {
    const tag = { [attr]: selector, content };
    if (this.metaService.getTag(`${attr}="${selector}"`)) {
      this.metaService.updateTag(tag);
    } else {
      this.metaService.addTag(tag);
    }
  }

  /**
   * Update canonical URL
   */
  private updateCanonicalUrl(url: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Get robots meta tag content
   */
  private getRobotsMeta(noindex?: boolean, nofollow?: boolean): string {
    const directives: string[] = [];
    if (noindex) {
      directives.push('noindex');
    } else {
      directives.push('index');
    }
    if (nofollow) {
      directives.push('nofollow');
    } else {
      directives.push('follow');
    }
    return directives.join(', ');
  }

  /**
   * Get absolute URL from relative path
   */
  private getAbsoluteUrl(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const baseUrl = this.siteUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * Clear all structured data
   */
  clearStructuredData(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    scripts.forEach((script) => script.remove());
  }
}
