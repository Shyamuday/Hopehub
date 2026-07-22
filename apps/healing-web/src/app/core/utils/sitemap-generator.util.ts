/**
 * Sitemap Generator Utility
 * Generates sitemap.xml for SEO
 */

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number; // 0.0 to 1.0
}

export class SitemapGenerator {
  private static readonly baseUrl = 'https://healinghub.com';
  private static readonly currentDate = new Date().toISOString().split('T')[0];

  /**
   * Generate sitemap XML
   */
  static generateSitemap(urls: SitemapUrl[]): string {
    const urlEntries = urls.map(url => this.generateUrlEntry(url)).join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlEntries}
</urlset>`;
  }

  /**
   * Generate default sitemap for Healing Hub
   */
  static generateDefaultSitemap(): string {
    const urls: SitemapUrl[] = [
      // Homepage
      {
        loc: '/',
        lastmod: this.currentDate,
        changefreq: 'daily',
        priority: 1.0
      },
      // Main pages
      {
        loc: '/services',
        lastmod: this.currentDate,
        changefreq: 'weekly',
        priority: 0.9
      },
      {
        loc: '/community',
        lastmod: this.currentDate,
        changefreq: 'weekly',
        priority: 0.8
      },
      {
        loc: '/contact',
        lastmod: this.currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      // Content pages
      {
        loc: '/assessments',
        lastmod: this.currentDate,
        changefreq: 'weekly',
        priority: 0.9
      },
      {
        loc: '/exercises',
        lastmod: this.currentDate,
        changefreq: 'weekly',
        priority: 0.9
      },
      {
        loc: '/lifestyle-tips',
        lastmod: this.currentDate,
        changefreq: 'weekly',
        priority: 0.9
      },
      {
        loc: '/articles',
        lastmod: this.currentDate,
        changefreq: 'daily',
        priority: 0.9
      },
      // Service detail pages (add your actual service IDs)
      {
        loc: '/services/breakup-counseling',
        lastmod: this.currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: '/services/career-counseling',
        lastmod: this.currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: '/services/anxiety-therapy',
        lastmod: this.currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: '/services/depression-support',
        lastmod: this.currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: '/services/relationship-counseling',
        lastmod: this.currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: '/services/stress-management',
        lastmod: this.currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: '/services/grief-counseling',
        lastmod: this.currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: '/services/family-therapy',
        lastmod: this.currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: '/services/addiction-support',
        lastmod: this.currentDate,
        changefreq: 'monthly',
        priority: 0.8
      },
      {
        loc: '/services/self-esteem-coaching',
        lastmod: this.currentDate,
        changefreq: 'monthly',
        priority: 0.8
      }
    ];

    return this.generateSitemap(urls);
  }

  /**
   * Generate URL entry for sitemap
   */
  private static generateUrlEntry(url: SitemapUrl): string {
    const loc = url.loc.startsWith('http') ? url.loc : `${this.baseUrl}${url.loc}`;
    const lastmod = url.lastmod || this.currentDate;
    const changefreq = url.changefreq || 'monthly';
    const priority = url.priority !== undefined ? url.priority : 0.5;

    return `  <url>
    <loc>${this.escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }

  /**
   * Escape XML special characters
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

