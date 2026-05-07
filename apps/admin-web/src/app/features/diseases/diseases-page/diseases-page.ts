import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';

type Disease = {
  id: string;
  name: string;
  description: string;
  feeInPaise: number;
  isActive: boolean;
  intakeQuestions: string[];
};

@Component({
  selector: 'app-diseases-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './diseases-page.html',
  styleUrl: './diseases-page.scss'
})
export class DiseasesPage {
  diseases: Disease[] = [];
  loading = false;
  error = '';

  editingId = '';
  draft: { name: string; description: string; feeInPaise: number; isActive: boolean; intakeQuestions: string[] } = this.emptyDraft();
  draftNewQuestion = '';
  saving = false;
  saveError = '';

  showCreateForm = false;
  newDisease: { name: string; description: string; feeInPaise: number; intakeQuestions: string[] } = this.emptyNew();
  newDiseaseQuestion = '';
  creating = false;
  createError = '';

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  private emptyDraft() {
    return { name: '', description: '', feeInPaise: 0, isActive: true, intakeQuestions: [] as string[] };
  }

  private emptyNew() {
    return { name: '', description: '', feeInPaise: 0, intakeQuestions: [] as string[] };
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const res = await this.api.getDiseases();
      this.diseases = res.diseases || [];
    } catch {
      this.error = 'Could not load diseases.';
    } finally {
      this.loading = false;
    }
  }

  startEdit(disease: Disease) {
    this.editingId = disease.id;
    this.draft = {
      name: disease.name,
      description: disease.description,
      feeInPaise: disease.feeInPaise,
      isActive: disease.isActive,
      intakeQuestions: [...disease.intakeQuestions]
    };
    this.draftNewQuestion = '';
    this.saveError = '';
  }

  cancelEdit() {
    this.editingId = '';
    this.draft = this.emptyDraft();
    this.draftNewQuestion = '';
    this.saveError = '';
  }

  addDraftQuestion() {
    const q = this.draftNewQuestion.trim();
    if (!q) return;
    this.draft.intakeQuestions = [...this.draft.intakeQuestions, q];
    this.draftNewQuestion = '';
  }

  removeDraftQuestion(index: number) {
    this.draft.intakeQuestions = this.draft.intakeQuestions.filter((_, i) => i !== index);
  }

  async saveEdit() {
    if (!this.editingId || !this.draft.name || !this.draft.description || !this.draft.feeInPaise) return;
    this.saving = true;
    this.saveError = '';
    try {
      await this.api.updateDisease(this.editingId, {
        ...this.draft,
        feeInPaise: Number(this.draft.feeInPaise)
      });
      await this.load();
      this.cancelEdit();
    } catch {
      this.saveError = 'Could not save. Please try again.';
    } finally {
      this.saving = false;
    }
  }

  addNewQuestion() {
    const q = this.newDiseaseQuestion.trim();
    if (!q) return;
    this.newDisease.intakeQuestions = [...this.newDisease.intakeQuestions, q];
    this.newDiseaseQuestion = '';
  }

  removeNewQuestion(index: number) {
    this.newDisease.intakeQuestions = this.newDisease.intakeQuestions.filter((_, i) => i !== index);
  }

  async createDisease() {
    if (!this.newDisease.name || !this.newDisease.description || !this.newDisease.feeInPaise || !this.newDisease.intakeQuestions.length) {
      this.createError = 'Fill all fields and add at least one intake question.';
      return;
    }
    this.creating = true;
    this.createError = '';
    try {
      await this.api.createDisease({
        ...this.newDisease,
        feeInPaise: Number(this.newDisease.feeInPaise)
      });
      this.newDisease = this.emptyNew();
      this.newDiseaseQuestion = '';
      this.showCreateForm = false;
      await this.load();
    } catch {
      this.createError = 'Could not create disease. Please try again.';
    } finally {
      this.creating = false;
    }
  }

  feeToCurrency(paise: number) {
    return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  }
}
