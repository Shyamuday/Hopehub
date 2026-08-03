import { DatePipe, NgClass } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/services/admin-api';
import type { FollowUpStatus } from '../../core/services/admin/admin-reports.api';
import { PAYMENTS_PAGE_SIZE } from '../payments/constants/payment-status.constants';

const FOLLOW_UP_STATUSES: Array<{ value: FollowUpStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'USED', label: 'Completed' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

@Component({
  selector: 'app-follow-ups-page',
  standalone: true,
  imports: [DatePipe, FormsModule, NgClass],
  template: `
    <main class="admin-page">
      <section class="page-head">
        <div>
          <p>Care delivery</p>
          <h1>Follow-ups</h1>
        </div>
        <button type="button" (click)="load()" [disabled]="loading()">Refresh</button>
      </section>

      <section class="summary-grid">
        <div>
          <span>Requested</span>
          <strong>{{ summary().requested }}</strong>
          <small>Needs scheduling</small>
        </div>
        <div>
          <span>Available</span>
          <strong>{{ summary().available }}</strong>
          <small>Not requested yet</small>
        </div>
        <div>
          <span>Scheduled</span>
          <strong>{{ summary().scheduled }}</strong>
          <small>Upcoming follow-ups</small>
        </div>
      </section>

      <section class="filters">
        <input
          type="search"
          [ngModel]="query()"
          (ngModelChange)="query.set($event)"
          placeholder="Search patient, phone, email, service or consultation id"
        />
        <select [ngModel]="status()" (ngModelChange)="setStatus($event)">
          @for (option of statusOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
        <button type="button" (click)="applyFilters()">Apply</button>
      </section>

      @if (toast()) {
        <p class="toast">{{ toast() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <section class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Session</th>
              <th>Status</th>
              <th>Schedule</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (followUp of followUps(); track followUp.id) {
              <tr>
                <td>
                  <strong>{{ followUp.patient?.name || 'Patient' }}</strong>
                  <span>{{ followUp.patient?.mobile || followUp.patient?.email || '-' }}</span>
                  <small>{{ followUp.createdAt | date: 'mediumDate' }}</small>
                </td>
                <td>
                  <strong>{{ followUp.durationMinutes || 15 }} min follow-up</strong>
                  <span>{{ followUp.consultation?.disease?.name || 'Consultation' }}</span>
                  @if (followUp.consultation?.assignedDoctor) {
                    <small>Expert: {{ followUp.consultation.assignedDoctor.name }}</small>
                  }
                  @if (followUp.expiresAt) {
                    <small>Valid till {{ followUp.expiresAt | date: 'mediumDate' }}</small>
                  }
                </td>
                <td>
                  <span class="badge" [ngClass]="statusClass(followUp.status)">
                    {{ statusLabel(followUp.status) }}
                  </span>
                  @if (followUp.requestedAt) {
                    <small>Requested {{ followUp.requestedAt | date: 'medium' }}</small>
                  }
                </td>
                <td>
                  <input
                    type="datetime-local"
                    [ngModel]="
                      draftScheduledAt()[followUp.id] ?? dateTimeLocal(followUp.scheduledAt)
                    "
                    (ngModelChange)="setDraftScheduledAt(followUp.id, $event)"
                  />
                  @if (followUp.scheduledAt) {
                    <small>Current: {{ followUp.scheduledAt | date: 'medium' }}</small>
                  }
                </td>
                <td>
                  <textarea
                    rows="2"
                    [ngModel]="draftNotes()[followUp.id] ?? followUp.notes ?? ''"
                    (ngModelChange)="setDraftNote(followUp.id, $event)"
                    placeholder="Internal scheduling note"
                  ></textarea>
                </td>
                <td>
                  <div class="actions">
                    <button
                      type="button"
                      (click)="updateStatus(followUp, 'SCHEDULED')"
                      [disabled]="savingId() === followUp.id"
                    >
                      Schedule
                    </button>
                    <button
                      type="button"
                      class="secondary"
                      (click)="updateStatus(followUp, 'USED')"
                      [disabled]="savingId() === followUp.id"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      class="ghost"
                      (click)="updateStatus(followUp, 'CANCELLED')"
                      [disabled]="savingId() === followUp.id"
                    >
                      Cancel
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty">No follow-ups found.</td>
              </tr>
            }
          </tbody>
        </table>
      </section>

      <section class="pager">
        <button type="button" (click)="prevPage()" [disabled]="page() <= 1">Previous</button>
        <span>Page {{ page() }} of {{ totalPages() }}</span>
        <button type="button" (click)="nextPage()" [disabled]="page() >= totalPages()">Next</button>
      </section>
    </main>
  `,
  styles: [
    `
      .admin-page {
        display: grid;
        gap: 1rem;
      }
      .page-head,
      .filters,
      .pager {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .page-head p,
      .page-head h1 {
        margin: 0;
      }
      .page-head p {
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 800;
        text-transform: uppercase;
      }
      .page-head h1 {
        color: #0f172a;
        font-size: 1.8rem;
      }
      button,
      select,
      input,
      textarea {
        border: 1px solid #dbe3ea;
        border-radius: 8px;
        background: #fff;
        padding: 0.65rem 0.8rem;
      }
      button {
        background: var(--brand-primary, #256f5f);
        color: #fff;
        font-weight: 800;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      input[type='search'] {
        min-width: min(100%, 28rem);
      }
      textarea {
        width: min(100%, 18rem);
        resize: vertical;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
      }
      .summary-grid div {
        display: grid;
        gap: 0.25rem;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #fff;
        padding: 1rem;
      }
      .summary-grid span,
      .summary-grid small,
      td span,
      td small {
        color: #64748b;
      }
      .summary-grid strong {
        color: #0f172a;
        font-size: 1.35rem;
      }
      .table-wrap {
        overflow: auto;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #fff;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border-bottom: 1px solid #edf2f7;
        padding: 0.8rem;
        text-align: left;
        vertical-align: top;
      }
      th {
        color: #64748b;
        font-size: 0.78rem;
        text-transform: uppercase;
      }
      td strong,
      td span,
      td small {
        display: block;
      }
      .badge {
        display: inline-flex;
        border-radius: 999px;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 900;
      }
      .status-requested {
        background: #fef3c7;
        color: #92400e;
      }
      .status-available {
        background: #dcfce7;
        color: #166534;
      }
      .status-scheduled {
        background: #dbeafe;
        color: #1d4ed8;
      }
      .status-used {
        background: #f1f5f9;
        color: #334155;
      }
      .status-cancelled,
      .status-expired {
        background: #fee2e2;
        color: #991b1b;
      }
      .actions {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
      }
      .actions .secondary {
        background: #0f766e;
      }
      .actions .ghost {
        background: #fff;
        color: #334155;
      }
      .empty,
      .error,
      .toast {
        color: #64748b;
        text-align: center;
      }
      .error {
        color: #b91c1c;
      }
      .toast {
        color: #166534;
        font-weight: 800;
      }
      @media (max-width: 760px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class FollowUpsPage implements OnInit {
  private readonly api = inject(AdminApi);
  readonly followUps = signal<any[]>([]);
  readonly summary = signal({ requested: 0, available: 0, scheduled: 0 });
  readonly loading = signal(false);
  readonly error = signal('');
  readonly toast = signal('');
  readonly page = signal(1);
  readonly pageSize = PAYMENTS_PAGE_SIZE;
  readonly total = signal(0);
  readonly status = signal<FollowUpStatus | 'ALL'>('REQUESTED');
  readonly query = signal('');
  readonly savingId = signal<string | null>(null);
  readonly draftNotes = signal<Record<string, string>>({});
  readonly draftScheduledAt = signal<Record<string, string>>({});
  readonly statusOptions = FOLLOW_UP_STATUSES;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .getFollowUps({
        page: this.page(),
        pageSize: this.pageSize,
        status: this.status(),
        q: this.query().trim(),
      })
      .then((result) => {
        this.followUps.set(result.followUps || []);
        this.summary.set(result.summary || { requested: 0, available: 0, scheduled: 0 });
        this.total.set(result.pagination?.total ?? 0);
      })
      .catch(() => {
        this.error.set('Could not load follow-ups.');
        this.followUps.set([]);
      })
      .finally(() => this.loading.set(false));
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  setStatus(value: FollowUpStatus | 'ALL'): void {
    this.status.set(value);
    this.applyFilters();
  }

  prevPage(): void {
    if (this.page() <= 1) return;
    this.page.update((page) => page - 1);
    this.load();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((page) => page + 1);
    this.load();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  setDraftNote(id: string, value: string): void {
    this.draftNotes.update((notes) => ({ ...notes, [id]: value }));
  }

  setDraftScheduledAt(id: string, value: string): void {
    this.draftScheduledAt.update((dates) => ({ ...dates, [id]: value }));
  }

  async updateStatus(followUp: any, status: FollowUpStatus): Promise<void> {
    if (!followUp?.id || this.savingId()) return;
    this.savingId.set(followUp.id);
    this.toast.set('');
    const scheduledAt =
      this.draftScheduledAt()[followUp.id] || this.dateTimeLocal(followUp.scheduledAt);
    const notes = this.draftNotes()[followUp.id] ?? followUp.notes ?? '';
    try {
      await this.api.updateFollowUp(followUp.id, {
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        notes: notes.trim() || null,
      });
      this.toast.set('Follow-up updated.');
      this.load();
    } catch {
      this.error.set('Could not update follow-up.');
    } finally {
      this.savingId.set(null);
      setTimeout(() => this.toast.set(''), 2500);
    }
  }

  dateTimeLocal(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
  }

  statusLabel(status: string): string {
    if (status === 'REQUESTED') return 'Requested';
    if (status === 'AVAILABLE') return 'Available';
    if (status === 'SCHEDULED') return 'Scheduled';
    if (status === 'USED') return 'Completed';
    if (status === 'EXPIRED') return 'Expired';
    if (status === 'CANCELLED') return 'Cancelled';
    return status || 'Available';
  }

  statusClass(status: string): string {
    return `status-${String(status || 'AVAILABLE').toLowerCase()}`;
  }
}
