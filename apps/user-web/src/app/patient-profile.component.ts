import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { API_PATHS } from './core/constants/api-paths.constants';
import { environment } from '../environments/environment';
import { AuthService } from './auth/auth.service';

type Profile = {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  patientCode?: string | null;
  homeClinicStore?: { id: string; name: string; code: string; address?: string | null } | null;
  allergies?: string | null;
  currentMedications?: string | null;
  chronicConditions?: string | null;
};

type PatientIdCard = {
  patientCode: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  clinic?: { id: string; name: string; code: string; address?: string | null } | null;
  issuedAt?: string;
  scanUrl?: string;
};

function emptyProfileForm() {
  return {
    name: '',
    allergies: '',
    currentMedications: '',
    chronicConditions: '',
  };
}

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, FormField],
  styleUrl: './patient-profile.component.scss',
  templateUrl: './patient-profile.component.html',
})
export class PatientProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly successMsg = signal('');
  readonly errorMsg = signal('');
  readonly profile = signal<Profile | null>(null);
  readonly patientCard = signal<PatientIdCard | null>(null);

  readonly profileFormModel = signal(emptyProfileForm());
  readonly profileForm = form(this.profileFormModel);

  ngOnInit() {
    void this.load();
  }

  private get token() {
    return this.auth.token || '';
  }

  private async apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${environment.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) throw new Error((await res.json())?.message || 'Request failed');
    return res.json() as Promise<T>;
  }

  async load() {
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      const { profile } = await this.apiFetch<{ profile: Profile }>(API_PATHS.PATIENT.PROFILE);
      this.profile.set(profile);
      this.profileFormModel.set({
        name: profile.name,
        allergies: profile.allergies || '',
        currentMedications: profile.currentMedications || '',
        chronicConditions: profile.chronicConditions || '',
      });

      try {
        const { card } = await this.apiFetch<{ card: PatientIdCard }>(API_PATHS.PATIENT.CARD);
        this.patientCard.set(card);
      } catch {
        if (profile.patientCode) {
          this.patientCard.set({
            patientCode: profile.patientCode,
            name: profile.name,
            mobile: profile.mobile,
            email: profile.email,
            clinic: profile.homeClinicStore ?? null,
            scanUrl: `${environment.apiUrl}/go/p/${encodeURIComponent(profile.patientCode)}`,
          });
        }
      }
    } catch {
      this.errorMsg.set('Could not load profile.');
    } finally {
      this.loading.set(false);
    }
  }

  printCard() {
    document.body.classList.add('printing-patient-card');
    window.print();
    window.setTimeout(() => document.body.classList.remove('printing-patient-card'), 500);
  }

  scanUrl(card: PatientIdCard): string {
    return card.scanUrl ?? `${environment.apiUrl}/go/p/${encodeURIComponent(card.patientCode)}`;
  }

  qrImageUrl(card: PatientIdCard): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(this.scanUrl(card))}`;
  }

  async save() {
    const form = this.profileFormModel();
    this.saving.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');
    try {
      const { profile } = await this.apiFetch<{ profile: Profile }>(API_PATHS.PATIENT.PROFILE, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name.trim(),
          allergies: form.allergies.trim() || undefined,
          currentMedications: form.currentMedications.trim() || undefined,
          chronicConditions: form.chronicConditions.trim() || undefined,
        }),
      });
      this.profile.set(profile);
      this.successMsg.set('Profile saved.');
      setTimeout(() => this.successMsg.set(''), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not save profile.';
      this.errorMsg.set(message);
    } finally {
      this.saving.set(false);
    }
  }
}
