/** Generates canonical Hope Hub sitemap XML. */

import { ALL_ARTICLES } from '../data/article-configs';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export class SitemapGenerator {
  private static readonly baseUrl = 'https://hopehub.in';
  private static readonly publicPaths = [
    '/',
    '/services',
    '/support',
    '/care-team',
    '/packages',
    '/events',
    '/resources',
    '/recorded-sessions',
    '/organization',
    '/community',
    '/telegram',
    '/about',
    '/contact',
    '/faq',
    '/careers',
    '/listener-guidelines',
    '/listener-training',
    '/editorial-policy',
    '/donate',
    '/privacy',
    '/terms',
    '/refund-policy',
    '/payment-policy',
    '/shipping-policy',
    '/assessments',
    '/anxiety-test',
    '/depression-test',
    '/stress-test',
    '/breakup-test',
    '/sleep-test',
    '/relationship-test',
    '/burnout-test',
    '/wellbeing-test',
    '/mental-health-test',
    '/panic-test',
    '/social-anxiety-test',
    '/loneliness-test',
    '/self-esteem-test',
    '/anger-test',
    '/grief-test',
    '/concerns/anxiety',
    '/concerns/depression',
    '/concerns/stress',
    '/concerns/relationship',
    '/concerns/sleep',
    '/concerns/breakup',
    '/concerns/burnout',
    '/concerns/panic',
    '/concerns/social-anxiety',
    '/concerns/loneliness',
    '/concerns/self-esteem',
    '/concerns/anger',
    '/concerns/grief',
    '/concerns/wellbeing',
    '/exercises',
    '/lifestyle-tips',
    '/articles',
  ] as const;

  static generateSitemap(urls: SitemapUrl[]): string {
    const urlEntries = urls.map((url) => this.generateUrlEntry(url)).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
  }

  static generateDefaultSitemap(): string {
    const urls: SitemapUrl[] = [
      ...this.publicPaths.map((loc) => ({ loc })),
      ...ALL_ARTICLES.map((article) => ({
        loc: `/articles/${article.id}`,
        lastmod: (article.lastUpdated || article.publishedDate).toISOString().split('T')[0],
      })),
    ];

    return this.generateSitemap(urls);
  }

  private static generateUrlEntry(url: SitemapUrl): string {
    const loc = url.loc.startsWith('http') ? url.loc : `${this.baseUrl}${url.loc}`;
    const optionalTags = [
      url.lastmod ? `    <lastmod>${this.escapeXml(url.lastmod)}</lastmod>` : '',
      url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>` : '',
      url.priority !== undefined ? `    <priority>${url.priority}</priority>` : '',
    ].filter(Boolean);

    return `  <url>
    <loc>${this.escapeXml(loc)}</loc>${optionalTags.length ? `\n${optionalTags.join('\n')}` : ''}
  </url>`;
  }

  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
