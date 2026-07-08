import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
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
  computeProfileCompletion,
  type PatientProfile,
  type ReminderPreferences,
} from './core/constants/patient-profile.constants';
import { ClinicHttpClient, CLINIC_API_BASE_URL } from '@vitalis/clinic-api';
import { AuthService } from './auth/auth.service';
import { ClinicApiService } from './clinic-api.service';
import { PatientIdCardComponent } from './shared/patient-id-card/patient-id-card.component';
import { PatientAddressBookComponent } from './shared/patient-address-book/patient-address-book.component';
import { PatientClinicalMediaPanelComponent } from './shared/patient-clinical-media/patient-clinical-media-panel';
import { ProfileAvatarUploadComponent } from '@vitalis/platform-ui';
import { AUTH_TOKEN_KEY } from './core/constants/auth.constants';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormField,
    PatientIdCardComponent,
    PatientAddressBookComponent,
    ProfileAvatarUploadComponent,
    PatientClinicalMediaPanelComponent,
  ],
  styleUrl: './patient-profile.component.scss',
  templateUrl: './patient-profile.component.html',
})
export class PatientProfileComponent implements OnInit {
  @Input() showAddresses = true;
  @Input() accountPage = false;

  private readonly auth = inject(AuthService);
  private readonly clinicApi = inject(ClinicApiService);
  private readonly http = inject(ClinicHttpClient);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingPrefs = signal(false);
  readonly savingPassword = signal(false);
  readonly successMsg = signal('');
  readonly errorMsg = signal('');
  readonly profile = signal<PatientProfile | null>(null);
  readonly clinics = signal<Array<{ id: string; name: string; address?: string | null }>>([]);
  readonly clinicsLoading = signal(true);
  readonly hasPassword = signal(false);
  readonly profileCompletion = computed(() => computeProfileCompletion(this.profile()));

  readonly profileFormModel = signal(emptyProfileForm());
  readonly profileForm = form(this.profileFormModel);
  readonly reminderFormModel = signal(emptyReminderForm());
  readonly reminderForm = form(this.reminderFormModel);
  readonly passwordFormModel = signal({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  readonly passwordForm = form(this.passwordFormModel);

  readonly genderOptions = GENDER_OPTIONS;
  readonly dietOptions = DIET_TYPE_OPTIONS;
  readonly thermalOptions = THERMAL_OPTIONS;
  readonly maritalOptions = MARITAL_STATUS_OPTIONS;
  readonly bloodGroups = BLOOD_GROUP_OPTIONS;
  readonly lifestyleOptions = LIFESTYLE_OPTIONS;
  readonly languageSuggestions = LANGUAGE_SUGGESTIONS;
  readonly relationOptions = EMERGENCY_RELATION_OPTIONS;

  readonly apiBase = inject(CLINIC_API_BASE_URL);
  readonly authTokenKey = AUTH_TOKEN_KEY;
  readonly profileImageUploadPath = API_PATHS.PATIENT.PROFILE_IMAGE;

  ngOnInit() {
    void this.load();
    void this.loadClinics();
  }

  private async loadClinics() {
    this.clinicsLoading.set(true);
    try {
      const response = await firstValueFrom(this.clinicApi.clinics());
      this.clinics.set(response.clinics || []);
    } catch {
      this.clinics.set([]);
    } finally {
      this.clinicsLoading.set(false);
    }
  }

  private get token() {
    return this.auth.token || '';
  }

  async load() {
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      const { profile, reminderPreferences } = await this.http.get<{
        profile: PatientProfile;
        reminderPreferences: ReminderPreferences;
      }>(API_PATHS.PATIENT.PROFILE);
      this.profile.set(profile);
      this.hasPassword.set(Boolean(profile.hasPassword));
      this.profileFormModel.set(profileToForm(profile));
      this.reminderFormModel.set(reminderPreferences);
    } catch {
      this.errorMsg.set('Could not load profile.');
    } finally {
      this.loading.set(false);
    }
  }

  onProfileImageChange(profileImageUrl: string | null) {
    this.profile.update((current) => (current ? { ...current, profileImageUrl } : current));
  }

  updateReminderField<K extends keyof ReminderPreferences>(
    field: K,
    value: ReminderPreferences[K],
  ) {
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
      const { profile } = await this.http.put<{ profile: PatientProfile }>(
        API_PATHS.PATIENT.PROFILE,
        formToProfilePayload(this.profileFormModel()),
      );
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
      await this.http.put(API_PATHS.PATIENT.REMINDER_PREFERENCES, this.reminderFormModel());
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
      await this.http.put(API_PATHS.PATIENT.PROFILE_PASSWORD, {
        currentPassword: p.currentPassword || undefined,
        newPassword: p.newPassword,
        confirmPassword: p.confirmPassword,
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
