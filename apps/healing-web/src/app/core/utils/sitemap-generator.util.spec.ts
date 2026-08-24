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
      '/privacy',
      '/terms',
      '/refund-policy',
      '/payment-policy',
      '/shipping-policy',
    ];

    for (const path of requiredPaths) {
      expect(sitemap).toContain(`<loc>https://hopehub.in${path}</loc>`);
    }
  });
});
