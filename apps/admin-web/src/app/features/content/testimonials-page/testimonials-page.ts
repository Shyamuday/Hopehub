import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';

type Testimonial = {
  id: string;
  patientName: string;
  location?: string | null;
  condition?: string | null;
  duration?: string | null;
  quote: string;
  stars: number;
  isPublished: boolean;
  isAnonymous: boolean;
  consentToPublish: boolean;
  submitterEmail?: string | null;
  source?: string | null;
  sortOrder?: number | null;
  createdAt: string;
};

function emptyModel() {
  return {
    patientName: '',
    location: '',
    condition: '',
    duration: '',
    quote: '',
    stars: 5,
    isPublished: false,
    isAnonymous: false,
    consentToPublish: true,
    submitterEmail: '',
    sortOrder: '' as number | '',
  };
}

@Component({
  selector: 'app-testimonials-page',
  imports: [CommonModule, FormField],
  templateUrl: './testimonials-page.html',
  styleUrl: './testimonials-page.scss',
})
export class TestimonialsPage {
  readonly testimonials = signal<Testimonial[]>([]);
  readonly loading = signal(false);
  readonly mutating = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  readonly createModel = signal(emptyModel());
  readonly createForm = form(this.createModel);

  editingId = signal<string | null>(null);
  readonly editModel = signal(emptyModel());
  readonly editForm = form(this.editModel);

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.api.listTestimonials();
      this.testimonials.set(res.testimonials);
    } catch {
      this.error.set('Could not load testimonials.');
    } finally {
      this.loading.set(false);
    }
  }

  async create() {
    const m = this.createModel();
    this.mutating.set(true);
    this.message.set('');
    try {
      await this.api.createTestimonial({
        ...m,
        sortOrder: m.sortOrder !== '' ? Number(m.sortOrder) : null,
      });
      this.message.set('Testimonial added.');
      this.createModel.set(emptyModel());
      await this.load();
    } catch {
      this.error.set('Could not create testimonial.');
    } finally {
      this.mutating.set(false);
    }
  }

  startEdit(t: Testimonial) {
    this.editingId.set(t.id);
    this.editModel.set({
      patientName: t.patientName,
      location: t.location || '',
      condition: t.condition || '',
      duration: t.duration || '',
      quote: t.quote,
      stars: t.stars,
      isPublished: t.isPublished,
      isAnonymous: t.isAnonymous,
      consentToPublish: t.consentToPublish,
      submitterEmail: t.submitterEmail || '',
      sortOrder: t.sortOrder ?? '',
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
      await this.api.updateTestimonial(id, {
        ...m,
        sortOrder: m.sortOrder !== '' ? Number(m.sortOrder) : null,
      });
      this.message.set('Testimonial updated.');
      this.editingId.set(null);
      await this.load();
    } catch {
      this.error.set('Could not update testimonial.');
    } finally {
      this.mutating.set(false);
    }
  }

  async togglePublish(t: Testimonial) {
    this.mutating.set(true);
    this.message.set('');
    try {
      await this.api.updateTestimonial(t.id, {
        isPublished: !t.isPublished,
        ...(!t.isPublished ? { consentToPublish: true } : {}),
      });
      this.message.set(t.isPublished ? 'Unpublished.' : 'Published.');
      await this.load();
    } catch {
      this.error.set('Could not update.');
    } finally {
      this.mutating.set(false);
    }
  }

  async remove(id: string) {
    if (!confirm('Delete this testimonial? This cannot be undone.')) return;
    this.mutating.set(true);
    try {
      await this.api.deleteTestimonial(id);
      this.message.set('Deleted.');
      await this.load();
    } catch {
      this.error.set('Could not delete.');
    } finally {
      this.mutating.set(false);
    }
  }

  stars(n: number) {
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  statusLabel(t: Testimonial) {
    if (t.isPublished) return 'Published';
    return t.source === 'public-feedback' ? 'Pending review' : 'Draft';
  }
}
