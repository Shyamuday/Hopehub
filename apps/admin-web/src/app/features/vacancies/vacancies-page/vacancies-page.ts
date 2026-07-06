import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';

type StatusFilter = 'ALL' | 'DRAFT' | 'OPEN' | 'CLOSED';

const DEPARTMENTS = [
  'Clinical',
  'Patient Experience',
  'Pharmacy / Store',
  'Operations',
  'HR',
  'Finance',
  'Marketing',
  'Technology',
  'Administration'
] as const;

const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'] as const;
const LOCATION_TYPES = ['REMOTE', 'ON_SITE', 'HYBRID'] as const;
const STATUSES = ['DRAFT', 'OPEN', 'CLOSED'] as const;

function emptyVacancyForm() {
  return {
    title: '',
    department: 'Clinical',
    jobType: 'FULL_TIME',
    locationType: 'ON_SITE',
    location: '',
    description: '',
    requirementsText: '',
    responsibilitiesText: '',
    status: 'DRAFT',
    isUrgent: false,
    deadline: '',
    salaryRange: ''
  };
}

@Component({
  selector: 'app-vacancies-page',
  imports: [FormField, DatePipe],
  templateUrl: './vacancies-page.html',
  styleUrl: './vacancies-page.scss'
})
export class VacanciesPage implements OnInit {
  private api = inject(AdminApi);

  vacancies = signal<any[]>([]);
  summary = signal({ DRAFT: 0, OPEN: 0, CLOSED: 0 });
  loading = signal(true);
  saving = signal(false);
  modal = signal<'create' | 'edit' | null>(null);
  selected = signal<any>(null);
  error = signal('');
  toast = signal('');
  statusFilter = signal<StatusFilter>('ALL');
  expandedId = signal<string | null>(null);

  readonly vacancyModel = signal(emptyVacancyForm());
  readonly vacancyForm = form(this.vacancyModel);

  readonly departments = [...DEPARTMENTS];
  readonly jobTypes = [...JOB_TYPES];
  readonly locationTypes = [...LOCATION_TYPES];
  readonly statuses = [...STATUSES];

  ngOnInit() { void this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const res = await this.api.listVacancies(
        this.statusFilter() !== 'ALL' ? { status: this.statusFilter() } : undefined
      );
      this.vacancies.set(res.vacancies);
      this.summary.set(res.summary);
    } catch {
      this.error.set('Could not load vacancies.');
    } finally {
      this.loading.set(false);
    }
  }

  setFilter(f: StatusFilter) {
    this.statusFilter.set(f);
    void this.load();
  }

  openCreate() {
    this.vacancyModel.set(emptyVacancyForm());
    this.error.set('');
    this.modal.set('create');
  }

  openEdit(v: any) {
    this.selected.set(v);
    this.vacancyModel.set({
      title: v.title,
      department: v.department,
      jobType: v.jobType,
      locationType: v.locationType,
      location: v.location ?? '',
      description: v.description,
      requirementsText: (v.requirements as string[]).join('\n'),
      responsibilitiesText: (v.responsibilities as string[]).join('\n'),
      status: v.status,
      isUrgent: v.isUrgent,
      deadline: v.deadline ? new Date(v.deadline).toISOString().substring(0, 10) : '',
      salaryRange: v.salaryRange ?? ''
    });
    this.error.set('');
    this.modal.set('edit');
  }

  closeModal() { this.modal.set(null); this.selected.set(null); }

  toggleExpand(id: string) {
    this.expandedId.update((cur) => (cur === id ? null : id));
  }

  async quickStatus(v: any, status: string) {
    try {
      await this.api.updateVacancy(v.id, { status });
      this.showToast(`Vacancy marked as ${status.toLowerCase()}.`);
      await this.load();
    } catch {
      this.showToast('Status update failed.');
    }
  }

  async save() {
    const f = this.vacancyModel();
    if (!f.title.trim() || !f.department || !f.description.trim()) {
      this.error.set('Title, department, and description are required.');
      return;
    }
    this.saving.set(true);
    this.error.set('');

    const payload = {
      title: f.title.trim(),
      department: f.department,
      jobType: f.jobType,
      locationType: f.locationType,
      location: f.location.trim() || null,
      description: f.description.trim(),
      requirements: f.requirementsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      responsibilities: f.responsibilitiesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      status: f.status,
      isUrgent: f.isUrgent,
      deadline: f.deadline ? new Date(f.deadline).toISOString() : null,
      salaryRange: f.salaryRange.trim() || null
    };

    try {
      if (this.modal() === 'create') {
        await this.api.createVacancy(payload);
        this.showToast('Vacancy created.');
      } else {
        await this.api.updateVacancy(this.selected()!.id, payload);
        this.showToast('Vacancy updated.');
      }
      this.modal.set(null);
      await this.load();
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Save failed. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  async closeVacancy(v: any) {
    if (!confirm(`Close vacancy "${v.title}"? It will no longer appear on the careers page.`)) return;
    try {
      await this.api.closeVacancy(v.id);
      this.showToast('Vacancy closed.');
      await this.load();
    } catch {
      this.showToast('Could not close vacancy.');
    }
  }

  statusClass(status: string) {
    if (status === 'OPEN') return 'badge badge-open';
    if (status === 'DRAFT') return 'badge badge-draft';
    return 'badge badge-closed';
  }

  jobTypeLabel(t: string) {
    return { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACT: 'Contract', INTERNSHIP: 'Internship' }[t] ?? t;
  }

  locationLabel(t: string) {
    return { REMOTE: 'Remote', ON_SITE: 'On-site', HYBRID: 'Hybrid' }[t] ?? t;
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
