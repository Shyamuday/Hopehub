import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/services/admin-api';
import {
  PAYMENT_STATUS_OPTIONS,
  PAYMENT_STATUS_STYLES,
  PAYMENTS_PAGE_SIZE,
  formatPaise,
} from '../payments/constants/payment-status.constants';

@Component({
  selector: 'app-donations-page',
  standalone: true,
  imports: [DatePipe, FormsModule],
  template: `
    <main class="admin-page">
      <section class="page-head">
        <div>
          <p>Finance</p>
          <h1>Donations</h1>
        </div>
        <button type="button" (click)="load()" [disabled]="loading()">Refresh</button>
      </section>

      <section class="summary-grid">
        <div>
          <span>Paid donations</span>
          <strong>₹{{ formatPaise(summary().paidAmountInPaise) }}</strong>
          <small>{{ summary().paidCount }} successful</small>
        </div>
        <div>
          <span>Pending orders</span>
          <strong>₹{{ formatPaise(summary().pendingAmountInPaise) }}</strong>
          <small>{{ summary().pendingCount }} created</small>
        </div>
      </section>

      <section class="filters">
        <input
          type="search"
          [ngModel]="query()"
          (ngModelChange)="query.set($event)"
          placeholder="Search donor, email, phone, order or payment id"
        />
        <select [ngModel]="status()" (ngModelChange)="setStatus($event)">
          @for (option of statusOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
        <button type="button" (click)="applyFilters()">Apply</button>
      </section>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <section class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Donor</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Razorpay</th>
            </tr>
          </thead>
          <tbody>
            @for (donation of donations(); track donation.id) {
              <tr>
                <td>{{ donation.createdAt | date: 'medium' }}</td>
                <td>
                  <strong>{{ donation.donorName || 'Anonymous' }}</strong>
                  <span>{{ donation.donorEmail || donation.donorPhone || '-' }}</span>
                </td>
                <td>₹{{ formatPaise(donation.amountInPaise) }}</td>
                <td>
                  <span
                    class="badge"
                    [style.background]="statusStyle(donation.status).bg"
                    [style.color]="statusStyle(donation.status).color"
                  >
                    {{ donation.status }}
                  </span>
                </td>
                <td>
                  <code>{{ donation.providerOrderId }}</code>
                  @if (donation.providerPaymentId) {
                    <code>{{ donation.providerPaymentId }}</code>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="empty">No donations found.</td>
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
      input {
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
      input {
        min-width: min(100%, 24rem);
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
      .summary-grid small {
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
      td code {
        display: block;
      }
      code {
        color: #334155;
        font-size: 0.78rem;
      }
      .badge {
        display: inline-flex;
        border-radius: 999px;
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 900;
      }
      .empty,
      .error {
        color: #64748b;
        text-align: center;
      }
      .error {
        color: #b91c1c;
      }
      @media (max-width: 680px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class DonationsPage implements OnInit {
  private readonly api = inject(AdminApi);
  readonly donations = signal<any[]>([]);
  readonly summary = signal({
    paidAmountInPaise: 0,
    paidCount: 0,
    pendingAmountInPaise: 0,
    pendingCount: 0,
  });
  readonly loading = signal(false);
  readonly error = signal('');
  readonly page = signal(1);
  readonly pageSize = PAYMENTS_PAGE_SIZE;
  readonly total = signal(0);
  readonly status = signal('ALL');
  readonly query = signal('');
  readonly statusOptions = PAYMENT_STATUS_OPTIONS;
  readonly formatPaise = formatPaise;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .getDonations({
        page: this.page(),
        pageSize: this.pageSize,
        status: this.status() as any,
        q: this.query().trim(),
      })
      .then((result) => {
        this.donations.set(result.donations || []);
        this.summary.set(result.summary);
        this.total.set(result.pagination?.total ?? 0);
      })
      .catch(() => {
        this.error.set('Could not load donations.');
        this.donations.set([]);
      })
      .finally(() => this.loading.set(false));
  }

  applyFilters(): void {
    this.page.set(1);
    this.load();
  }

  setStatus(value: string): void {
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

  statusStyle(status: string) {
    return PAYMENT_STATUS_STYLES[status] || { bg: '#f1f5f9', color: '#334155' };
  }
}
