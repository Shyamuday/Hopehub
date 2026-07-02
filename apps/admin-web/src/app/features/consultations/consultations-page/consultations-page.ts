import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminApi } from '../../../core/services/admin-api';
import {
  CONSULTATION_PAYMENT_STYLES,
  CONSULTATION_STATUS_FALLBACK_STYLE,
  CONSULTATION_STATUS_STYLES
} from '../constants/consultation-status.constants';

@Component({
  selector: 'app-consultations-page',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="cp">
      <div class="cp-hdr">
        <div>
          <h2 class="cp-title">🩺 Consultation Queue</h2>
          <p class="cp-sub">Assign unassigned consultations to available doctors</p>
        </div>
        <div class="hdr-stats">
          <div class="stat-pill unassigned">{{ unassignedCount() }} Unassigned</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <input class="search" [(ngModel)]="q" (ngModelChange)="onSearch()" placeholder="🔍 Search by patient or disease…" />
        <div class="ftabs">
          @for (f of statusFilters; track f.value) {
            <button class="ftab" [class.active]="statusFilter() === f.value" (click)="setStatus(f.value)">{{ f.label }}</button>
          }
        </div>
        <div class="ftabs">
          @for (f of assignedFilters; track f.value) {
            <button class="ftab sm" [class.active]="assignedFilter() === f.value" (click)="setAssigned(f.value)">{{ f.label }}</button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <div class="table-wrap">
          <table class="ct">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Disease</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Created</th>
                <th>Assigned Doctor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              @for (c of consultations(); track c.id) {
                <tr [class.unassigned-row]="!c.assignedDoctor">
                  <td>
                    <div class="pat-name">{{ c.patient?.name ?? '—' }}</div>
                    @if (c.patient?.mobile) { <div class="pat-mobile">{{ c.patient.mobile }}</div> }
                  </td>
                  <td><span class="disease-pill">{{ c.disease?.name ?? '—' }}</span></td>
                  <td>
                    <span class="status-badge" [style.background]="ss(c.status).bg" [style.color]="ss(c.status).color">
                      {{ c.status }}
                    </span>
                  </td>
                  <td>
                    @if (c.payment) {
                      <span class="pay-badge" [style.background]="ps(c.payment.status).bg" [style.color]="ps(c.payment.status).color">
                        {{ c.payment.status }}
                      </span>
                      <div class="pay-amt">₹{{ (c.payment.amountInPaise / 100).toFixed(0) }}</div>
                    }
                  </td>
                  <td><span class="date-txt">{{ c.createdAt | date:'dd MMM yy, h:mm a' }}</span></td>
                  <td>
                    @if (c.assignedDoctor) {
                      <div class="doc-assigned">✓ {{ c.assignedDoctor.name }}</div>
                    } @else {
                      <span class="unassigned-txt">Not assigned</span>
                    }
                  </td>
                  <td>
                    @if (!c.assignedDoctor || c.status === 'PENDING') {
                      <button class="btn-assign" (click)="openAssign(c)">Assign</button>
                    } @else {
                      <button class="btn-reassign" (click)="openAssign(c)">Reassign</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (consultations().length === 0) {
          <div class="empty"><div>🩺</div><p>No consultations match these filters</p></div>
        }
        @if (total() > pageSize) {
          <div class="pagination">
            <button [disabled]="page() <= 1" (click)="prevPage()">‹ Prev</button>
            <span>Page {{ page() }} of {{ totalPages() }}</span>
            <button [disabled]="page() >= totalPages()" (click)="nextPage()">Next ›</button>
          </div>
        }
      }
    </div>

    <!-- Assign Modal -->
    @if (modal() && selectedConsult()) {
      <div class="overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="mhdr">
            <div>
              <h3>Assign Doctor</h3>
              <p class="mhdr-sub">{{ selectedConsult()!.patient?.name }} — {{ selectedConsult()!.disease?.name }}</p>
            </div>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="mbody">
            @if (doctorsLoading()) {
              <div class="loading"><div class="spinner"></div></div>
            } @else {
              <input class="search" [(ngModel)]="doctorQ" (ngModelChange)="filterDoctors()" placeholder="🔍 Filter doctors…" style="margin-bottom:10px" />
              <div class="doc-list">
                @for (d of filteredDoctors(); track d.id) {
                  <div class="doc-item" [class.selected]="selectedDoctorId() === d.id" (click)="selectedDoctorId.set(d.id)">
                    <div class="doc-av">{{ d.name.charAt(0).toUpperCase() }}</div>
                    <div class="doc-info">
                      <div class="doc-name">{{ d.name }}</div>
                      @if (d.doctorProfile?.specialty) {
                        <div class="doc-spec">{{ d.doctorProfile.specialty }}</div>
                      }
                    </div>
                    @if (selectedDoctorId() === d.id) { <span class="check">✓</span> }
                  </div>
                }
                @if (filteredDoctors().length === 0) {
                  <div class="empty-sm">No doctors found</div>
                }
              </div>
            }
          </div>
          <div class="mfooter">
            <button class="btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" [disabled]="!selectedDoctorId() || saving()" (click)="confirmAssign()">
              {{ saving() ? 'Assigning…' : 'Confirm Assignment' }}
            </button>
          </div>
          @if (err()) { <div class="ferr">⚠️ {{ err() }}</div> }
        </div>
      </div>
    }

    @if (toast()) { <div class="toast">{{ toast() }}</div> }
  `,
  styleUrl: './consultations-page.scss'
})
export class ConsultationsPage implements OnInit {
  private api = inject(AdminApi);

  consultations = signal<any[]>([]);
  loading = signal(true);
  total = signal(0);
  page = signal(1);
  pageSize = 20;
  unassignedCount = signal(0);

  statusFilter = signal('');
  assignedFilter = signal('no');
  q = '';

  modal = signal(false);
  selectedConsult = signal<any>(null);
  doctors = signal<any[]>([]);
  filteredDoctors = signal<any[]>([]);
  doctorsLoading = signal(false);
  selectedDoctorId = signal<string>('');
  doctorQ = '';
  saving = signal(false);
  err = signal('');
  toast = signal('');

  statusFilters = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Completed', value: 'COMPLETED' }
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
    this.api.getAdminConsultations({ status: this.statusFilter(), assigned: this.assignedFilter(), q: this.q, page: this.page(), pageSize: this.pageSize })
      .then(r => { this.consultations.set(r.consultations); this.total.set(r.total); this.loading.set(false); })
      .catch(() => this.loading.set(false));
  }

  loadUnassignedCount(): void {
    this.api.getAdminConsultations({ assigned: 'no', status: 'PENDING', pageSize: 1 })
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
    this.doctorQ = '';
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
    const q = this.doctorQ.toLowerCase();
    this.filteredDoctors.set(
      q ? this.doctors().filter(d => d.name.toLowerCase().includes(q)) : this.doctors()
    );
  }

  closeModal(): void { this.modal.set(false); }

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
}
