import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';
import { ROUTE_PATHS, adminRouteLink } from '../../../core/constants/app-routes.constants';
import {
  CURRENCY_CODE,
  CURRENCY_LOCALE,
  PAISE_PER_RUPEE,
} from '../../../shared/constants/currency.constants';
import { ViewportService } from '@hopehub/platform-ui';
import { DiseasePublicPageFormComponent } from '../disease-public-page-form/disease-public-page-form';
import { publicPageFormToPayload } from '../disease-public-page-form/disease-public-page-form.model';

type DiseaseFaqItem = { question: string; answer: string };

type Disease = {
  id: string;
  name: string;
  slug?: string | null;
  description: string;
  publicDescription?: string | null;
  publicImageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publicFaq?: DiseaseFaqItem[];
  feeInPaise: number;
  isActive: boolean;
  intakeQuestions: string[];
  publicCategory: string | null;
};

type DiseaseCategory = {
  key: string;
  label: string;
};

type GroupedCategory = DiseaseCategory & {
  diseases: Disease[];
};

type DiseaseMarketingDraft = {
  slug: string;
  publicImageUrl: string;
  seoTitle: string;
  seoDescription: string;
  publicFaq: DiseaseFaqItem[];
};

function emptyMarketingDraft(): DiseaseMarketingDraft {
  return { slug: '', publicImageUrl: '', seoTitle: '', seoDescription: '', publicFaq: [] };
}

function emptyDraft() {
  return {
    name: '',
    description: '',
    publicDescription: '',
    feeRupees: 500,
    isActive: true,
    publicCategory: 'miscellaneous',
    intakeQuestions: [] as string[],
    ...emptyMarketingDraft(),
  };
}

function emptyNew() {
  return {
    name: '',
    description: '',
    publicDescription: '',
    feeRupees: 500,
    publicCategory: 'miscellaneous',
    intakeQuestions: [] as string[],
    ...emptyMarketingDraft(),
  };
}

@Component({
  selector: 'app-diseases-page',
  imports: [CommonModule, NgTemplateOutlet, FormField, RouterLink, DiseasePublicPageFormComponent],
  templateUrl: './diseases-page.html',
  styleUrl: './diseases-page.scss',
})
export class DiseasesPage {
  private readonly viewport = inject(ViewportService);
  private readonly publicPageForm = viewChild(DiseasePublicPageFormComponent);

  readonly isMobile = computed(() => this.viewport.isMobile());
  readonly ratesLink = adminRouteLink(ROUTE_PATHS.RATES);

  readonly diseases = signal<Disease[]>([]);
  readonly groupedCategories = signal<GroupedCategory[]>([]);
  readonly uncategorized = signal<Disease[]>([]);
  readonly categoryOptions = signal<DiseaseCategory[]>([]);
  readonly loading = signal(false);
  readonly syncing = signal(false);
  readonly reconciling = signal(false);
  readonly error = signal('');
  readonly syncMessage = signal('');

  readonly filterModel = signal({ q: '', category: '' });
  readonly filterForm = form(this.filterModel);

  readonly totalCount = computed(() => this.diseases().length);

  editingId = '';
  readonly editTab = signal<'clinical' | 'public'>('clinical');
  readonly publicPageLoading = signal(false);
  readonly savingPublicPage = signal(false);
  publicPageSaveError = '';
  readonly draftModel = signal(emptyDraft());
  readonly draftForm = form(this.draftModel);
  readonly draftQuestionModel = signal({ value: '' });
  readonly draftQuestionForm = form(this.draftQuestionModel);
  readonly draftFaqModel = signal({ question: '', answer: '' });
  readonly draftFaqForm = form(this.draftFaqModel);
  readonly saving = signal(false);
  saveError = '';

  showCreateForm = false;
  readonly newDiseaseModel = signal(emptyNew());
  readonly newDiseaseForm = form(this.newDiseaseModel);
  readonly newQuestionModel = signal({ value: '' });
  readonly newQuestionForm = form(this.newQuestionModel);
  readonly newFaqModel = signal({ question: '', answer: '' });
  readonly newFaqForm = form(this.newFaqModel);
  readonly creating = signal(false);
  createError = '';

  constructor(private readonly api: AdminApi) {
    void this.bootstrap();
  }

  async bootstrap() {
    try {
      const categoriesRes = await this.api.getDiseaseCategories();
      this.categoryOptions.set(categoriesRes.categories);
    } catch {
      this.categoryOptions.set([]);
    }
    await this.load();
  }

  categoryLabel(key: string | null | undefined) {
    if (!key) return 'Other';
    return this.categoryOptions().find((item) => item.key === key)?.label ?? key;
  }

