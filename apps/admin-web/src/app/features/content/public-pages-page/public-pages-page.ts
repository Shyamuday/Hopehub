import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';

type PublicPage = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  content?: Record<string, unknown> | null;
  seo?: Record<string, unknown> | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sortOrder: number;
  updatedAt: string;
};

type PageDraft = {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  ogImage: string;
  contentJson: string;
};

const EMPTY_DRAFT: PageDraft = {
  slug: '',
  title: '',
  subtitle: '',
  summary: '',
  status: 'DRAFT',
  sortOrder: 0,
  seoTitle: '',
  seoDescription: '',
  canonicalPath: '',
  ogImage: '',
  contentJson: '{}',
};

@Component({
  selector: 'app-public-pages-page',
  imports: [CommonModule, FormField],
  templateUrl: './public-pages-page.html',
  styleUrl: './public-pages-page.scss',
})
export class PublicPagesPage {
  readonly pages = signal<PublicPage[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly error = signal('');
  readonly message = signal('');

  readonly createModel = signal<PageDraft>({ ...EMPTY_DRAFT });
  readonly createForm = form(this.createModel);
  readonly editModel = signal<PageDraft>({ ...EMPTY_DRAFT });
  readonly editForm = form(this.editModel);

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.api.listPublicPages();
      this.pages.set(res.pages);
    } catch {
      this.error.set('Could not load public pages.');
    } finally {
      this.loading.set(false);
    }
  }

  async seed() {
    this.saving.set(true);
    this.message.set('');
    try {
      const result = await this.api.seedPublicPages();
      this.message.set(`Seed complete: ${result.created} created, ${result.updated} updated.`);
      await this.load();
    } catch {
      this.error.set('Could not seed public pages.');
    } finally {
      this.saving.set(false);
    }
  }

  startEdit(page: PublicPage) {
    this.editingId.set(page.id);
    const seo = page.seo || {};
    this.editModel.set({
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle || '',
      summary: page.summary || '',
      status: page.status,
      sortOrder: page.sortOrder,
      seoTitle: (seo['seoTitle'] as string) || '',
      seoDescription: (seo['seoDescription'] as string) || '',
      canonicalPath: (seo['canonicalPath'] as string) || '',
      ogImage: (seo['ogImage'] as string) || '',
      contentJson: JSON.stringify(page.content || {}, null, 2),
    });
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editModel.set({ ...EMPTY_DRAFT });
  }

  async create() {
    await this.saveDraft(this.createModel(), null);
    this.createModel.set({ ...EMPTY_DRAFT });
  }

  async update(id: string) {
    await this.saveDraft(this.editModel(), id);
    this.cancelEdit();
  }

  async delete(page: PublicPage) {
    if (!confirm(`Delete public page "${page.slug}"?`)) return;
    this.saving.set(true);
    try {
      await this.api.deletePublicPage(page.id);
      this.message.set(`"${page.slug}" deleted.`);
      await this.load();
    } catch {
      this.error.set('Could not delete public page.');
    } finally {
      this.saving.set(false);
    }
  }

  private async saveDraft(draft: PageDraft, id: string | null) {
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const content = JSON.parse(draft.contentJson || '{}') as Record<string, unknown>;
      const payload = {
        slug: draft.slug.trim(),
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim() || null,
        summary: draft.summary.trim() || null,
        status: draft.status,
        sortOrder: Number(draft.sortOrder) || 0,
        content,
        seo: {
          seoTitle: draft.seoTitle.trim() || undefined,
          seoDescription: draft.seoDescription.trim() || undefined,
          canonicalPath: draft.canonicalPath.trim() || undefined,
          ogImage: draft.ogImage.trim() || undefined,
        },
      };
      if (id) {
        await this.api.updatePublicPage(id, payload);
        this.message.set(`"${payload.slug}" saved.`);
      } else {
        await this.api.createPublicPage(payload);
        this.message.set(`"${payload.slug}" created.`);
      }
      await this.load();
    } catch (error) {
      this.error.set(
        error instanceof SyntaxError ? 'Content JSON is invalid.' : 'Could not save public page.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
