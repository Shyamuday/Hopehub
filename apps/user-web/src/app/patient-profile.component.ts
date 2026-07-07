import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { API_PATHS } from './core/constants/api-paths.constants';
import {
  BLOOD_GROUP_OPTIONS,
  EMERGENCY_RELATION_OPTIONS,
  DIET_TYPE_OPTIONS,
  THERMAL_OPTIONS,
  GENDER_OPTIONS,
  LANGUAGE_SUGGESTIONS,
  LIFESTYLE_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  emptyProfileForm,
  emptyReminderForm,
  formToProfilePayload,
  profileToForm,
  type PatientProfile,
  type ReminderPreferences
} from './core/constants/patient-profile.constants';
import { environment } from '../environments/environment';
import { AuthService } from './auth/auth.service';
import { AppDownloadQrComponent } from './shared/app-download-qr/app-download-qr.component';

type PatientIdCard = {
  patientCode: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  clinic?: { id: string; name: string; code: string; address?: string | null } | null;
  issuedAt?: string;
  scanUrl?: string;
};

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, FormField, AppDownloadQrComponent],
  styleUrl: './patient-profile.component.scss',
  templateUrl: './patient-profile.component.html',
})
export class PatientProfileComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingPrefs = signal(false);
  readonly savingPassword = signal(false);
  readonly successMsg = signal('');
  readonly errorMsg = signal('');
  readonly profile = signal<PatientProfile | null>(null);
  readonly patientCard = signal<PatientIdCard | null>(null);
  readonly hasPassword = signal(false);

  readonly profileFormModel = signal(emptyProfileForm());
  readonly profileForm = form(this.profileFormModel);
  readonly reminderFormModel = signal(emptyReminderForm());
  readonly reminderForm = form(this.reminderFormModel);
  readonly passwordFormModel = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });
  readonly passwordForm = form(this.passwordFormModel);

  readonly genderOptions = GENDER_OPTIONS;
  readonly dietOptions = DIET_TYPE_OPTIONS;
  readonly thermalOptions = THERMAL_OPTIONS;
  readonly maritalOptions = MARITAL_STATUS_OPTIONS;
  readonly bloodGroups = BLOOD_GROUP_OPTIONS;
  readonly lifestyleOptions = LIFESTYLE_OPTIONS;
  readonly languageSuggestions = LANGUAGE_SUGGESTIONS;
  readonly relationOptions = EMERGENCY_RELATION_OPTIONS;

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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Request failed');
    return data as T;
  }

  async load() {
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      const { profile, reminderPreferences } = await this.apiFetch<{
        profile: PatientProfile;
        reminderPreferences: ReminderPreferences;
      }>(API_PATHS.PATIENT.PROFILE);
      this.profile.set(profile);
      this.hasPassword.set(Boolean(profile.hasPassword));
      this.profileFormModel.set(profileToForm(profile));
      this.reminderFormModel.set(reminderPreferences);

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

  updateReminderField<K extends keyof ReminderPreferences>(field: K, value: ReminderPreferences[K]) {
    this.reminderFormModel.update((m) => ({ ...m, [field]: value }));
  }

  canSavePassword(): boolean {
    const p = this.passwordFormModel();
    if (!p.newPassword || p.newPassword.length < 8) return false;
    if (p.newPassword !== p.confirmPassword) return false;
    if (this.hasPassword() && !p.currentPassword) return false;
    return true;
  }

  async save() {
    this.saving.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');
    try {
      const { profile } = await this.apiFetch<{ profile: PatientProfile }>(API_PATHS.PATIENT.PROFILE, {
        method: 'PUT',
        body: JSON.stringify(formToProfilePayload(this.profileFormModel())),
      });
      this.profile.set(profile);
      this.hasPassword.set(Boolean(profile.hasPassword));
      this.successMsg.set('Profile saved.');
      setTimeout(() => this.successMsg.set(''), 3000);
    } catch (err: unknown) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      this.saving.set(false);
    }
  }

  async saveReminderPreferences() {
    this.savingPrefs.set(true);
    this.errorMsg.set('');
    try {
      await this.apiFetch(API_PATHS.PATIENT.REMINDER_PREFERENCES, {
        method: 'PUT',
        body: JSON.stringify(this.reminderFormModel()),
      });
      this.successMsg.set('Notification preferences saved.');
      setTimeout(() => this.successMsg.set(''), 3000);
    } catch (err: unknown) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Could not save preferences.');
    } finally {
      this.savingPrefs.set(false);
    }
  }

  async savePassword() {
    if (!this.canSavePassword()) return;
    this.savingPassword.set(true);
    this.errorMsg.set('');
    try {
      const p = this.passwordFormModel();
      await this.apiFetch(API_PATHS.PATIENT.PROFILE_PASSWORD, {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: p.currentPassword || undefined,
          newPassword: p.newPassword,
          confirmPassword: p.confirmPassword,
        }),
      });
      this.hasPassword.set(true);
      this.passwordFormModel.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
      this.successMsg.set('Password saved. You can now log in with email/mobile + password.');
      setTimeout(() => this.successMsg.set(''), 4000);
    } catch (err: unknown) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Could not save password.');
    } finally {
      this.savingPassword.set(false);
    }
  }
}
