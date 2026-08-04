import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ProfileAvatarUploadComponent } from '@hopehub/platform-ui';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { AUTH_TOKEN_KEY } from '../../../core/constants/auth.constants';
import {
  capabilitiesForDoctorType,
  type DoctorProfileSummary,
} from '../../../core/constants/doctor-types.constants';
import { DoctorSessionService } from '../../../core/services/doctor-session';

function emptyProfileModel() {
  return {
    name: '',
    email: '',
    mobile: '',
    specialty: '',
    registrationNo: '',
    isAvailable: true,
    bio: '',
    yearsOfExperience: '' as number | '',
    focusAreasText: '',
    careTeamType: 'MENTAL_WELLNESS_PROFESSIONAL',
    qualificationsText: '',
    qualifiedFrom: '',
    licenseNumber: '',
    licenseCouncil: '',
    languagesText: '',
    modalitiesText: '',
    sessionTypesText: '',
    ageGroupsText: '',
    concernsHandledText: '',
    introSessionTitle: '',
    counsellingApproach: '',
    safetyEscalationNote: '',
    acceptsHighRiskCases: false,
    serviceOffersText: '',
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
  private readonly session = inject(DoctorSessionService);
  readonly apiBase = environment.apiUrl;
  readonly authTokenKey = AUTH_TOKEN_KEY;
  readonly profileImageUploadPath = API_PATHS.DOCTOR.PROFILE_IMAGE;
  profileImageUrl: string | null = null;

  readonly profileModel = signal(emptyProfileModel());
  readonly profileForm = form(this.profileModel);

  methodOptions: Array<{ id: string; label: string }> = [];
  doctorTypeLabel = '';
  specialtyFocusLabel = '';
  showOnWebsite = false;
  canPrescribe = false;
  isPsychologist = false;
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
      const response = await firstValueFrom(
        this.http.get<{
          profile: {
            name: string;
            email?: string | null;
            mobile?: string | null;
            doctorProfile?: DoctorProfileSummary | null;
          };
        }>(`${this.apiBase}${API_PATHS.DOCTOR.PROFILE}`),
      );

      const profile = response.profile;
      this.canPrescribe = capabilitiesForDoctorType(profile.doctorProfile?.doctorType).prescribe;
      this.isPsychologist = profile.doctorProfile?.doctorType === 'PSYCHOLOGIST';
      const mental = profile.doctorProfile?.mentalHealthProfile;
      this.methodOptions = this.canPrescribe
        ? (
            await firstValueFrom(
              this.http.get<{ options: Array<{ id: string; label: string }> }>(
                `${this.apiBase}${API_PATHS.DOCTOR.PRESCRIPTION_OPTIONS}`,
                { params: { type: 'METHOD' } },
              ),
            )
          ).options
        : [];

      this.profileModel.set({
        name: profile.name || '',
        email: profile.email || '',
        mobile: profile.mobile || '',
        specialty: profile.doctorProfile?.specialty || '',
        registrationNo: profile.doctorProfile?.registrationNo || '',
        isAvailable: profile.doctorProfile?.isAvailable ?? true,
        bio: profile.doctorProfile?.bio || '',
        yearsOfExperience: profile.doctorProfile?.yearsOfExperience ?? '',
        focusAreasText: (profile.doctorProfile?.focusAreas ?? []).join('\n'),
        careTeamType: mental?.careTeamType || 'MENTAL_WELLNESS_PROFESSIONAL',
        qualificationsText: (mental?.qualifications ?? []).join('\n'),
        qualifiedFrom: mental?.qualifiedFrom || '',
        licenseNumber: mental?.licenseNumber || '',
        licenseCouncil: mental?.licenseCouncil || '',
        languagesText: (mental?.languages ?? []).join('\n'),
        modalitiesText: (mental?.modalities ?? []).join('\n'),
        sessionTypesText: (mental?.sessionTypes ?? []).join('\n'),
        ageGroupsText: (mental?.ageGroups ?? []).join('\n'),
        concernsHandledText: (mental?.concernsHandled ?? []).join('\n'),
        introSessionTitle: mental?.introSessionTitle || '',
        counsellingApproach: mental?.counsellingApproach || '',
        safetyEscalationNote: mental?.safetyEscalationNote || '',
        acceptsHighRiskCases: mental?.acceptsHighRiskCases ?? false,
        serviceOffersText: this.formatServiceOffers(mental?.services ?? []),
        defaultMethodOptionId: profile.doctorProfile?.defaultMethodOptionId || '',
      });
      this.doctorTypeLabel = profile.doctorProfile?.doctorTypeLabel || 'Doctor';
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

  async saveProfile() {
    const form = this.profileModel();
    this.message = '';
    this.error = '';
    this.saving = true;
    try {
      await firstValueFrom(
        this.http.put(`${this.apiBase}${API_PATHS.DOCTOR.PROFILE}`, {
          name: form.name,
          mobile: form.mobile,
          specialty: form.specialty,
          registrationNo: form.registrationNo,
          isAvailable: form.isAvailable,
          bio: form.bio.trim() || null,
          yearsOfExperience: form.yearsOfExperience !== '' ? Number(form.yearsOfExperience) : null,
          focusAreas: form.focusAreasText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean),
          mentalHealthProfile: this.isPsychologist
            ? {
                qualifications: this.lines(form.qualificationsText),
                careTeamType: form.careTeamType as any,
                qualifiedFrom: form.qualifiedFrom || null,
                licenseNumber: form.licenseNumber || null,
                licenseCouncil: form.licenseCouncil || null,
                languages: this.lines(form.languagesText),
                modalities: this.lines(form.modalitiesText),
                sessionTypes: this.lines(form.sessionTypesText),
                ageGroups: this.lines(form.ageGroupsText),
                concernsHandled: this.lines(form.concernsHandledText),
                introSessionTitle: form.introSessionTitle || null,
                counsellingApproach: form.counsellingApproach || null,
                safetyEscalationNote: form.safetyEscalationNote || null,
                acceptsHighRiskCases: form.acceptsHighRiskCases,
                services: this.parseServiceOffers(form.serviceOffersText),
              }
            : undefined,
          defaultMethodOptionId: this.canPrescribe ? form.defaultMethodOptionId || null : undefined,
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

  private lines(value: string) {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private parseServiceOffers(text: string) {
    return text
      .split('\n')
      .map((line, index) => {
        const [title = '', price = '', minutes = '', description = '', active = 'yes'] = line
          .split('|')
          .map((part) => part.trim());
        if (!title) return null;
        const priceInPaise = Math.max(0, Math.round(Number(price || 0) * 100));
        return {
          title,
          description: description || null,
          priceInPaise,
          currency: 'INR',
          durationMinutes: Math.max(5, Number(minutes || 30)),
          isFree: priceInPaise === 0,
          isActive: !/^no|false|inactive$/i.test(active),
          sortOrder: index,
        };
      })
      .filter(Boolean);
  }

  private formatServiceOffers(services: Array<any>) {
    return services
      .map(
        (service) =>
          `${service.title} | ${(service.priceInPaise || 0) / 100} | ${service.durationMinutes || 30} | ${service.description || ''} | ${service.isActive === false ? 'no' : 'yes'}`,
      )
      .join('\n');
  }
}
