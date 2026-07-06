import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';
import { ANALYTICS_WINDOW_OPTIONS } from '../constants/analytics.constants';

type FunnelStep = {
  key: string;
  label: string;
  total: number;
  uniqueActors?: number;
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

type LeadFunnelReport = {
  windowDays: number;
  summary: {
    totalLeads: number;
    needsCallback: number;
    called: number;
    registered: number;
    booked: number;
  };
  funnel: FunnelStep[];
  bySource: Array<{ source: string; total: number; booked: number; conversionRate: number }>;
};

@Component({
  selector: 'app-analytics-page',
  imports: [CommonModule, FormField],
  templateUrl: './analytics-page.html',
  styleUrl: './analytics-page.scss'
})
export class AnalyticsPage {
  readonly windowOptions = ANALYTICS_WINDOW_OPTIONS;

  readonly filterModel = signal({ windowDays: '30' });
  readonly filterForm = form(this.filterModel);
  readonly report = signal<AnalyticsReport | null>(null);
  readonly leadReport = signal<LeadFunnelReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    const days = Number(this.filterModel().windowDays);
    try {
      const [product, leads] = await Promise.all([
        this.api.getAnalyticsFunnels({ days }) as Promise<AnalyticsReport>,
        this.api.getLeadFunnelReport(days)
      ]);
      this.report.set(product);
      this.leadReport.set(leads);
    } catch {
      this.error.set('Could not load product analytics.');
      this.report.set(null);
      this.leadReport.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters() {
    void this.load();
  }

  leadSourceLabel(source: string): string {
    switch (source) {
      case 'CHAT_BOT': return 'Chat';
      case 'HOME_BOOKING': return 'Home booking';
      case 'PROMO_POPUP': return 'Promo popup';
      default: return source;
    }
  }
}
