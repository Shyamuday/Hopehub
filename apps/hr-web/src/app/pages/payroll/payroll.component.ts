import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface PayrollRow {
  id: string; empType: string; name: string;
  designation: string | null; department: string | null;
  grossPaise: number; leaveDays: number; netPaise: number;
  employeeStatus: string;
}

@Component({
  selector: 'app-payroll',
  standalone: true,
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
          <button class="btn-export" (click)="exportCSV()">⬇ CSV</button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <div class="summary-cards">
          <div class="scard"><div class="sc-val">{{ rows().length }}</div><div class="sc-lbl">Employees</div></div>
          <div class="scard gross"><div class="sc-val">₹{{ paise2k(summary().totalGross) }}</div><div class="sc-lbl">Gross</div></div>
          <div class="scard net"><div class="sc-val">₹{{ paise2k(summary().totalNet) }}</div><div class="sc-lbl">Net Payout</div></div>
          <div class="scard leave"><div class="sc-val">{{ summary().totalLeave }}</div><div class="sc-lbl">Leave Days</div></div>
        </div>

        <div class="ftabs">
          @for (f of typeFilters; track f.value) {
            <button class="ftab" [class.active]="typeFilter() === f.value" (click)="typeFilter.set(f.value)">{{ f.label }}</button>
          }
          <input class="search-sm" [(ngModel)]="q" placeholder="🔍 Name…" />
        </div>

        <div class="table-wrap">
          <table class="pt">
            <thead>
              <tr>
                <th>Employee</th><th>Type</th><th>Designation</th>
                <th class="r">Gross (₹)</th><th class="r">Leave</th>
                <th class="r">Deduct (₹)</th><th class="r net">Net (₹)</th>
              </tr>
            </thead>
            <tbody>
              @for (r of filtered(); track r.id) {
                <tr>
                  <td>
                    <div class="name">{{ r.name }}</div>
                    <span class="dot" [style.color]="sc(r.employeeStatus)">● {{ r.employeeStatus }}</span>
                  </td>
                  <td><span class="type" [class.doc]="r.empType==='DOCTOR'">{{ r.empType==='DOCTOR'?'🩺':'🏪' }}</span></td>
                  <td>{{ r.designation ?? '—' }}</td>
                  <td class="r">{{ fmt(r.grossPaise) }}</td>
                  <td class="r lv">{{ r.leaveDays }}</td>
                  <td class="r ded">{{ fmt(r.grossPaise - r.netPaise) }}</td>
                  <td class="r net"><strong>{{ fmt(r.netPaise) }}</strong></td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="tot">
                <td colspan="3"><strong>Total ({{ filtered().length }})</strong></td>
                <td class="r"><strong>{{ fmt(fGross()) }}</strong></td>
                <td class="r"><strong>{{ fLeave() }}</strong></td>
                <td class="r ded"><strong>{{ fmt(fGross()-fNet()) }}</strong></td>
                <td class="r net"><strong>{{ fmt(fNet()) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
        @if (filtered().length === 0) { <div class="empty">💰<p>No data</p></div> }
      }
    </div>
    @if (toast()) { <div class="toast">{{ toast() }}</div> }
  `,
  styles: [`
    .pp { padding: 24px; color: white; max-width: 960px; margin: 0 auto; }
    .pp-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .pp-title { font-size: 20px; font-weight: 800; margin: 0 0 4px; }
    .pp-sub { font-size: 13px; color: #64748b; margin: 0; }
    .hdr-actions { display: flex; gap: 8px; }
    .month-inp { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 8px 12px; color: white; font-size: 13px; outline: none; }
    .btn-export { padding: 9px 14px; border-radius: 9px; border: 1px solid rgba(99,102,241,0.3); background: rgba(99,102,241,0.08); color: #a5b4fc; font-size: 13px; font-weight: 700; cursor: pointer; }
    .loading { text-align: center; padding: 60px; }
    .spinner { width: 32px; height: 32px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .summary-cards { display: grid; grid-template-columns: repeat(auto-fill,minmax(140px,1fr)); gap: 12px; margin-bottom: 20px; }
    .scard { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px; text-align: center; &.gross{border-color:rgba(99,102,241,0.2)} &.net{border-color:rgba(74,222,128,0.2)} &.leave{border-color:rgba(251,146,60,0.2)} }
    .sc-val { font-size: 20px; font-weight: 800; margin-bottom: 3px; }
    .sc-lbl { font-size: 12px; color: #64748b; }
    .ftabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; align-items: center; }
    .ftab { padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #64748b; font-size: 12px; font-weight: 600; cursor: pointer; &.active { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); color: #a5b4fc; } }
    .search-sm { margin-left: auto; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 6px 12px; color: white; font-size: 12px; outline: none; width: 140px; }
    .table-wrap { overflow-x: auto; }
    .pt { width: 100%; border-collapse: collapse; font-size: 13px; }
    .pt th { padding: 9px 10px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.07); text-align: left; &.r{text-align:right} }
    .pt td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; &.r{text-align:right} }
    .name { font-weight: 600; }
    .dot { font-size: 11px; color: #64748b; }
    .type { font-size: 14px; &.doc{color:#a5b4fc} }
    .lv { color: #fb923c; }
    .ded { color: #f87171; }
    .net { color: #4ade80; }
    .tot td { background: rgba(99,102,241,0.06); border-top: 1px solid rgba(99,102,241,0.2); }
    .empty { text-align: center; padding: 40px; color: #64748b; font-size: 14px; }
    .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: rgba(74,222,128,0.12); border: 1px solid rgba(74,222,128,0.3); color: #4ade80; padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; z-index: 600; }
  `]
})
export class PayrollComponent implements OnInit {
  private http = inject(HttpClient);
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
    firstValueFrom(
      this.http.get<{ rows: PayrollRow[]; summary: any }>(`${this.base}/hr/payroll`, {
        params: { month: this.selectedMonth }
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

  fGross(): number { return this.filtered().reduce((a, r) => a + r.grossPaise, 0); }
  fNet():   number { return this.filtered().reduce((a, r) => a + r.netPaise, 0); }
  fLeave(): number { return this.filtered().reduce((a, r) => a + r.leaveDays, 0); }

  fmt(p: number): string {
    return (p / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  paise2k(p: number): string {
    const v = p / 100;
    return v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : String(Math.round(v));
  }

  sc(s: string): string {
    const m: Record<string,string> = { ACTIVE:'#4ade80', ON_LEAVE:'#fb923c', RESIGNED:'#94a3b8', TERMINATED:'#f87171' };
    return m[s] ?? '#94a3b8';
  }

  exportCSV(): void {
    const lines = ['Name,Type,Designation,Department,Gross,Leave Days,Deduction,Net'];
    for (const r of this.filtered()) {
      lines.push(`"${r.name}","${r.empType}","${r.designation??''}","${r.department??''}",${r.grossPaise/100},${r.leaveDays},${(r.grossPaise-r.netPaise)/100},${r.netPaise/100}`);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-${this.selectedMonth}.csv`;
    a.click();
    this.toast.set('CSV exported ✓');
    setTimeout(() => this.toast.set(''), 2500);
  }
}
