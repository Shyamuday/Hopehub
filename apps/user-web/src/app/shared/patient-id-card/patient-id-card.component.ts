import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { CLINIC_API_BASE_URL, ClinicHttpClient } from '@hopehub/clinic-api';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import { AuthService } from '../../auth/auth.service';
import { AppDownloadQrComponent } from '../app-download-qr/app-download-qr.component';

export type PatientIdCard = {
  patientCode: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  clinic?: { id: string; name: string; code: string; address?: string | null } | null;
  issuedAt?: string;
  scanUrl?: string;
};

@Component({
  selector: 'app-patient-id-card',
  standalone: true,
  imports: [CommonModule, AppDownloadQrComponent],
  templateUrl: './patient-id-card.component.html',
  styleUrl: './patient-id-card.component.scss',
})
export class PatientIdCardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly http = inject(ClinicHttpClient);
  private readonly apiBase = inject(CLINIC_API_BASE_URL);

  readonly loading = signal(true);
  readonly card = signal<PatientIdCard | null>(null);

  ngOnInit() {
    void this.load();
  }

  private async load() {
    if (!this.auth.token) {
      this.loading.set(false);
      return;
    }
    try {
      try {
        const data = await this.http.get<{ card: PatientIdCard }>(API_PATHS.PATIENT.CARD);
        this.card.set(data.card);
        return;
      } catch {
        // fall through to profile lookup
      }

      const { profile } = await this.http.get<{
        profile?: {
          patientCode?: string;
          name: string;
          mobile?: string;
          email?: string;
          homeClinicStore?: PatientIdCard['clinic'];
        };
      }>(API_PATHS.PATIENT.PROFILE);

      if (profile?.patientCode) {
        this.card.set({
          patientCode: profile.patientCode,
          name: profile.name,
          mobile: profile.mobile,
          email: profile.email,
          clinic: profile.homeClinicStore ?? null,
          scanUrl: `${this.apiBase}/go/p/${encodeURIComponent(profile.patientCode)}`,
        });
      }
    } finally {
      this.loading.set(false);
    }
  }

  qrImageUrl(card: PatientIdCard) {
    const scanUrl = card.scanUrl ?? `${this.apiBase}/go/p/${encodeURIComponent(card.patientCode)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(scanUrl)}`;
  }

  printCard() {
    document.body.classList.add('printing-patient-card');
    window.print();
    window.setTimeout(() => document.body.classList.remove('printing-patient-card'), 500);
  }
}
