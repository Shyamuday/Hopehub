import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import {
  HOMEOPATHY_PROVIDER_LANGUAGE,
  PH_PROVIDER_LANGUAGE,
} from '../../../core/constants/provider-language.constants';
import { DoctorSessionService } from '../../../core/services/doctor-session';
import { formatPaise, paiseToK } from '../constants/earnings.constants';

@Component({
  selector: 'app-earnings-page',
  imports: [FormField, DatePipe],
  templateUrl: './earnings-page.html',
  styleUrl: './earnings-page.scss',
})
export class EarningsPage implements OnInit {
  private http = inject(HttpClient);
  private session = inject(DoctorSessionService);
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
  readonly language = signal(PH_PROVIDER_LANGUAGE);
  readonly isHopeHubProvider = signal(true);

  async ngOnInit(): Promise<void> {
    await this.loadProviderContext();
    await this.load();
  }

  private async loadProviderContext(): Promise<void> {
    try {
      await this.session.load();
      const profile = this.session.snapshot()?.doctorProfile;
      const isHopeHub = profile?.doctorType === 'PSYCHOLOGIST';
      this.isHopeHubProvider.set(isHopeHub);
      this.language.set(isHopeHub ? PH_PROVIDER_LANGUAGE : HOMEOPATHY_PROVIDER_LANGUAGE);
    } catch {
      this.isHopeHubProvider.set(true);
      this.language.set(PH_PROVIDER_LANGUAGE);
    }
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const summaryRequest = firstValueFrom(
        this.http.get<any>(`${this.apiBase}${API_PATHS.DOCTOR.PAYMENTS_SUMMARY}`, {
          params: { month: this.monthModel().selectedMonth },
        }),
      );
      const payslipRequest = this.isHopeHubProvider()
        ? Promise.resolve(null)
        : firstValueFrom(
            this.http.get<any>(`${this.apiBase}${API_PATHS.DOCTOR.MY_PAYSLIP}`, {
              params: { month: this.monthModel().selectedMonth },
            }),
          );
      const [payslipRes, summary] = await Promise.all([payslipRequest, summaryRequest]);
      this.payslip.set(payslipRes?.payslip ?? null);
      this.history.set(payslipRes?.history ?? []);
      this.consultationSummary.set(summary);
    } catch {
      this.error.set('Could not load earnings data.');
    } finally {
      this.loading.set(false);
    }
  }

  providerRows(): any[] {
    return (this.consultationSummary()?.lineItems ?? []).filter(
      (row: any) => row.kind === 'CONSULTATION_PAYMENT' && (row.pricingMode || row.payoutStatus),
    );
  }

  providerSummary() {
    const rows = this.providerRows();
    return rows.reduce(
      (acc, row: any) => {
        const earning = Number(row.doctorEarningsInPaise || 0);
        const platform = Number(row.platformFeeInPaise || 0);
        acc.total += earning;
        acc.platform += platform;
        if (row.payoutStatus === 'PAID') acc.paid += earning;
        else if (row.payoutStatus === 'HOLD') acc.hold += earning;
        else acc.pending += earning;
        return acc;
      },
      { total: 0, paid: 0, pending: 0, hold: 0, platform: 0 },
    );
  }

  pricingText(row: any): string {
    return [row.serviceTitle || row.label, row.pricingLabel, this.pricingModeLabel(row.pricingMode)]
      .filter(Boolean)
      .join(' · ');
  }

  pricingModeLabel(mode?: string | null): string {
    const labels: Record<string, string> = {
      FIXED: 'Fixed',
      FREE_INTRO: 'Free intro',
      DISCOUNTED_FIRST: 'First/follow-up',
      PACKAGE: 'Package',
      FREE_VOLUNTEER: 'Emotional support listener/free',
      PER_MINUTE: 'Per-minute',
    };
    return mode ? (labels[mode] ?? mode.replace(/_/g, ' ')) : '';
  }
}
