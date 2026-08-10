import { CommonModule } from '@angular/common';
import { Component, inject, signal, viewChild } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  DiseaseCatalogService,
  type DiseaseListItem,
} from '../../core/services/disease-catalog.service';
import { DoctorSessionService } from '../../core/services/doctor-session';
import { DiseasePublicPageFormComponent } from './disease-public-page-form/disease-public-page-form';
import { publicPageFormToPayload } from './disease-public-page-form/disease-public-page-form.model';

@Component({
  selector: 'app-disease-pages-page',
  imports: [CommonModule, FormField, DiseasePublicPageFormComponent],
  templateUrl: './disease-pages-page.html',
  styleUrl: './disease-pages-page.scss',
})
export class DiseasePagesPage {
  private readonly catalog = inject(DiseaseCatalogService);
  private readonly session = inject(DoctorSessionService);
  private readonly publicPageForm = viewChild(DiseasePublicPageFormComponent);

  readonly diseases = signal<DiseaseListItem[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly pageLoading = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly canManageTreatmentPages = signal(false);

  readonly filterModel = signal({ q: '' });
  readonly filterForm = form(this.filterModel);

  readonly editingId = signal('');
  readonly editingName = signal('');

  constructor() {
    void this.init();
  }

  private async init() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.session.load();
      if (!this.session.capabilities().treatmentPages) {
        this.canManageTreatmentPages.set(false);
        this.error.set('Treatment page editing is available only for homeopathy providers.');
        return;
      }
      this.canManageTreatmentPages.set(true);
      await this.load();
    } catch {
      this.error.set('Could not load provider access.');
    } finally {
      this.loading.set(false);
    }
  }

  async load() {
    if (!this.canManageTreatmentPages()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const q = this.filterModel().q.trim();
      const response = await this.catalog.loadDiseases({ q: q || undefined, grouped: false });
      this.diseases.set(response.diseases || []);
    } catch {
      this.error.set('Could not load diseases.');
    } finally {
      this.loading.set(false);
    }
  }

  async startEdit(disease: DiseaseListItem) {
    if (!this.canManageTreatmentPages()) return;
    this.editingId.set(disease.id);
    this.editingName.set(disease.name);
    this.pageLoading.set(true);
    this.error.set('');
    try {
      const payload = await this.catalog.getPublicPage(disease.id);
      queueMicrotask(() => this.publicPageForm()?.load(payload));
    } catch {
      this.error.set('Could not load treatment page content.');
    } finally {
      this.pageLoading.set(false);
    }
  }

  cancelEdit() {
    this.editingId.set('');
    this.editingName.set('');
  }

  async save() {
    if (!this.canManageTreatmentPages()) return;
    const editor = this.publicPageForm();
    const id = this.editingId();
    if (!editor || !id) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.catalog.updatePublicPage(id, publicPageFormToPayload(editor.formModel()));
      this.message.set('Treatment page saved.');
      this.cancelEdit();
      setTimeout(() => this.message.set(''), 3000);
    } catch {
      this.error.set('Could not save treatment page.');
    } finally {
      this.saving.set(false);
    }
  }
}
