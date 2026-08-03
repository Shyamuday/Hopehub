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
    notInterested?: number;
  };
  funnel: FunnelStep[];
  bySource: Array<{ source: string; total: number; booked: number; conversionRate: number }>;
  notInterestedByReason?: Array<{ reason: string; count: number }>;
  topVisitorIssues?: Array<{ issue: string; count: number }>;
};

type HopeHubAnalyticsReport = {
  windowDays: number;
  summary: {
    bookings: number;
    revenueInPaise: number;
    failedPayments: number;
    pendingPayments: number;
    paymentStarted: number;
    paymentSuccess: number;
    loginRequired: number;
    followUpsRequested: number;
    offerDiscountInPaise: number;
    checkoutDiscountInPaise: number;
  };
  funnel: FunnelStep[];
  dailyTrend: Array<{
    date: string;
    serviceViewed: number;
    bookingOpened: number;
    slotSelected: number;
    paymentStarted: number;
    paymentSuccess: number;
    paymentFailed: number;
  }>;
  topServices: Array<{ name: string; count: number }>;
  topOffers: Array<{ name: string; count: number }>;
  couponUsage: Array<{ code: string; count: number; discountInPaise: number }>;
};

@Component({
  selector: 'app-analytics-page',
  imports: [CommonModule, FormField],
  templateUrl: './analytics-page.html',
  styleUrl: './analytics-page.scss',
})
export class AnalyticsPage {
  readonly windowOptions = ANALYTICS_WINDOW_OPTIONS;

  readonly filterModel = signal({ windowDays: '30' });
  readonly filterForm = form(this.filterModel);
  readonly report = signal<AnalyticsReport | null>(null);
  readonly leadReport = signal<LeadFunnelReport | null>(null);
  readonly hopeHubReport = signal<HopeHubAnalyticsReport | null>(null);
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
      const [product, leads, hopeHub] = await Promise.all([
        this.api.getAnalyticsFunnels({ days }) as Promise<AnalyticsReport>,
        this.api.getLeadFunnelReport(days),
        this.api.getHopeHubAnalytics({ days }) as Promise<HopeHubAnalyticsReport>,
      ]);
      this.report.set(product);
      this.leadReport.set(leads);
      this.hopeHubReport.set(hopeHub);
    } catch {
      this.error.set('Could not load product analytics.');
      this.report.set(null);
      this.leadReport.set(null);
      this.hopeHubReport.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters() {
    void this.load();
  }

  leadSourceLabel(source: string): string {
    switch (source) {
      case 'CHAT_BOT':
        return 'Chat';
      case 'HOME_BOOKING':
        return 'Home booking';
      case 'PROMO_POPUP':
        return 'Promo popup';
      default:
        return source;
    }
  }

  formatPaise(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format((value || 0) / 100);
  }
}
