import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/services/admin-api';

type ListenerScreeningOptionForm = {
  id: string;
  text: string;
};

type ListenerScreeningQuestionForm = {
  id: string;
  text: string;
  correctOptionId: string;
  options: ListenerScreeningOptionForm[];
};

type ListenerScreeningSetForm = {
  id: string;
  title: string;
  version: string;
  description: string;
  passScore: number;
  isActive: boolean;
  questions: ListenerScreeningQuestionForm[];
};

@Component({
  selector: 'app-listener-screening-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './listener-screening-page.html',
  styleUrl: './listener-screening-page.scss',
})
export class ListenerScreeningPage implements OnInit {
  private readonly api = inject(AdminApi);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly toast = signal('');
  readonly error = signal('');
  readonly questionSets = signal<any[]>([]);
  readonly form = signal<ListenerScreeningSetForm>(this.emptyForm());

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.api.listListenerScreeningQuestionSets();
      this.questionSets.set(response.questionSets || []);
      const current =
        response.questionSets?.find((set: any) => set.isActive) ?? response.questionSets?.[0];
      if (current && !this.form().id) this.edit(current);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not load listener tests.');
    } finally {
      this.loading.set(false);
    }
  }

  edit(questionSet: any): void {
    this.form.set({
      id: questionSet.id,
      title: questionSet.title || 'Listener screening test',
      version: questionSet.version || this.nextVersion(),
      description: questionSet.description || '',
      passScore: Number(questionSet.passScore || 16),
      isActive: Boolean(questionSet.isActive),
      questions: (questionSet.questions || []).map((question: any) => ({
        id: question.id,
        text: question.text,
        correctOptionId: question.correctOptionId,
        options: (question.options || []).map((option: any) => ({
          id: option.id,
          text: option.text,
        })),
      })),
    });
  }

  newDraft(): void {
    this.form.set(this.emptyForm());
  }

  duplicateAsDraft(questionSet: any): void {
    this.edit({
      ...questionSet,
      id: '',
      isActive: false,
      version: this.nextVersion(),
    });
  }

  addQuestion(): void {
    const current = this.form();
    const number = current.questions.length + 1;
    current.questions.push({
      id: `listener-question-${number}`,
      text: '',
      correctOptionId: 'option-a',
      options: [
        { id: 'option-a', text: '' },
        { id: 'option-b', text: '' },
        { id: 'option-c', text: '' },
      ],
    });
    this.form.set({ ...current });
  }

  removeQuestion(index: number): void {
    const current = this.form();
    current.questions.splice(index, 1);
    this.form.set({ ...current });
  }

  addOption(question: ListenerScreeningQuestionForm): void {
    if (question.options.length >= 6) return;
    const next = String.fromCharCode(97 + question.options.length);
    question.options.push({ id: `option-${next}`, text: '' });
    this.form.set({ ...this.form() });
  }

  removeOption(question: ListenerScreeningQuestionForm, optionIndex: number): void {
    if (question.options.length <= 2) return;
    const removed = question.options.splice(optionIndex, 1)[0];
    if (removed?.id === question.correctOptionId) {
      question.correctOptionId = question.options[0]?.id || '';
    }
    this.form.set({ ...this.form() });
  }

  async save(): Promise<void> {
    const validationMessage = this.validateForm();
    if (validationMessage) {
      this.error.set(validationMessage);
      return;
    }

    this.saving.set(true);
    this.error.set('');
    try {
      const current = this.form();
      const payload = {
        title: current.title.trim(),
        version: current.version.trim(),
        description: current.description.trim() || null,
        passScore: Number(current.passScore),
        isActive: Boolean(current.isActive),
        questions: current.questions.map((question) => ({
          id: question.id.trim(),
          text: question.text.trim(),
          correctOptionId: question.correctOptionId.trim(),
          options: question.options.map((option) => ({
            id: option.id.trim(),
            text: option.text.trim(),
          })),
        })),
      };

      const response = current.id
        ? await this.api.updateListenerScreeningQuestionSet(current.id, payload)
        : await this.api.createListenerScreeningQuestionSet(payload);

      this.toast.set(
        current.isActive ? 'Listener test saved and published.' : 'Listener test saved.',
      );
      this.edit(response.questionSet);
      await this.load();
    } catch (error: any) {
      this.error.set(
        error?.error?.errors?.join(' ') ||
          error?.error?.message ||
          error?.message ||
          'Could not save listener test.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  async publish(questionSet = this.form()): Promise<void> {
    if (!questionSet.id) {
      this.error.set('Save this listener test before publishing.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const response = await this.api.publishListenerScreeningQuestionSet(questionSet.id);
      this.toast.set('Listener test published.');
      this.edit(response.questionSet);
      await this.load();
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.message || 'Could not publish listener test.');
    } finally {
      this.saving.set(false);
    }
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Draft';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Draft';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private validateForm(): string {
    const current = this.form();
    if (!current.title.trim()) return 'Title is required.';
    if (!current.version.trim()) return 'Version is required.';
    if (!current.questions.length) return 'Add at least one question.';
    if (Number(current.passScore) < 1 || Number(current.passScore) > current.questions.length) {
      return 'Pass score must be between 1 and total questions.';
    }

    const questionIds = new Set<string>();
    for (const [index, question] of current.questions.entries()) {
      if (!question.id.trim()) return `Question ${index + 1} needs an id.`;
      if (questionIds.has(question.id.trim())) return `Question id "${question.id}" is duplicated.`;
      questionIds.add(question.id.trim());
      if (!question.text.trim()) return `Question ${index + 1} needs text.`;
      if (question.options.length < 2) return `Question ${index + 1} needs at least 2 options.`;
      const optionIds = new Set(question.options.map((option) => option.id.trim()));
      if (optionIds.size !== question.options.length) {
        return `Question ${index + 1} has duplicate option ids.`;
      }
      if (!optionIds.has(question.correctOptionId.trim())) {
        return `Question ${index + 1} correct option must match an option id.`;
      }
      if (question.options.some((option) => !option.id.trim() || !option.text.trim())) {
        return `Question ${index + 1} has an empty option.`;
      }
    }
    return '';
  }

  private emptyForm(): ListenerScreeningSetForm {
    return {
      id: '',
      title: 'Listener screening test',
      version: this.nextVersion(),
      description:
        'Safety, boundaries, confidentiality, escalation, and active listening screening for emotional support listeners.',
      passScore: 16,
      isActive: false,
      questions: [],
    };
  }

  private nextVersion(): string {
    return `listener-screening-${new Date().toISOString().slice(0, 10)}`;
  }
}
