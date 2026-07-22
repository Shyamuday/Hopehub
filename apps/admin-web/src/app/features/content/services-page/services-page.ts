import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { AdminApi } from '../../../core/services/admin-api';

type ProviderTypeOption = { value: string; label: string };

type HealthService = {
  id: string;
  slug: string;
  title: string;
  shortTitle?: string | null;
  category: string;
  subCategory?: string | null;
  expertTypes: string[];
  expertTypeLabels: string[];
  summary: string;
  description?: string | null;
  priceInPaise: number;
  compareAtPriceInPaise?: number | null;
  durationMinutes?: number | null;
  imageUrl?: string | null;
  tags: string[];
  includes: string[];
  outcomes: string[];
  whoIsItFor: string[];
  howItWorks: string[];
  faqs: Array<{ question: string; answer: string }>;
  relatedDiseaseSlugs: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

type ServiceDraft = {
  slug: string;
  title: string;
  shortTitle: string;
  category: string;
  subCategory: string;
  expertTypesCsv: string;
  summary: string;
  description: string;
  priceInPaise: number;
  compareAtPriceInPaise: number | '';
  durationMinutes: number | '';
  imageUrl: string;
  tagsCsv: string;
  includesText: string;
  outcomesText: string;
  whoIsItForText: string;
  howItWorksText: string;
  faqsJson: string;
  relatedDiseaseSlugsCsv: string;
  seoTitle: string;
  seoDescription: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
};

const EMPTY_DRAFT: ServiceDraft = {
  slug: '',
  title: '',
  shortTitle: '',
  category: 'Medical Care',
  subCategory: '',
  expertTypesCsv: 'DOCTOR',
  summary: '',
  description: '',
  priceInPaise: 49900,
  compareAtPriceInPaise: '',
  durationMinutes: 30,
  imageUrl: '',
  tagsCsv: '',
  includesText: '',
  outcomesText: '',
  whoIsItForText: '',
  howItWorksText: '',
  faqsJson: '[]',
  relatedDiseaseSlugsCsv: '',
  seoTitle: '',
  seoDescription: '',
  isPublished: true,
  isFeatured: false,
  sortOrder: 0,
};

function splitCsv(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function fromService(service: HealthService): ServiceDraft {
  return {
    slug: service.slug,
    title: service.title,
    shortTitle: service.shortTitle || '',
    category: service.category,
    subCategory: service.subCategory || '',
    expertTypesCsv: service.expertTypes.join(', '),
    summary: service.summary,
    description: service.description || '',
    priceInPaise: service.priceInPaise,
    compareAtPriceInPaise: service.compareAtPriceInPaise ?? '',
    durationMinutes: service.durationMinutes ?? '',
    imageUrl: service.imageUrl || '',
    tagsCsv: service.tags.join(', '),
    includesText: service.includes.join('\n'),
    outcomesText: service.outcomes.join('\n'),
    whoIsItForText: service.whoIsItFor.join('\n'),
    howItWorksText: service.howItWorks.join('\n'),
    faqsJson: JSON.stringify(service.faqs || [], null, 2),
    relatedDiseaseSlugsCsv: service.relatedDiseaseSlugs.join(', '),
    seoTitle: service.seoTitle || '',
    seoDescription: service.seoDescription || '',
    isPublished: service.isPublished,
    isFeatured: service.isFeatured,
    sortOrder: service.sortOrder,
  };
}

@Component({
  selector: 'app-services-page',
  imports: [CommonModule],
  templateUrl: './services-page.html',
  styleUrl: '../_content-page.scss',
})
export class ServicesPage {
  readonly services = signal<HealthService[]>([]);
  readonly providerTypes = signal<ProviderTypeOption[]>([]);
  readonly providerTypeValues = computed(() =>
    this.providerTypes()
      .map((option) => option.value)
      .join(', '),
  );
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly q = signal('');
  readonly createDraft = signal<ServiceDraft>({ ...EMPTY_DRAFT });
  readonly editDraft = signal<ServiceDraft>({ ...EMPTY_DRAFT });

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.api.listHealthServices(this.q());
      this.services.set(res.services);
      this.providerTypes.set(res.providerTypes);
    } catch {
      this.error.set('Could not load services.');
    } finally {
      this.loading.set(false);
    }
  }

  updateCreate<K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) {
    this.createDraft.update((draft) => ({ ...draft, [key]: value }));
  }

  updateEdit<K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) {
    this.editDraft.update((draft) => ({ ...draft, [key]: value }));
  }

  startEdit(service: HealthService) {
    this.editingId.set(service.id);
    this.editDraft.set(fromService(service));
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editDraft.set({ ...EMPTY_DRAFT });
  }

  async create() {
    await this.saveDraft(this.createDraft(), null);
    this.createDraft.set({ ...EMPTY_DRAFT });
  }

  async update(id: string) {
    await this.saveDraft(this.editDraft(), id);
    this.cancelEdit();
  }

  async toggle(service: HealthService) {
    await this.savePartial(service.id, { isPublished: !service.isPublished });
  }

  async remove(service: HealthService) {
    if (!confirm(`Delete service "${service.title}"?`)) return;
    this.saving.set(true);
    try {
      await this.api.deleteHealthService(service.id);
      this.message.set('Service deleted.');
      await this.load();
    } catch {
      this.error.set('Could not delete service.');
    } finally {
      this.saving.set(false);
    }
  }

  private async savePartial(id: string, payload: Record<string, unknown>) {
    this.saving.set(true);
    try {
      await this.api.updateHealthService(id, payload);
      this.message.set('Service updated.');
      await this.load();
    } catch {
      this.error.set('Could not update service.');
    } finally {
      this.saving.set(false);
    }
  }

  private async saveDraft(draft: ServiceDraft, id: string | null) {
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const payload = {
        slug: draft.slug.trim(),
        title: draft.title.trim(),
        shortTitle: draft.shortTitle.trim() || null,
        category: draft.category.trim(),
        subCategory: draft.subCategory.trim() || null,
        expertTypes: splitCsv(draft.expertTypesCsv),
        summary: draft.summary.trim(),
        description: draft.description.trim() || null,
        priceInPaise: Number(draft.priceInPaise) || 0,
        compareAtPriceInPaise:
          draft.compareAtPriceInPaise === '' ? null : Number(draft.compareAtPriceInPaise),
        durationMinutes: draft.durationMinutes === '' ? null : Number(draft.durationMinutes),
        imageUrl: draft.imageUrl.trim() || null,
        tags: splitCsv(draft.tagsCsv),
        includes: splitLines(draft.includesText),
        outcomes: splitLines(draft.outcomesText),
        whoIsItFor: splitLines(draft.whoIsItForText),
        howItWorks: splitLines(draft.howItWorksText),
        faqs: JSON.parse(draft.faqsJson || '[]') as Array<{ question: string; answer: string }>,
        relatedDiseaseSlugs: splitCsv(draft.relatedDiseaseSlugsCsv),
        seoTitle: draft.seoTitle.trim() || null,
        seoDescription: draft.seoDescription.trim() || null,
        isPublished: draft.isPublished,
        isFeatured: draft.isFeatured,
        sortOrder: Number(draft.sortOrder) || 0,
      };
      if (id) {
        await this.api.updateHealthService(id, payload);
        this.message.set('Service saved.');
      } else {
        await this.api.createHealthService(payload);
        this.message.set('Service created.');
      }
      await this.load();
    } catch (error) {
      this.error.set(
        error instanceof SyntaxError ? 'FAQ JSON is invalid.' : 'Could not save service.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
