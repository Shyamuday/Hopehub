import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ProfileAvatarUploadComponent } from '@hopehub/platform-ui';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { AUTH_TOKEN_KEY } from '../../../core/constants/auth.constants';
import type {
  DoctorProfileSummary,
  ProviderType,
} from '../../../core/constants/doctor-types.constants';
import { ProviderSessionService } from '../../../core/services/provider-session';
import {
  professionFieldsForProvider,
  type ProfessionProfileField,
} from './profession-profile-fields';

function emptyProfileModel() {
  return {
    name: '',
    email: '',
    mobile: '',
    specialty: '',
    specialization: '',
    registrationNo: '',
    isAvailable: true,
    bio: '',
    yearsOfExperience: '' as number | '',
    focusAreasText: '',
    professionProfile: {} as Record<string, string>,
    defaultMethodOptionId: '',
  };
}

@Component({
  selector: 'app-profile-page',
  imports: [FormField, ProfileAvatarUploadComponent],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  private readonly http = inject(HttpClient);
  private readonly session = inject(ProviderSessionService);
  readonly apiBase = environment.apiUrl;
  readonly authTokenKey = AUTH_TOKEN_KEY;
  readonly profileImageUploadPath = API_PATHS.PROVIDER.PROFILE_IMAGE;
  profileImageUrl: string | null = null;

  readonly profileModel = signal(emptyProfileModel());
  readonly profileForm = form(this.profileModel);
  readonly professionFields = signal<ProfessionProfileField[]>([]);

  methodOptions: Array<{ id: string; label: string }> = [];
  doctorTypeLabel = '';
  specialtyFocusLabel = '';
  showOnWebsite = false;
  message = '';
  error = '';
  isLoading = false;
  saving = false;

  constructor() {
    void this.loadProfile();
  }

  async loadProfile() {
    this.isLoading = true;
    this.error = '';
    try {
      const [response, methodsRes] = await Promise.all([
        firstValueFrom(
          this.http.get<{
            profile: {
              name: string;
              email?: string | null;
              mobile?: string | null;
              doctorProfile?: DoctorProfileSummary | null;
            };
          }>(`${this.apiBase}${API_PATHS.PROVIDER.PROFILE}`),
        ),
        firstValueFrom(
          this.http.get<{ options: Array<{ id: string; label: string }> }>(
            `${this.apiBase}${API_PATHS.PROVIDER.PRESCRIPTION_OPTIONS}`,
            { params: { type: 'METHOD' } },
          ),
        ),
      ]);

      this.methodOptions = methodsRes.options;
      const profile = response.profile;
      const providerType = profile.doctorProfile?.providerType ?? null;
      this.professionFields.set(professionFieldsForProvider(providerType));
      this.profileModel.set({
        name: profile.name || '',
        email: profile.email || '',
        mobile: profile.mobile || '',
        specialty: profile.doctorProfile?.specialty || '',
        specialization: profile.doctorProfile?.specialization || '',
        registrationNo: profile.doctorProfile?.registrationNo || '',
        isAvailable: profile.doctorProfile?.isAvailable ?? true,
        bio: profile.doctorProfile?.bio || '',
        yearsOfExperience: profile.doctorProfile?.yearsOfExperience ?? '',
        focusAreasText: (profile.doctorProfile?.focusAreas ?? []).join('\n'),
        professionProfile: this.normaliseProfessionProfile(
          profile.doctorProfile?.professionProfile,
          providerType,
        ),
        defaultMethodOptionId: profile.doctorProfile?.defaultMethodOptionId || '',
      });
      this.doctorTypeLabel =
        profile.doctorProfile?.providerTypeLabel ||
        profile.doctorProfile?.doctorTypeLabel ||
        'Doctor';
      this.specialtyFocusLabel = profile.doctorProfile?.specialtyFocusLabel || '';
      this.showOnWebsite = profile.doctorProfile?.showOnWebsite ?? false;
      this.profileImageUrl =
        (profile as { profileImageUrl?: string | null }).profileImageUrl ?? null;
    } catch {
      this.error = 'Could not load profile.';
    } finally {
      this.isLoading = false;
    }
  }

  onProfileImageChange(profileImageUrl: string | null) {
    this.profileImageUrl = profileImageUrl;
  }

  professionProfileValue(key: string) {
    return this.profileModel().professionProfile[key] ?? '';
  }

  updateProfessionField(key: string, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.profileModel.update((model) => ({
      ...model,
      professionProfile: {
        ...model.professionProfile,
        [key]: value,
      },
    }));
  }

  async saveProfile() {
    const form = this.profileModel();
    this.message = '';
    this.error = '';
    this.saving = true;
    try {
      await firstValueFrom(
        this.http.put(`${this.apiBase}${API_PATHS.PROVIDER.PROFILE}`, {
          name: form.name,
          mobile: form.mobile,
          specialty: form.specialty,
          specialization: form.specialization,
          registrationNo: form.registrationNo,
          isAvailable: form.isAvailable,
          bio: form.bio.trim() || null,
          yearsOfExperience: form.yearsOfExperience !== '' ? Number(form.yearsOfExperience) : null,
          focusAreas: form.focusAreasText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          professionProfile: form.professionProfile,
          defaultMethodOptionId: form.defaultMethodOptionId || null,
        }),
      );
      await this.session.load(true);
      this.message = 'Profile updated successfully.';
    } catch {
      this.error = 'Could not save profile.';
    } finally {
      this.saving = false;
    }
  }

  private normaliseProfessionProfile(
    professionProfile: Record<string, string> | null | undefined,
    providerType: ProviderType | null,
  ) {
    const fields = professionFieldsForProvider(providerType);
    const current = professionProfile ?? {};
    return Object.fromEntries(fields.map((field) => [field.key, current[field.key] ?? '']));
  }
}
