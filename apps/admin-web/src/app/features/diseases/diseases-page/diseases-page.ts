import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';
import { ROUTE_PATHS, adminRouteLink } from '../../../core/constants/app-routes.constants';
import { CURRENCY_CODE, CURRENCY_LOCALE, PAISE_PER_RUPEE } from '../../../shared/constants/currency.constants';

type Disease = {
  id: string;
  name: string;
  description: string;
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

function emptyDraft() {
  return {
    name: '',
    description: '',
    feeRupees: 500,
    isActive: true,
    publicCategory: 'miscellaneous',
    intakeQuestions: [] as string[]
  };
}

function emptyNew() {
  return {
    name: '',
    description: '',
    feeRupees: 500,
    publicCategory: 'miscellaneous',
    intakeQuestions: [] as string[]
  };
}

@Component({
  selector: 'app-diseases-page',
  imports: [CommonModule, NgTemplateOutlet, FormField, RouterLink],
  templateUrl: './diseases-page.html',
  styleUrl: './diseases-page.scss'
})
export class DiseasesPage {
  readonly ratesLink = adminRouteLink(ROUTE_PATHS.RATES);

  readonly diseases = signal<Disease[]>([]);
  readonly groupedCategories = signal<GroupedCategory[]>([]);
  readonly uncategorized = signal<Disease[]>([]);
  readonly categoryOptions = signal<DiseaseCategory[]>([]);
  readonly loading = signal(false);
  readonly syncing = signal(false);
  readonly error = signal('');
  readonly syncMessage = signal('');

  readonly filterModel = signal({ q: '', category: '' });
  readonly filterForm = form(this.filterModel);

  readonly totalCount = computed(() => this.diseases().length);

  editingId = '';
  readonly draftModel = signal(emptyDraft());
  readonly draftForm = form(this.draftModel);
  readonly draftQuestionModel = signal({ value: '' });
  readonly draftQuestionForm = form(this.draftQuestionModel);
  readonly saving = signal(false);
  saveError = '';

  showCreateForm = false;
  readonly newDiseaseModel = signal(emptyNew());
  readonly newDiseaseForm = form(this.newDiseaseModel);
  readonly newQuestionModel = signal({ value: '' });
  readonly newQuestionForm = form(this.newQuestionModel);
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
        grouped: true
      });
      this.diseases.set(res.diseases || []);
      this.groupedCategories.set(
        (res.categories || []).map((group) => ({
          key: group.key,
          label: group.label,
          diseases: group.diseases as Disease[]
        }))
      );
      this.uncategorized.set((res.uncategorized || []) as Disease[]);
    } catch {
      this.error.set('Could not load diseases.');
    } finally {
      this.loading.set(false);
    }
  }

  async syncCatalog() {
    if (!confirm('Import the standard disease catalog? Existing diseases are kept; only missing names are added.')) {
      return;
    }
    this.syncing.set(true);
    this.syncMessage.set('');
    this.error.set('');
    try {
      const result = await this.api.syncDiseaseCatalog(50_000);
      this.syncMessage.set(`Catalog synced: ${result.created} added, ${result.categorized} categorized, ${result.total} total.`);
      await this.load();
    } catch {
      this.error.set('Could not sync disease catalog.');
    } finally {
      this.syncing.set(false);
    }
  }

  startEdit(disease: Disease) {
    this.editingId = disease.id;
    this.draftModel.set({
      name: disease.name,
      description: disease.description,
      feeRupees: Math.round(disease.feeInPaise / PAISE_PER_RUPEE),
      isActive: disease.isActive,
      publicCategory: disease.publicCategory || 'miscellaneous',
      intakeQuestions: [...disease.intakeQuestions]
    });
    this.draftQuestionModel.set({ value: '' });
    this.saveError = '';
  }

  cancelEdit() {
    this.editingId = '';
    this.draftModel.set(emptyDraft());
    this.draftQuestionModel.set({ value: '' });
    this.saveError = '';
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
      intakeQuestions: draft.intakeQuestions.filter((_, i) => i !== index)
    });
  }

  async saveEdit() {
    const draft = this.draftModel();
    if (!this.editingId || !draft.name || !draft.description || !draft.feeRupees) return;
    this.saving.set(true);
    this.saveError = '';
    try {
      await this.api.updateDisease(this.editingId, {
        name: draft.name,
        description: draft.description,
        feeInPaise: Math.round(Number(draft.feeRupees) * PAISE_PER_RUPEE),
        isActive: draft.isActive,
        publicCategory: draft.publicCategory,
        intakeQuestions: draft.intakeQuestions
      });
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
    this.newDiseaseModel.set({ ...newDisease, intakeQuestions: [...newDisease.intakeQuestions, q] });
    this.newQuestionModel.set({ value: '' });
  }

  removeNewQuestion(index: number) {
    const newDisease = this.newDiseaseModel();
    this.newDiseaseModel.set({
      ...newDisease,
      intakeQuestions: newDisease.intakeQuestions.filter((_, i) => i !== index)
    });
  }

  async createDisease() {
    const newDisease = this.newDiseaseModel();
    if (!newDisease.name || !newDisease.description || !newDisease.feeRupees || !newDisease.intakeQuestions.length) {
      this.createError = 'Fill all fields and add at least one intake question.';
      return;
    }
    this.creating.set(true);
    this.createError = '';
    try {
      await this.api.createDisease({
        name: newDisease.name,
        description: newDisease.description,
        feeInPaise: Math.round(Number(newDisease.feeRupees) * PAISE_PER_RUPEE),
        publicCategory: newDisease.publicCategory,
        intakeQuestions: newDisease.intakeQuestions
      });
      this.newDiseaseModel.set(emptyNew());
      this.newQuestionModel.set({ value: '' });
      this.showCreateForm = false;
      await this.load();
    } catch {
      this.createError = 'Could not create disease. Please try again.';
    } finally {
      this.creating.set(false);
    }
  }

  feeToCurrency(paise: number) {
    return (paise / PAISE_PER_RUPEE).toLocaleString(CURRENCY_LOCALE, {
      style: 'currency',
      currency: CURRENCY_CODE,
      maximumFractionDigits: 0
    });
  }
}
