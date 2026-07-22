import { Injectable, inject } from '@angular/core';
import { ClinicApiClient } from '../../clinic-api/clinic-api.client';
import { API_PATHS } from '../constants/api-paths.constants';

export type PublicPageSeo = {
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalPath?: string;
};

export type PublicPage = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  content?: Record<string, unknown> | null;
  seo?: PublicPageSeo | null;
  status: 'PUBLISHED';
  sortOrder: number;
};

@Injectable({ providedIn: 'root' })
export class PublicPagesService {
  private readonly client = inject(ClinicApiClient);
  private pages: Map<string, PublicPage> | null = null;
  private loading: Promise<Map<string, PublicPage>> | null = null;

  async all(): Promise<Map<string, PublicPage>> {
    if (this.pages) return this.pages;
    if (!this.loading) {
      this.loading = this.client
        .get<{ pages: PublicPage[] }>(API_PATHS.PUBLIC_PAGES)
        .then((res) => {
          this.pages = new Map((res.pages || []).map((page) => [page.slug, page]));
          return this.pages;
        })
        .catch(() => new Map<string, PublicPage>());
    }
    return this.loading;
  }

  async bySlug(slug: string): Promise<PublicPage | null> {
    const pages = await this.all();
    return pages.get(slug) || null;
  }
}
