import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ClinicHttpClient } from '@vitalis/clinic-api';
import { API_PATHS } from '../core/constants/api-paths.constants';
import { AuthService } from '../auth/auth.service';

type LedgerRow = {
  id: string;
  direction: 'CREDIT' | 'DEBIT';
  amountInPaise: number;
  balanceAfter: number;
  note?: string | null;
  createdAt: string;
  rule?: { code: string; name: string } | null;
};

@Component({
  selector: 'app-patient-account-rewards-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-account-rewards-page.component.html',
  styleUrl: './patient-account-rewards-page.component.scss',
})
export class PatientAccountRewardsPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly http = inject(ClinicHttpClient);

  readonly loading = signal(true);
  readonly balanceInPaise = signal(0);
  readonly ledger = signal<LedgerRow[]>([]);

  ngOnInit() {
    void this.load();
  }

  private async load() {
    try {
      if (!this.auth.token) return;
      const data = await this.http.get<{ balanceInPaise?: number; ledger?: LedgerRow[] }>(
        API_PATHS.PATIENT.REWARDS,
      );
      this.balanceInPaise.set(data.balanceInPaise ?? 0);
      this.ledger.set(data.ledger ?? []);
    } catch {
      // no-op
    } finally {
      this.loading.set(false);
    }
  }

  formatInr(paise: number) {
    return `₹${(paise / 100).toFixed(2)}`;
  }
}
