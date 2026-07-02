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
  templateUrl: './payroll.component.html',
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
