import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta } from '@angular/platform-browser';
import { SEOService } from './seo.service';

describe('SEOService', () => {
  let document: Document;
  let meta: Meta;
  let service: SEOService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    document = TestBed.inject(DOCUMENT);
    meta = TestBed.inject(Meta);
    service = TestBed.inject(SEOService);
  });

  it('updates the route URL for Twitter cards', () => {
    service.updateSEO({
      title: 'Anxiety Test - Hope Hub',
      description: 'Private anxiety self-check',
      url: 'https://hopehub.in/anxiety-test',
      canonicalUrl: 'https://hopehub.in/anxiety-test',
    });

    expect(meta.getTag('name="twitter:url"')?.content).toBe('https://hopehub.in/anxiety-test');
    expect(meta.getTag('name="title"')?.content).toBe('Anxiety Test - Hope Hub');
    expect(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(
      'https://hopehub.in/anxiety-test',
    );
  });

  it('marks team bylines as organizations instead of people', () => {
    service.addArticleStructuredData({
      headline: 'Understanding anxiety',
      description: 'An educational guide',
      author: 'Hope Hub Wellness Team',
      datePublished: '2024-01-20T00:00:00.000Z',
      url: 'https://hopehub.in/articles/understanding-anxiety',
    });

    const script = document.querySelector<HTMLScriptElement>(
      'script[data-hopehub-schema="article"]',
    );
    const schema = JSON.parse(script?.textContent || '{}');

    expect(schema.author).toEqual({
      '@type': 'Organization',
      name: 'Hope Hub Wellness Team',
      url: 'https://hopehub.in/editorial-policy',
    });
    expect(schema.inLanguage).toBe('en-IN');
  });
});
