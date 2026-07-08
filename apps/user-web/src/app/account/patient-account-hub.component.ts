import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ClinicApiService } from '../clinic-api.service';
import { ROUTE_PATHS } from '../core/constants/app-routes.constants';
import { PATIENT_ACCOUNT_NAV } from './constants/patient-account.constants';

@Component({
  selector: 'app-patient-account-hub',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './patient-account-hub.component.html',
  styleUrl: './patient-account-hub.component.scss'
})
export class PatientAccountHubComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ClinicApiService);

  readonly loading = signal(true);
  readonly profile = signal<{
    name: string;
    mobile?: string | null;
    email?: string | null;
    patientCode?: string | null;
  } | null>(null);

  readonly quickLinks = PATIENT_ACCOUNT_NAV.filter((item) =>
    ['profile', 'addresses', 'consultations', 'orders', 'card', 'refer', 'rewards', 'dashboard'].includes(item.id)
  );

  readonly walletBalanceInPaise = signal(0);
  readonly referralCode = signal('');

  readonly dashboardLink = `/${ROUTE_PATHS.PATIENT_DASHBOARD}`;
  readonly CURRENCY_CODE = 'INR';

  formatInr(paise: number) {
    return (paise / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  }

  ngOnInit() {
    forkJoin({
      profile: this.api.patientProfile(),
      rewards: this.api.patientRewards(),
      referral: this.api.patientReferralsSummary(),
    }).subscribe({
      next: ({ profile, rewards, referral }) => {
        this.profile.set(profile.profile);
        this.walletBalanceInPaise.set(rewards.balanceInPaise ?? 0);
        this.referralCode.set(referral.code ?? '');
        this.loading.set(false);
      },
      error: () => {
        const user = this.auth.user();
        if (user) this.profile.set({ name: user.name, mobile: user.mobile, email: user.email });
        this.loading.set(false);
      },
    });
  }
}
