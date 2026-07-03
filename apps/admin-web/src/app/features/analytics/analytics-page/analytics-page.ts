import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { ANALYTICS_WINDOW_OPTIONS } from '../constants/analytics.constants';

type FunnelStep = {
  key: string;
  label: string;
  total: number;
  uniqueActors: number;
  conversionFromStart: number;
  conversionFromPrevious: number;
};

type AnalyticsReport = {
  windowDays: number;
  summary: {
    patientLogins: number;
    consultationsBooked: number;
    paymentsCompleted: number;
    prescriptionsPublished: number;
    dosesTaken: number;
    doctorWorklistViews: number;
  };
  funnel: FunnelStep[];
  dailyTrend: Array<{
    date: string;
    consultationBooked: number;
    paymentCompleted: number;
    prescriptionPublished: number;
    doseTaken: number;
  }>;
};

@Component({
  selector: 'app-analytics-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './analytics-page.scss'
})
export class AnalyticsPage {
  readonly windowOptions = ANALYTICS_WINDOW_OPTIONS;

  windowDays = 30;
  report: AnalyticsReport | null = null;
  loading = false;
  error = '';

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      this.report = (await this.api.getAnalyticsFunnels({ days: this.windowDays })) as AnalyticsReport;
    } catch {
      this.error = 'Could not load product analytics.';
      this.report = null;
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    void this.load();
  }
}
