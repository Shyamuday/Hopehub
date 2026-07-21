import { Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { httpResource } from '@angular/common/http';
import {
  clinicalRecordsQuery,
  doctorAppointmentUrl,
  doctorCaseAnalysisUrl
} from '@hopehub/platform-ui';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
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
  imports: [FormField, DatePipe, RouterLink],
  templateUrl: './queue.component.html',
  styleUrl: './queue.component.scss'
})
export class QueueComponent implements OnInit {
  private api = inject(ReceptionApiService);

  readonly visitorLeadsPath = `/${ROUTE_PATHS.VISITOR_LEADS}`;
  readonly clinicalRecordsPath = '/admin/clinical-records';
  readonly consumersPath = '/admin/consumers';
  readonly doctorOrigins = { doctor: environment.doctorAppUrl };
  readonly leadStats = signal<{ needsCallback: number; newLeads: number } | null>(null);

  readonly statusFilter = signal('');
  readonly query = signal('');
  readonly searchModel = signal({ q: '' });
  readonly searchForm = form(this.searchModel);
  toast = signal('');
  assignTarget = signal<QueueConsultation | null>(null);
  cashTarget = signal<QueueConsultation | null>(null);
  cashSubmitting = signal(false);
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

  ngOnInit(): void {
    void this.loadLeadStats();
  }

  async loadLeadStats(): Promise<void> {
    try {
      const res = await this.api.getVisitorLeadStats();
      this.leadStats.set({
        needsCallback: res.stats.needsCallback,
        newLeads: res.stats.newLeads
      });
    } catch {
      this.leadStats.set(null);
    }
  }

  applySearch(): void {
    this.query.set(this.searchModel().q.trim());
  }

  reload(): void {
    this.queue.reload();
  }

  formatPaise(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  paymentGross(item: QueueConsultation): number {
    return item.payment?.grossAmountInPaise ?? item.disease?.feeInPaise ?? item.payment?.amountInPaise ?? 0;
  }

  paymentDiscount(item: QueueConsultation): number {
    return item.payment?.discountInPaise ?? 0;
  }

  paymentWallet(item: QueueConsultation): number {
    return item.payment?.walletRedeemedInPaise ?? 0;
  }

  paymentPayable(item: QueueConsultation): number {
    return item.payment?.amountInPaise ?? item.disease?.feeInPaise ?? 0;
  }

  openCollectCash(item: QueueConsultation): void {
    this.cashTarget.set(item);
  }

  closeCollectCash(): void {
    this.cashTarget.set(null);
    this.cashSubmitting.set(false);
  }

  async confirmCollectCash(): Promise<void> {
    const target = this.cashTarget();
    if (!target || this.cashSubmitting()) return;

    this.cashSubmitting.set(true);
    try {
      await this.api.collectCash(target.id);
      this.showToast('Cash payment recorded');
      this.closeCollectCash();
      this.reload();
    } catch {
      this.showToast('Payment failed');
      this.cashSubmitting.set(false);
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
      const code = target.patient?.patientCode;
      this.showToast(
        code
          ? `Assigned — Patient ID: ${code}`
          : 'Doctor assigned'
      );
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

  clinicalQuery(item: QueueConsultation, tab: 'prescriptions' | 'analyses' = 'prescriptions') {
    return clinicalRecordsQuery({
      tab,
      patientId: item.patient?.id,
      consultationId: item.id
    });
  }

  consumerQuery(patientId: string) {
    return { consumerId: patientId };
  }

  doctorAppointmentLink(consultationId: string) {
    return doctorAppointmentUrl(this.doctorOrigins, consultationId);
  }

  doctorCaseAnalysisLink(consultationId: string) {
    return doctorCaseAnalysisUrl(this.doctorOrigins, consultationId);
  }

  showDoctorLinks(status: string) {
    return ['ASSIGNED', 'IN_PROGRESS', 'PRESCRIPTION_UPLOADED', 'COMPLETED'].includes(status);
  }
}
