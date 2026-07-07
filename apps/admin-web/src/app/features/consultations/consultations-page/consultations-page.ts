import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  clinicalRecordsQuery,
  doctorAppointmentUrl,
  doctorCaseAnalysisUrl
} from '@vitalis/platform-ui';
import { AdminApi } from '../../../core/services/admin-api';
import { adminRouteLink, ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { environment } from '../../../../environments/environment';
import {
  CONSULTATION_PAYMENT_STYLES,
  CONSULTATION_STATUS_FALLBACK_STYLE,
  CONSULTATION_STATUS_STYLES
} from '../constants/consultation-status.constants';

@Component({
  selector: 'app-consultations-page',
  imports: [FormField, DatePipe, RouterLink],
  templateUrl: './consultations-page.html',
  styleUrl: './consultations-page.scss'
})
export class ConsultationsPage implements OnInit {
  private api = inject(AdminApi);

  readonly clinicalRecordsRoute = adminRouteLink(ROUTE_PATHS.CLINICAL_RECORDS);
  readonly doctorOrigins = { doctor: environment.doctorAppUrl };

  consultations = signal<any[]>([]);
  loading = signal(true);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  unassignedCount = signal(0);

  statusFilter = signal('');
  assignedFilter = signal('no');

  readonly searchModel = signal({ q: '' });
  readonly searchForm = form(this.searchModel);

  modal = signal(false);
  statusModal = signal(false);
  selectedConsult = signal<any>(null);

  readonly statusModel = signal({ value: 'ASSIGNED' });
  readonly statusForm = form(this.statusModel);

  doctors = signal<any[]>([]);
  filteredDoctors = signal<any[]>([]);
  doctorsLoading = signal(false);
  selectedDoctorId = signal<string>('');

  readonly doctorSearchModel = signal({ q: '' });
  readonly doctorSearchForm = form(this.doctorSearchModel);

  saving = signal(false);
  err = signal('');
  toast = signal('');

  statusFilters = [
    { label: 'All Statuses', value: '' },
    { label: 'Payment pending', value: 'PAYMENT_PENDING' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'In progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ];
  statusOptions = [
    'PAYMENT_PENDING',
    'PAID',
    'ASSIGNED',
    'IN_PROGRESS',
    'PRESCRIPTION_UPLOADED',
    'COMPLETED',
    'CANCELLED'
  ];
  assignedFilters = [
    { label: 'All', value: '' },
    { label: 'Unassigned', value: 'no' },
    { label: 'Assigned', value: 'yes' }
  ];

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.load(); this.loadUnassignedCount(); }

  load(): void {
    this.loading.set(true);
    this.api.getAdminConsultations({
      status: this.statusFilter(),
      assigned: this.assignedFilter(),
      q: this.searchModel().q,
      page: this.page(),
      pageSize: this.pageSize
    })
      .then(r => { this.consultations.set(r.consultations); this.total.set(r.total); this.loading.set(false); })
      .catch(() => this.loading.set(false));
  }

  loadUnassignedCount(): void {
    this.api.getAdminConsultations({ assigned: 'no', status: 'PAID', pageSize: 1 })
      .then(r => this.unassignedCount.set(r.total))
      .catch(() => {});
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 300);
  }

  setStatus(v: string): void { this.statusFilter.set(v); this.page.set(1); this.load(); }
  setAssigned(v: string): void { this.assignedFilter.set(v); this.page.set(1); this.load(); }
  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }
  totalPages(): number { return Math.ceil(this.total() / this.pageSize); }

  ss(s: string): { bg: string; color: string } {
    return CONSULTATION_STATUS_STYLES[s] ?? CONSULTATION_STATUS_FALLBACK_STYLE;
  }
  ps(s: string): { bg: string; color: string } {
    return CONSULTATION_PAYMENT_STYLES[s] ?? CONSULTATION_STATUS_FALLBACK_STYLE;
  }

  openAssign(c: any): void {
    this.selectedConsult.set(c);
    this.selectedDoctorId.set(c.assignedDoctor?.id ?? '');
    this.doctorSearchModel.set({ q: '' });
    this.err.set('');
    this.modal.set(true);
    if (this.doctors().length === 0) {
      this.doctorsLoading.set(true);
      this.api.getActiveDoctors()
        .then(r => {
          this.doctors.set(r.doctors);
          this.filteredDoctors.set(r.doctors);
          this.doctorsLoading.set(false);
        })
        .catch(() => this.doctorsLoading.set(false));
    } else {
      this.filterDoctors();
    }
  }

  filterDoctors(): void {
    const q = this.doctorSearchModel().q.toLowerCase();
    this.filteredDoctors.set(
      q ? this.doctors().filter(d => d.name.toLowerCase().includes(q)) : this.doctors()
    );
  }

  closeModal(): void { this.modal.set(false); this.statusModal.set(false); }

  openStatus(c: any): void {
    this.selectedConsult.set(c);
    this.statusModel.set({ value: c.status });
    this.err.set('');
    this.statusModal.set(true);
  }

  async confirmStatus(): Promise<void> {
    if (!this.selectedConsult()) return;
    this.saving.set(true);
    this.err.set('');
    try {
      const r = await this.api.updateConsultationStatus(
        this.selectedConsult()!.id,
        this.statusModel().value
      );
      this.consultations.update(list =>
        list.map(c => c.id === this.selectedConsult()!.id ? { ...c, status: r.consultation.status } : c)
      );
      this.statusModal.set(false);
      this.showToast('Status updated ✓');
    } catch (e: any) {
      this.err.set(e?.error?.message ?? 'Status update failed');
    } finally {
      this.saving.set(false);
    }
  }

  async confirmAssign(): Promise<void> {
    if (!this.selectedDoctorId() || !this.selectedConsult()) return;
    this.saving.set(true);
    this.err.set('');
    try {
      const r = await this.api.assignConsultationDoctor(this.selectedConsult()!.id, this.selectedDoctorId());
      this.consultations.update(list =>
        list.map(c => c.id === this.selectedConsult()!.id ? { ...c, assignedDoctor: r.consultation.assignedDoctor, status: r.consultation.status } : c)
      );
      this.modal.set(false);
      this.loadUnassignedCount();
      this.showToast('Doctor assigned ✓');
    } catch (e: any) {
      this.err.set(e?.error?.message ?? 'Assignment failed');
    } finally {
      this.saving.set(false);
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }

  clinicalQuery(consultation: { id: string; patient?: { id?: string } | null }, tab: 'prescriptions' | 'analyses' = 'prescriptions') {
    return clinicalRecordsQuery({
      tab,
      patientId: consultation.patient?.id,
      consultationId: consultation.id
    });
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