  diseaseById(id: string) {
    return this.diseases().find((item) => item.id === id);
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const filters = this.filterModel();
      const res = await this.api.getDiseases({
        q: filters.q,
        category: filters.category || undefined,
        grouped: true,
      });
      this.diseases.set(res.diseases || []);
      this.groupedCategories.set(
        (res.categories || []).map((group) => ({
          key: group.key,
          label: group.label,
          diseases: group.diseases as Disease[],
        })),
      );
      this.uncategorized.set((res.uncategorized || []) as Disease[]);
    } catch {
      this.error.set('Could not load diseases.');
    } finally {
      this.loading.set(false);
    }
  }

  async syncCatalog() {
    if (
      !confirm(
        'Import the standard disease catalog? Existing diseases are kept; only missing names are added.',
      )
    ) {
      return;
    }
    this.syncing.set(true);
    this.syncMessage.set('');
    this.error.set('');
    try {
      const result = await this.api.syncDiseaseCatalog(50_000);
      this.syncMessage.set(
        `Catalog synced: ${result.created} added, ${result.categorized} categorized, ${result.total} total.`,
      );
      await this.load();
    } catch {
      this.error.set('Could not sync disease catalog.');
    } finally {
      this.syncing.set(false);
    }
  }

  async reconcileOptions() {
    if (!confirm('Sync prescription diagnosis options from the disease catalog?')) {
      return;
    }
    this.reconciling.set(true);
    this.syncMessage.set('');
    this.error.set('');
    try {
      const result = await this.api.reconcileDiseaseOptions();
      this.syncMessage.set(`Diagnosis options reconciled for ${result.synced} diseases.`);
    } catch {
      this.error.set('Could not reconcile diagnosis options.');
    } finally {
      this.reconciling.set(false);
    }
  }

  startEdit(disease: Disease) {
    this.editingId = disease.id;
    this.editTab.set('clinical');
    this.draftModel.set({
      name: disease.name,
      description: disease.description,
      publicDescription: disease.publicDescription || '',
      feeRupees: Math.round(disease.feeInPaise / PAISE_PER_RUPEE),
      isActive: disease.isActive,
      publicCategory: disease.publicCategory || 'miscellaneous',
      intakeQuestions: [...disease.intakeQuestions],
      slug: disease.slug || '',
      publicImageUrl: disease.publicImageUrl || '',
      seoTitle: disease.seoTitle || '',
      seoDescription: disease.seoDescription || '',
      publicFaq: [...(disease.publicFaq || [])],
    });
    this.draftQuestionModel.set({ value: '' });
    this.draftFaqModel.set({ question: '', answer: '' });
    this.saveError = '';
    void this.loadPublicPageForm(disease.id);
  }

  setEditTab(tab: 'clinical' | 'public') {
    this.editTab.set(tab);
    if (tab === 'public' && this.editingId) {
      void this.loadPublicPageForm(this.editingId);
    }
  }

  private async loadPublicPageForm(diseaseId: string) {
    this.publicPageLoading.set(true);
    this.publicPageSaveError = '';
    try {
      const payload = await this.api.getDiseasePublicPage(diseaseId);
      queueMicrotask(() => this.publicPageForm()?.load(payload));
    } catch {
      this.publicPageSaveError = 'Could not load public page content.';
    } finally {
      this.publicPageLoading.set(false);
    }
  }

  async savePublicPage() {
    const editor = this.publicPageForm();
    if (!editor || !this.editingId) return;
    this.savingPublicPage.set(true);
    this.publicPageSaveError = '';
    try {
      await this.api.updateDiseasePublicPage(
        this.editingId,
        publicPageFormToPayload(editor.formModel()),
      );
      this.syncMessage.set('Public treatment page saved.');
      await this.load();
    } catch {
      this.publicPageSaveError = 'Could not save public page.';
    } finally {
      this.savingPublicPage.set(false);
    }
  }

  cancelEdit() {
    this.editingId = '';
    this.editTab.set('clinical');
    this.draftModel.set(emptyDraft());
    this.draftQuestionModel.set({ value: '' });
    this.draftFaqModel.set({ question: '', answer: '' });
    this.saveError = '';
  }

  hideCategoryOnMobile(diseases: Disease[]) {
    return this.isMobile() && !!this.editingId && !diseases.some((d) => d.id === this.editingId);
  }

  hideDiseaseCardOnMobile(diseaseId: string) {
    return this.isMobile() && !!this.editingId && this.editingId !== diseaseId;
  }

  addDraftQuestion() {
    const q = this.draftQuestionModel().value.trim();
    if (!q) return;
    const draft = this.draftModel();
    this.draftModel.set({ ...draft, intakeQuestions: [...draft.intakeQuestions, q] });
    this.draftQuestionModel.set({ value: '' });
  }

  removeDraftQuestion(index: number) {
    const draft = this.draftModel();
    this.draftModel.set({
      ...draft,
      intakeQuestions: draft.intakeQuestions.filter((_, i) => i !== index),
    });
  }

  addDraftFaq() {
    const { question, answer } = this.draftFaqModel();
    if (!question.trim() || !answer.trim()) return;
    const draft = this.draftModel();
    this.draftModel.set({
      ...draft,
      publicFaq: [...draft.publicFaq, { question: question.trim(), answer: answer.trim() }],
    });
    this.draftFaqModel.set({ question: '', answer: '' });
  }

  removeDraftFaq(index: number) {
    const draft = this.draftModel();
    this.draftModel.set({
      ...draft,
      publicFaq: draft.publicFaq.filter((_, i) => i !== index),
    });
  }

  async saveEdit() {
    const draft = this.draftModel();
    if (!this.editingId || !draft.name || !draft.description || !draft.feeRupees) return;
    this.saving.set(true);
    this.saveError = '';
    try {
      await this.api.updateDisease(this.editingId, this.toApiPayload(draft));
      await this.load();
      this.cancelEdit();
    } catch {
      this.saveError = 'Could not save. Please try again.';
    } finally {
      this.saving.set(false);
    }
  }

  addNewQuestion() {
    const q = this.newQuestionModel().value.trim();
    if (!q) return;
    const newDisease = this.newDiseaseModel();
    this.newDiseaseModel.set({
      ...newDisease,
      intakeQuestions: [...newDisease.intakeQuestions, q],
    });
    this.newQuestionModel.set({ value: '' });
  }

  removeNewQuestion(index: number) {
    const newDisease = this.newDiseaseModel();
    this.newDiseaseModel.set({
      ...newDisease,
      intakeQuestions: newDisease.intakeQuestions.filter((_, i) => i !== index),
    });
  }

  addNewFaq() {
    const { question, answer } = this.newFaqModel();
    if (!question.trim() || !answer.trim()) return;
    const newDisease = this.newDiseaseModel();
    this.newDiseaseModel.set({
      ...newDisease,
      publicFaq: [...newDisease.publicFaq, { question: question.trim(), answer: answer.trim() }],
    });
    this.newFaqModel.set({ question: '', answer: '' });
  }

  removeNewFaq(index: number) {
    const newDisease = this.newDiseaseModel();
    this.newDiseaseModel.set({
      ...newDisease,
      publicFaq: newDisease.publicFaq.filter((_, i) => i !== index),
    });
  }

  async createDisease() {
    const newDisease = this.newDiseaseModel();
    if (
      !newDisease.name ||
      !newDisease.description ||
      !newDisease.feeRupees ||
      !newDisease.intakeQuestions.length
    ) {
      this.createError = 'Fill all fields and add at least one intake question.';
      return;
    }
    this.creating.set(true);
    this.createError = '';
    try {
      await this.api.createDisease(this.toCreatePayload(newDisease));
      this.newDiseaseModel.set(emptyNew());
      this.newQuestionModel.set({ value: '' });
      this.newFaqModel.set({ question: '', answer: '' });
      this.showCreateForm = false;
      await this.load();
    } catch {
      this.createError = 'Could not create disease. Please try again.';
    } finally {
      this.creating.set(false);
    }
  }

  private toApiPayload(draft: ReturnType<typeof emptyDraft>) {
    return {
      name: draft.name,
      description: draft.description,
      publicDescription: draft.publicDescription.trim() || null,
      slug: draft.slug.trim() || null,
      publicImageUrl: draft.publicImageUrl.trim() || null,
      seoTitle: draft.seoTitle.trim() || null,
      seoDescription: draft.seoDescription.trim() || null,
      publicFaq: draft.publicFaq,
      feeInPaise: Math.round(Number(draft.feeRupees) * PAISE_PER_RUPEE),
      isActive: draft.isActive,
      publicCategory: draft.publicCategory,
      intakeQuestions: draft.intakeQuestions,
    };
  }

  private toCreatePayload(draft: ReturnType<typeof emptyNew>) {
    return {
      name: draft.name,
      description: draft.description,
      publicDescription: draft.publicDescription.trim() || null,
      slug: draft.slug.trim() || null,
      publicImageUrl: draft.publicImageUrl.trim() || null,
      seoTitle: draft.seoTitle.trim() || null,
      seoDescription: draft.seoDescription.trim() || null,
      publicFaq: draft.publicFaq,
      feeInPaise: Math.round(Number(draft.feeRupees) * PAISE_PER_RUPEE),
      publicCategory: draft.publicCategory,
      intakeQuestions: draft.intakeQuestions,
    };
  }

  feeToCurrency(paise: number) {
    return (paise / PAISE_PER_RUPEE).toLocaleString(CURRENCY_LOCALE, {
      style: 'currency',
      currency: CURRENCY_CODE,
      maximumFractionDigits: 0,
    });
  }
}
