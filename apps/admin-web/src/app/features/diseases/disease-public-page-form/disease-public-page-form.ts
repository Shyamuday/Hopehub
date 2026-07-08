import { CommonModule } from '@angular/common';
import { Component, Input, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  DiseasePublicPageForm,
  emptyPublicPageForm,
  publicPageFormToPayload,
  publicPagePayloadToForm
} from './disease-public-page-form.model';

@Component({
  selector: 'app-disease-public-page-form',
  imports: [CommonModule, FormField],
  templateUrl: './disease-public-page-form.html',
  styleUrl: './disease-public-page-form.scss'
})
export class DiseasePublicPageFormComponent {
  @Input() diseaseName = '';

  readonly saved = output<DiseasePublicPageForm>();

  readonly formModel = signal(emptyPublicPageForm());
  readonly form = form(this.formModel);

  readonly listDraft = signal({ value: '' });
  readonly listDraftForm = form(this.listDraft);
  readonly faqDraft = signal({ question: '', answer: '' });
  readonly faqDraftForm = form(this.faqDraft);

  readonly listFields = [
    { key: 'symptoms', label: 'Symptoms' },
    { key: 'causes', label: 'Causes' },
    { key: 'riskFactors', label: 'Risk factors' },
    { key: 'tests', label: 'Tests' },
    { key: 'medications', label: 'Medications' },
    { key: 'homeCare', label: 'Home care' },
    { key: 'prevention', label: 'Prevention' },
    { key: 'emergencySigns', label: 'Emergency signs' },
    { key: 'stages', label: 'Care stages' },
    { key: 'references', label: 'References' },
    { key: 'careApproach', label: 'Care approach bullets' },
    { key: 'details', label: 'Detail paragraphs' },
    { key: 'ourApproachPoints', label: 'Our approach points' }
  ] as const;

  load(payload: Parameters<typeof publicPagePayloadToForm>[0]) {
    this.formModel.set(publicPagePayloadToForm(payload));
  }

  getPayload() {
    return publicPageFormToPayload(this.formModel());
  }

  emitSave() {
    this.saved.emit(this.formModel());
  }

  addListItem(field: (typeof this.listFields)[number]['key']) {
    const value = this.listDraft().value.trim();
    if (!value) return;
    const current = this.formModel();
    const items = [...(current[field] as string[]), value];
    this.formModel.set({ ...current, [field]: items });
    this.listDraft.set({ value: '' });
  }

  removeListItem(field: (typeof this.listFields)[number]['key'], index: number) {
    const current = this.formModel();
    const items = (current[field] as string[]).filter((_, i) => i !== index);
    this.formModel.set({ ...current, [field]: items });
  }

  addFaq() {
    const { question, answer } = this.faqDraft();
    if (!question.trim() || !answer.trim()) return;
    const current = this.formModel();
    this.formModel.set({
      ...current,
      publicFaq: [...current.publicFaq, { question: question.trim(), answer: answer.trim() }]
    });
    this.faqDraft.set({ question: '', answer: '' });
  }

  removeFaq(index: number) {
    const current = this.formModel();
    this.formModel.set({
      ...current,
      publicFaq: current.publicFaq.filter((_, i) => i !== index)
    });
  }
}
