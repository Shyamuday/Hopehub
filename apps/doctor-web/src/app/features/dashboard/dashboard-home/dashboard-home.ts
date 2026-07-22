import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { buildDetailRows, DetailRowsComponent } from '@hopehub/platform-ui';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { ConsultationNavigationService } from '../../../core/services/consultation-navigation.service';
import { PAYMENT_SUMMARY_STAT_FIELDS } from '../constants/dashboard-stat.fields';
import { WorklistApiService } from '../../worklist/worklist-api.service';

type PaymentSummary = {
  doctorSharePercent: number;
  totals: {
    paidConsultations: number;
    pendingConsultations?: number;
    grossInPaise: number;
    estimatedDoctorEarningsInPaise: number;
    pendingEarningsInPaise?: number;
  };
  payments: Array<any>;
};

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule, RouterLink, DetailRowsComponent],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome {
  readonly worklistPath = `/${ROUTE_PATHS.WORKLIST}`;
  private readonly apiBase = environment.apiUrl;
  readonly consultationNav = inject(ConsultationNavigationService);
  readonly loading = signal(false);
  readonly worklistLoading = signal(false);
  readonly error = signal('');
  readonly worklistError = signal('');
  readonly worklistCounts = signal({ assigned: 0, inProgress: 0, followUpDue: 0 });
  readonly summary = signal<PaymentSummary | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly worklistApi: WorklistApiService,
  ) {
    void this.loadSummary();
    void this.loadWorklistCounts();
  }

  async loadWorklistCounts() {
    this.worklistError.set('');
    this.worklistLoading.set(true);
    try {
      const response = await this.worklistApi.loadWorklist();
      this.worklistCounts.set(response.counts);
    } catch {
      this.worklistError.set('Could not load worklist summary.');
    } finally {
      this.worklistLoading.set(false);
    }
  }

  async loadSummary() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.summary.set(
        await firstValueFrom(
          this.http.get<PaymentSummary>(`${this.apiBase}${API_PATHS.PROVIDER.PAYMENTS_SUMMARY}`),
        ),
      );
    } catch {
      this.error.set('Could not load payment summary.');
    } finally {
      this.loading.set(false);
    }
  }

  paymentStatRows(data: PaymentSummary) {
    return buildDetailRows(
      {
        paidConsultations: data.totals.paidConsultations,
        pendingConsultations: data.totals.pendingConsultations,
        grossInPaise: data.totals.grossInPaise,
        estimatedDoctorEarningsInPaise: data.totals.estimatedDoctorEarningsInPaise,
        pendingEarningsInPaise: data.totals.pendingEarningsInPaise,
        doctorSharePercent: data.doctorSharePercent,
      },
      PAYMENT_SUMMARY_STAT_FIELDS,
    );
  }

  openPaidConsultation(consultationId?: string | null) {
    if (!consultationId) return;
    void this.consultationNav.openPrescription(consultationId);
  }
}
