import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { Auth } from '../../../core/services/auth';
import {
  DEFAULT_LEAVE_TYPE,
  LEAVE_STATUS_FALLBACK_STYLE,
  LEAVE_STATUS_STYLES,
  LEAVE_TYPES
} from '../constants/leave.constants';

@Component({
  selector: 'app-my-leaves',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="ml">
      <div class="ml-hdr">
        <div>
          <h2 class="ml-title">📋 My Leaves</h2>
          <p class="ml-sub">View your leave history and request new leaves</p>
        </div>
        <button class="btn-primary" (click)="openModal()">+ Request Leave</button>
      </div>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <div class="leave-list">
          @for (l of leaves(); track l.id) {
            <div class="leave-card">
              <div class="lc-body">
                <div class="lc-top">
                  <span class="leave-type">{{ l.type }}</span>
                  <span class="days-badge">{{ l.totalDays }} day{{ l.totalDays !== 1 ? 's' : '' }}</span>
                </div>
                <div class="lc-dates">{{ l.startDate | date:'dd MMM yyyy' }} → {{ l.endDate | date:'dd MMM yyyy' }}</div>
                @if (l.reason) { <div class="lc-reason">"{{ l.reason }}"</div> }
                @if (l.hrNote) { <div class="lc-note">📝 HR: {{ l.hrNote }}</div> }
                @if (l.approvedBy) { <div class="lc-by">{{ l.approvedBy.name }}</div> }
              </div>
              <div class="status-badge" [style.background]="statusStyle(l.status).bg" [style.color]="statusStyle(l.status).color">
                {{ l.status }}
              </div>
            </div>
          }
        </div>
        @if (leaves().length === 0) {
          <div class="empty"><div>📋</div><p>No leave requests yet. Request your first leave above.</p></div>
        }
      }
    </div>

    @if (modal()) {
      <div class="overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="mhdr">
            <h3>📋 Request Leave</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="mbody">
            <div class="fg">
              <label>Leave Type *</label>
              <select [(ngModel)]="form.type">
                @for (t of leaveTypes; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </div>
            <div class="frow">
              <div class="fg"><label>Start Date *</label><input type="date" [(ngModel)]="form.startDate" /></div>
              <div class="fg"><label>End Date *</label><input type="date" [(ngModel)]="form.endDate" /></div>
            </div>
            <div class="fg"><label>Reason</label><textarea [(ngModel)]="form.reason" rows="3" placeholder="Brief reason for leave…"></textarea></div>
          </div>
          <div class="mfooter">
            <button class="btn-ghost" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" [disabled]="saving()" (click)="submit()">
              {{ saving() ? 'Submitting…' : 'Submit Request' }}
            </button>
          </div>
          @if (err()) { <div class="ferr">⚠️ {{ err() }}</div> }
        </div>
      </div>
    }

    @if (toast()) { <div class="toast">{{ toast() }}</div> }
  `,
  styleUrl: './my-leaves.scss'
})
export class MyLeaves implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  private base = environment.apiUrl;

  leaves = signal<any[]>([]);
  loading = signal(true);
  modal = signal(false);
  saving = signal(false);
  err = signal('');
  toast = signal('');

  form = { type: DEFAULT_LEAVE_TYPE, startDate: '', endDate: '', reason: '' };
  leaveTypes = LEAVE_TYPES;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const token = this.auth.token();
    firstValueFrom(
      this.http.get<{ leaves: any[] }>(`${this.base}${API_PATHS.HR.SELF_DOCTOR_LEAVES}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ).then(r => { this.leaves.set(r.leaves); this.loading.set(false); })
     .catch(() => this.loading.set(false));
  }

  openModal(): void { this.form = { type: DEFAULT_LEAVE_TYPE, startDate: '', endDate: '', reason: '' }; this.err.set(''); this.modal.set(true); }
  closeModal(): void { this.modal.set(false); }

  async submit(): Promise<void> {
    if (!this.form.startDate || !this.form.endDate) { this.err.set('Start and end dates are required'); return; }
    this.saving.set(true);
    const token = this.auth.token();
    try {
      await firstValueFrom(
        this.http.post(`${this.base}${API_PATHS.HR.SELF_DOCTOR_LEAVE}`, this.form, {
          headers: { Authorization: `Bearer ${token}` }
        })
      );
      this.modal.set(false);
      this.showToast('Leave request submitted ✓');
      this.load();
    } catch (e: any) {
      this.err.set(e?.error?.error ?? 'Failed to submit request');
    } finally {
      this.saving.set(false);
    }
  }

  statusStyle(s: string): { bg: string; color: string } {
    return LEAVE_STATUS_STYLES[s] ?? LEAVE_STATUS_FALLBACK_STYLE;
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
