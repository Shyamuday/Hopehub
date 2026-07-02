import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AdminAuth } from '../../../core/services/admin-auth';

interface PayrollRow {
  id: string; empType: string; name: string;
  designation: string | null; department: string | null;
  grossPaise: number; leaveDays: number; netPaise: number;
  employeeStatus: string;
}

@Component({
  selector: 'app-payroll-page',
  imports: [FormsModule],
  template: `
    <div class="pp">
      <div class="pp-hdr">
        <div>
          <h2 class="pp-title">💰 Payroll Summary</h2>
          <p class="pp-sub">Monthly salary overview with leave deductions</p>
        </div>
        <div class="hdr-actions">
          <input type="month" [(ngModel)]="selectedMonth" (change)="load()" class="month-inp" />
          <button class="btn-export" (click)="exportCSV()">⬇ Export CSV</button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <!-- Summary Cards -->
        <div class="summary-cards">
          <div class="scard">
            <div class="sc-val">{{ rows().length }}</div>
            <div class="sc-lbl">Employees</div>
          </div>
          <div class="scard gross">
            <div class="sc-val">₹{{ paise2k(summary().totalGross) }}</div>
            <div class="sc-lbl">Total Gross</div>
          </div>
          <div class="scard net">
            <div class="sc-val">₹{{ paise2k(summary().totalNet) }}</div>
            <div class="sc-lbl">Total Net Payout</div>
          </div>
          <div class="scard leave">
            <div class="sc-val">{{ summary().totalLeave }}</div>
            <div class="sc-lbl">Total Leave Days</div>
          </div>
        </div>

        <!-- Filters -->
        <div class="ftabs">
          @for (f of typeFilters; track f.value) {
            <button class="ftab" [class.active]="typeFilter() === f.value" (click)="typeFilter.set(f.value)">{{ f.label }}</button>
          }
          <input class="search-sm" [(ngModel)]="q" placeholder="🔍 Search…" />
        </div>

        <!-- Table -->
        <div class="table-wrap">
          <table class="pt">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Designation</th>
                <th>Dept / Store</th>
                <th class="num">Gross (₹)</th>
                <th class="num">Leave Days</th>
                <th class="num">Deduction (₹)</th>
                <th class="num net-col">Net Payout (₹)</th>
              </tr>
            </thead>
            <tbody>
              @for (r of filtered(); track r.id) {
                <tr>
                  <td>
                    <div class="emp-name">{{ r.name }}</div>
                    <span class="status-dot" [style.color]="statusColor(r.employeeStatus)">● {{ r.employeeStatus }}</span>
                  </td>
                  <td>
                    <span class="type-badge" [class.doc]="r.empType === 'DOCTOR'">
                      {{ r.empType === 'DOCTOR' ? '🩺' : '🏪' }} {{ r.empType === 'DOCTOR' ? 'Doctor' : 'Staff' }}
                    </span>
                  </td>
                  <td>{{ r.designation ?? '—' }}</td>
                  <td>{{ r.department ?? '—' }}</td>
                  <td class="num">{{ fmt(r.grossPaise) }}</td>
                  <td class="num" [style.color]="r.leaveDays > 0 ? '#fb923c' : 'inherit'">{{ r.leaveDays }}</td>
                  <td class="num deduction">{{ fmt(r.grossPaise - r.netPaise) }}</td>
                  <td class="num net-col"><strong>{{ fmt(r.netPaise) }}</strong></td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="4"><strong>Total ({{ filtered().length }} employees)</strong></td>
                <td class="num"><strong>{{ fmt(filteredGross()) }}</strong></td>
                <td class="num"><strong>{{ filteredLeave() }}</strong></td>
                <td class="num deduction"><strong>{{ fmt(filteredGross() - filteredNet()) }}</strong></td>
                <td class="num net-col"><strong>{{ fmt(filteredNet()) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        @if (filtered().length === 0) {
          <div class="empty"><div>💰</div><p>No payroll data found</p></div>
        }
      }
    </div>
    @if (toast()) { <div class="toast">{{ toast() }}</div> }
  `,
  styleUrl: './payroll-page.scss'
})
export class PayrollPage implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AdminAuth);
  private base = environment.apiUrl;

  rows = signal<PayrollRow[]>([]);
  loading = signal(true);
  summary = signal({ totalGross: 0, totalNet: 0, totalLeave: 0, headcount: 0 });
  typeFilter = signal<string>('ALL');
  q = '';
  toast = signal('');

  selectedMonth = new Date().toISOString().slice(0, 7);

  typeFilters = [
    { label: 'All', value: 'ALL' },
    { label: '🩺 Doctors', value: 'DOCTOR' },
    { label: '🏪 Staff', value: 'STORE_STAFF' }
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const token = this.auth.token();
    firstValueFrom(
      this.http.get<{ rows: PayrollRow[]; summary: any }>(`${this.base}/hr/payroll`, {
        params: { month: this.selectedMonth },
        headers: { Authorization: `Bearer ${token}` }
      })
    ).then(r => { this.rows.set(r.rows); this.summary.set(r.summary); this.loading.set(false); })
     .catch(() => this.loading.set(false));
  }

  filtered(): PayrollRow[] {
    return this.rows().filter(r => {
      if (this.typeFilter() !== 'ALL' && r.empType !== this.typeFilter()) return false;
      if (this.q && !r.name.toLowerCase().includes(this.q.toLowerCase())) return false;
      return true;
    });
  }

  filteredGross(): number { return this.filtered().reduce((a, r) => a + r.grossPaise, 0); }
  filteredNet():   number { return this.filtered().reduce((a, r) => a + r.netPaise,   0); }
  filteredLeave(): number { return this.filtered().reduce((a, r) => a + r.leaveDays,  0); }

  fmt(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  paise2k(paise: number): string {
    const val = paise / 100;
    return val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(1)}K` : String(Math.round(val));
  }

  statusColor(s: string): string {
    const m: Record<string,string> = { ACTIVE: '#4ade80', ON_LEAVE: '#fb923c', RESIGNED: '#94a3b8', TERMINATED: '#f87171' };
    return m[s] ?? '#94a3b8';
  }

  exportCSV(): void {
    const rows = this.filtered();
    const header = 'Name,Type,Designation,Department,Gross (Rs),Leave Days,Deduction (Rs),Net (Rs)';
    const lines = rows.map(r =>
      `"${r.name}","${r.empType}","${r.designation ?? ''}","${r.department ?? ''}",` +
      `${r.grossPaise / 100},${r.leaveDays},${(r.grossPaise - r.netPaise) / 100},${r.netPaise / 100}`
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${this.selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('CSV exported ✓');
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }
}
