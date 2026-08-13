import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';
import { AdminCanDirective } from '../../../core/directives/admin-can.directive';
import { ADMIN_PERMISSIONS } from '../../../core/admin-permissions';

type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  category: string;
  isPublished: boolean;
  sortOrder?: number | null;
};

function emptyModel() {
  return {
    question: '',
    answer: '',
    category: 'General',
    isPublished: true,
    sortOrder: '' as number | '',
  };
}

@Component({
  selector: 'app-faq-page',
  imports: [CommonModule, FormField, AdminCanDirective],
  templateUrl: './faq-page.html',
  styleUrl: './faq-page.scss',
})
export class FaqPage {
  readonly managePermissions = [
    ADMIN_PERMISSIONS.CATALOG_WRITE,
    ADMIN_PERMISSIONS.HR_WRITE,
  ] as const;
  readonly entries = signal<FaqEntry[]>([]);
  readonly loading = signal(false);
  readonly mutating = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  readonly createModel = signal(emptyModel());
  readonly createForm = form(this.createModel);
  editingId = signal<string | null>(null);
  readonly editModel = signal(emptyModel());
  readonly editForm = form(this.editModel);

  categories() {
    return [...new Set(this.entries().map((e) => e.category))].sort();
  }

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.api.listFaq();
      this.entries.set(res.entries);
    } catch {
      this.error.set('Could not load FAQ entries.');
    } finally {
      this.loading.set(false);
    }
  }

  async create() {
    const m = this.createModel();
    this.mutating.set(true);
    this.message.set('');
    try {
      await this.api.createFaqEntry({
        ...m,
        sortOrder: m.sortOrder !== '' ? Number(m.sortOrder) : null,
      });
      this.message.set('FAQ entry added.');
      this.createModel.set(emptyModel());
      await this.load();
    } catch {
      this.error.set('Could not create entry.');
    } finally {
      this.mutating.set(false);
    }
  }

  startEdit(e: FaqEntry) {
    this.editingId.set(e.id);
    this.editModel.set({
      question: e.question,
      answer: e.answer,
      category: e.category,
      isPublished: e.isPublished,
      sortOrder: e.sortOrder ?? '',
    });
  }
  cancelEdit() {
    this.editingId.set(null);
  }

  async saveEdit() {
    const id = this.editingId();
    if (!id) return;
    const m = this.editModel();
    this.mutating.set(true);
    this.message.set('');
    try {
      await this.api.updateFaqEntry(id, {
        ...m,
        sortOrder: m.sortOrder !== '' ? Number(m.sortOrder) : null,
      });
      this.message.set('Entry updated.');
      this.editingId.set(null);
      await this.load();
    } catch {
      this.error.set('Could not update entry.');
    } finally {
      this.mutating.set(false);
    }
  }

  async togglePublish(e: FaqEntry) {
    this.mutating.set(true);
    try {
      await this.api.updateFaqEntry(e.id, { isPublished: !e.isPublished });
      this.message.set(e.isPublished ? 'Hidden.' : 'Published.');
      await this.load();
    } catch {
      this.error.set('Could not update.');
    } finally {
      this.mutating.set(false);
    }
  }

  async remove(id: string) {
    if (!confirm('Delete this FAQ entry?')) return;
    this.mutating.set(true);
    try {
      await this.api.deleteFaqEntry(id);
      this.message.set('Deleted.');
      await this.load();
    } catch {
      this.error.set('Could not delete.');
    } finally {
      this.mutating.set(false);
    }
  }
}
