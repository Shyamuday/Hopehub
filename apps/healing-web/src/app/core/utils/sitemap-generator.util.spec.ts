import { SitemapGenerator } from './sitemap-generator.util';

describe('SitemapGenerator', () => {
  it('includes every Google Ads trust and campaign destination', () => {
    const sitemap = SitemapGenerator.generateDefaultSitemap();
    const requiredPaths = [
      '/care-team',
      '/telegram',
      '/about',
      '/contact',
      '/faq',
      '/editorial-policy',
      '/privacy',
      '/terms',
      '/refund-policy',
      '/payment-policy',
      '/shipping-policy',
      '/careers',
      '/listener-guidelines',
      '/listener-training',
      '/donate',
      '/anxiety-test',
      '/depression-test',
      '/concerns/anxiety',
    ];

    for (const path of requiredPaths) {
      expect(sitemap).toContain(`<loc>https://hopehub.in${path}</loc>`);
    }
  });

  it('only reports lastmod when a source content date is available', () => {
    const sitemap = SitemapGenerator.generateDefaultSitemap();
    const staticPage = sitemap.match(
      /<url>\s*<loc>https:\/\/hopehub\.in\/careers<\/loc>([\s\S]*?)<\/url>/,
    )?.[1];
    const article = sitemap.match(
      /<url>\s*<loc>https:\/\/hopehub\.in\/articles\/understanding-depression-basics<\/loc>([\s\S]*?)<\/url>/,
    )?.[1];

    expect(staticPage).not.toContain('<lastmod>');
    expect(article).toContain('<lastmod>');
  });

  it('publishes canonical article detail routes and excludes client-only offer details', () => {
    const sitemap = SitemapGenerator.generateDefaultSitemap();

    expect(sitemap).toContain(
      '<loc>https://hopehub.in/articles/understanding-depression-basics</loc>',
    );
    expect(sitemap).not.toContain(
      '<loc>https://hopehub.in/packages/single-30-minute-session</loc>',
    );
    expect(sitemap).not.toContain('<loc>https://hopehub.in/events/goa-wellness-meetup</loc>');
  });
});
