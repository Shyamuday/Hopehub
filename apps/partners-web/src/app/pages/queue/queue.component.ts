import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ReceptionApiService } from '../../services/reception-api.service';
import type { QueueConsultation } from '../../models';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PAYMENT_PENDING', label: 'Awaiting payment' },
  { value: 'PAID', label: 'Awaiting doctor' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' }
];

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './queue.component.html',
  styleUrl: './queue.component.scss'
})
export class QueueComponent implements OnInit {
  private api = inject(ReceptionApiService);

  loading = signal(true);
  error = signal('');
  consultations = signal<QueueConsultation[]>([]);
  summary = signal({ total: 0, awaitingPayment: 0, awaitingDoctor: 0, inProgress: 0 });
  doctors = signal<Array<{ id: string; name: string; specialty: string }>>([]);
  statusFilter = '';
  q = '';
  toast = signal('');
  assignTarget = signal<QueueConsultation | null>(null);
  selectedDoctorId = '';

  readonly statusFilters = STATUS_FILTERS;

  ngOnInit(): void {
    this.load();
    this.api.getDoctors().then(r => this.doctors.set(r.doctors ?? [])).catch(() => {});
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getQueue({ status: this.statusFilter || undefined, q: this.q || undefined })
      .then(r => {
        this.consultations.set(r.consultations ?? []);
        this.summary.set(r.summary ?? { total: 0, awaitingPayment: 0, awaitingDoctor: 0, inProgress: 0 });
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load the queue. Check your connection and try again.');
        this.loading.set(false);
      });
  }

  formatPaise(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  async collectCash(item: QueueConsultation): Promise<void> {
    try {
      await this.api.collectCash(item.id);
      this.showToast('Cash payment recorded');
      this.load();
    } catch {
      this.showToast('Payment failed');
    }
  }

  openAssign(item: QueueConsultation): void {
    this.assignTarget.set(item);
    this.selectedDoctorId = item.assignedDoctor?.id ?? '';
  }

  closeAssign(): void {
    this.assignTarget.set(null);
    this.selectedDoctorId = '';
  }

  async submitAssign(): Promise<void> {
    const target = this.assignTarget();
    if (!target || !this.selectedDoctorId) return;
    try {
      await this.api.assignDoctor(target.id, this.selectedDoctorId);
      this.showToast('Doctor assigned');
      this.closeAssign();
      this.load();
    } catch {
      this.showToast('Assignment failed');
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }
}
