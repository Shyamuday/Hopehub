import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { formatPaise, paiseToK } from '../constants/earnings.constants';

@Component({
  selector: 'app-earnings-page',
  imports: [FormField],
  templateUrl: './earnings-page.html',
  styleUrl: './earnings-page.scss'
})
export class EarningsPage implements OnInit {
  private http = inject(HttpClient);
  private apiBase = environment.apiUrl;

  loading = signal(true);
  payslip = signal<any>(null);
  history = signal<any[]>([]);
  consultationSummary = signal<any>(null);
  error = signal('');

  readonly monthModel = signal({ selectedMonth: new Date().toISOString().slice(0, 7) });
  readonly monthForm = form(this.monthModel);

  readonly formatPaise = formatPaise;
  readonly paiseToK = paiseToK;

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [payslipRes, summary] = await Promise.all([
        firstValueFrom(this.http.get<any>(`${this.apiBase}${API_PATHS.DOCTOR.MY_PAYSLIP}`, { params: { month: this.monthModel().selectedMonth } })),
        firstValueFrom(this.http.get<any>(`${this.apiBase}${API_PATHS.DOCTOR.PAYMENTS_SUMMARY}`))
      ]);
      this.payslip.set(payslipRes.payslip);
      this.history.set(payslipRes.history ?? []);
      this.consultationSummary.set(summary);
    } catch {
      this.error.set('Could not load earnings data.');
    } finally {
      this.loading.set(false);
    }
  }
}
