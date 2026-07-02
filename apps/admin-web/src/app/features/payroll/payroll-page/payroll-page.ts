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
  styles: [`
    .pp { padding: 24px; max-width: 1100px; margin: 0 auto; color: white; }
    .pp-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .pp-title { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
    .pp-sub { font-size: 13px; color: #64748b; margin: 0; }
    .hdr-actions { display: flex; gap: 8px; align-items: center; }
    .month-inp { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 8px 12px; color: white; font-size: 13px; outline: none; &:focus { border-color: rgba(99,102,241,0.5); } }
    .btn-export { padding: 9px 16px; border-radius: 9px; border: 1px solid rgba(99,102,241,0.3); background: rgba(99,102,241,0.08); color: #a5b4fc; font-size: 13px; font-weight: 700; cursor: pointer; }

    .loading { text-align: center; padding: 60px; }
    .spinner { width: 32px; height: 32px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .summary-cards { display: grid; grid-template-columns: repeat(auto-fill,minmax(160px,1fr)); gap: 12px; margin-bottom: 20px; }
    .scard { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 16px; text-align: center; &.gross { border-color: rgba(99,102,241,0.2); } &.net { border-color: rgba(74,222,128,0.2); } &.leave { border-color: rgba(251,146,60,0.2); } }
    .sc-val { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .sc-lbl { font-size: 12px; color: #64748b; }

    .ftabs { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
    .ftab { padding: 6px 13px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #64748b; font-size: 12px; font-weight: 600; cursor: pointer; &.active { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); color: #a5b4fc; } }
    .search-sm { margin-left: auto; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 6px 12px; color: white; font-size: 12px; outline: none; width: 160px; }

    .table-wrap { overflow-x: auto; }
    .pt { width: 100%; border-collapse: collapse; font-size: 13px; }
    .pt th { padding: 9px 10px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.07); &.num { text-align: right; } }
    .pt td { padding: 11px 10px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; &.num { text-align: right; } }
    .pt tr:hover td { background: rgba(255,255,255,0.02); }
    .emp-name { font-weight: 600; margin-bottom: 2px; }
    .status-dot { font-size: 11px; color: #64748b; }
    .type-badge { padding: 2px 8px; border-radius: 6px; background: rgba(8,145,178,0.12); color: #06b6d4; font-size: 11px; font-weight: 700; &.doc { background: rgba(99,102,241,0.12); color: #a5b4fc; } }
    .deduction { color: #f87171; }
    .net-col { color: #4ade80; }
    .total-row td { background: rgba(99,102,241,0.06); border-top: 1px solid rgba(99,102,241,0.2); font-size: 13px; }
    .empty { text-align: center; padding: 60px; color: #64748b; }
    .empty > div:first-child { font-size: 40px; margin-bottom: 10px; }
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: rgba(74,222,128,0.12); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; z-index: 600; }
  `]
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
