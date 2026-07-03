import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { WorklistApiService } from '../../worklist/worklist-api.service';

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-home.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome {
  readonly worklistPath = `/${ROUTE_PATHS.WORKLIST}`;
  private readonly apiBase = environment.apiUrl;
  loading = false;
  worklistLoading = false;
  error = '';
  worklistError = '';
  worklistCounts = { assigned: 0, inProgress: 0, followUpDue: 0 };
  summary: {
    doctorSharePercent: number;
    totals: {
      paidConsultations: number;
      grossInPaise: number;
      estimatedDoctorEarningsInPaise: number;
    };
    payments: Array<any>;
  } | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly worklistApi: WorklistApiService
  ) {
    void this.loadSummary();
    void this.loadWorklistCounts();
  }

  async loadWorklistCounts() {
    this.worklistError = '';
    this.worklistLoading = true;
    try {
      const response = await this.worklistApi.loadWorklist();
      this.worklistCounts = response.counts;
    } catch {
      this.worklistError = 'Could not load worklist summary.';
    } finally {
      this.worklistLoading = false;
    }
  }

  async loadSummary() {
    this.loading = true;
    this.error = '';
    try {
      this.summary = await firstValueFrom(
        this.http.get<DashboardHome['summary']>(`${this.apiBase}${API_PATHS.DOCTOR.PAYMENTS_SUMMARY}`)
      );
    } catch {
      this.error = 'Could not load payment summary.';
    } finally {
      this.loading = false;
    }
  }
}
