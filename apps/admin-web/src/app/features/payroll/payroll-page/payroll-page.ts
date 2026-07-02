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
  templateUrl: './payroll-page.html',
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
