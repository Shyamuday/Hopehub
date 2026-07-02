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
  styleUrl: './payroll.component.scss'
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
