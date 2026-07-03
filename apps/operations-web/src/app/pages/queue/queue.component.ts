import { Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import { ReceptionApiService } from '../../services/reception-api.service';
import type { QueueConsultation, QueueData } from '../../models';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PAYMENT_PENDING', label: 'Awaiting payment' },
  { value: 'PAID', label: 'Awaiting doctor' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' }
];

const EMPTY_SUMMARY = { total: 0, awaitingPayment: 0, awaitingDoctor: 0, inProgress: 0 };

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [FormField, DatePipe],
  templateUrl: './queue.component.html',
  styleUrl: './queue.component.scss'
})
export class QueueComponent {
  private api = inject(ReceptionApiService);

  readonly statusFilter = signal('');
  readonly query = signal('');
  readonly searchModel = signal({ q: '' });
  readonly searchForm = form(this.searchModel);
  toast = signal('');
  assignTarget = signal<QueueConsultation | null>(null);
  readonly assignFormModel = signal({ doctorId: '' });
  readonly assignForm = form(this.assignFormModel);

  readonly statusFilters = STATUS_FILTERS;

  readonly queue = httpResource<QueueData>(() => {
    const params: Record<string, string> = {};
    const status = this.statusFilter();
    const q = this.query();
    if (status) params['status'] = status;
    if (q) params['q'] = q;
    return {
      url: `${environment.apiUrl}${API_PATHS.RECEPTION.QUEUE}`,
      params
    };
  });

  readonly doctorsResource = httpResource<{ doctors: Array<{ id: string; name: string; specialty: string }> }>(
    () => `${environment.apiUrl}${API_PATHS.RECEPTION.DOCTORS}`
  );

  data = () => (this.queue.hasValue() ? this.queue.value() : null);
  loading = () => this.queue.isLoading();
  error = () =>
    this.queue.status() === 'error' ? 'Could not load the queue. Check your connection and try again.' : '';
  consultations = () => this.data()?.consultations ?? [];
  summary = () => this.data()?.summary ?? EMPTY_SUMMARY;
  doctors = () => this.doctorsResource.value()?.doctors ?? [];

  applySearch(): void {
    this.query.set(this.searchModel().q.trim());
  }

  reload(): void {
    this.queue.reload();
  }

  formatPaise(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  async collectCash(item: QueueConsultation): Promise<void> {
    try {
      await this.api.collectCash(item.id);
      this.showToast('Cash payment recorded');
      this.reload();
    } catch {
      this.showToast('Payment failed');
    }
  }

  openAssign(item: QueueConsultation): void {
    this.assignTarget.set(item);
    this.assignFormModel.set({ doctorId: item.assignedDoctor?.id ?? '' });
  }

  closeAssign(): void {
    this.assignTarget.set(null);
    this.assignFormModel.set({ doctorId: '' });
  }

  async submitAssign(): Promise<void> {
    const target = this.assignTarget();
    const doctorId = this.assignFormModel().doctorId;
    if (!target || !doctorId) return;
    try {
      await this.api.assignDoctor(target.id, doctorId);
      this.showToast('Doctor assigned');
      this.closeAssign();
      this.reload();
    } catch {
      this.showToast('Assignment failed');
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }
}
