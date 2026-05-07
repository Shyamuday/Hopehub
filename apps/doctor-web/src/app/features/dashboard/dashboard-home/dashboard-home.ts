import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome {
  private readonly apiBase = environment.apiUrl;
  loading = false;
  error = '';
  summary: {
    doctorSharePercent: number;
    totals: {
      paidConsultations: number;
      grossInPaise: number;
      estimatedDoctorEarningsInPaise: number;
    };
    payments: Array<any>;
  } | null = null;

  constructor(private readonly http: HttpClient) {
    void this.loadSummary();
  }

  async loadSummary() {
    this.loading = true;
    this.error = '';
    try {
      this.summary = await firstValueFrom(
        this.http.get<DashboardHome['summary']>(`${this.apiBase}/doctor/payments/summary`)
      );
    } catch {
      this.error = 'Could not load payment summary.';
    } finally {
      this.loading = false;
    }
  }
}
