import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { MultiSelectComponent, ProfileAvatarUploadComponent } from '@hopehub/platform-ui';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { AUTH_TOKEN_KEY } from '../../../core/constants/auth.constants';
import {
  CARE_TEAM_TYPE_LABELS,
  capabilitiesForProvider,
  careTeamTypeLabel,
  isClinicalMentalHealthCareTeamType,
  isCoachGuideCareTeamType,
  isListenerCareTeamType,
  type DoctorProfileSummary,
} from '../../../core/constants/doctor-types.constants';
import { DoctorSessionService } from '../../../core/services/doctor-session';

const LISTENER_SAFETY_ACKNOWLEDGEMENT_VERSION = 'listener-safety-v1-2026-08-07';
const CARE_TEAM_TYPE_OPTIONS = [
  'MENTAL_WELLNESS_PROFESSIONAL',
  'QUALIFIED_COUNSELLOR',
  'PSYCHOLOGY_STUDENT_VOLUNTEER',
  'PEER_SUPPORT_VOLUNTEER',
  'NLP_COACH',
  'LIFE_COACH',
  'MEDITATION_BREATHWORK_GUIDE',
  'CAREER_STUDY_MENTOR',
] as const;
type ProfileCareTeamType = (typeof CARE_TEAM_TYPE_OPTIONS)[number];
type SelectableProfileCareTeamType = ProfileCareTeamType | 'OTHER';

function emptyProfileModel() {
  return {
    name: '',
    email: '',
    gender: '',
    mobile: '',
    specialty: '',
    registrationNo: '',
    isAvailable: true,
    bio: '',
    yearsOfExperience: '' as number | '',
    focusAreasText: '',
    careTeamType: 'MENTAL_WELLNESS_PROFESSIONAL',
    careTeamTypes: ['MENTAL_WELLNESS_PROFESSIONAL'] as SelectableProfileCareTeamType[],
    otherCareTeamType: '',
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
    listenerSafetyAcknowledged: false,
    listenerSafetyAcknowledgedVersion: LISTENER_SAFETY_ACKNOWLEDGEMENT_VERSION,
    acceptsHighRiskCases: false,
    autoMatchEnabled: true,
    acceptingNewUsers: true,
    maxSessionsPerDay: '' as number | '',
    maxSessionsPerWeek: '' as number | '',
    serviceOffersText: '',
    defaultMethodOptionId: '',
  };
}

@Component({
  selector: 'app-profile-page',
  imports: [FormField, ProfileAvatarUploadComponent, MultiSelectComponent],
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
  readonly servicePricingModeOptions = [
    { value: 'FIXED', label: 'Fixed price' },
    { value: 'FREE_INTRO', label: 'First session free' },
    { value: 'DISCOUNTED_FIRST', label: 'Discounted first session' },
    { value: 'PACKAGE', label: 'Package' },
    { value: 'FREE_VOLUNTEER', label: 'Free emotional support listener support' },
    { value: 'PER_MINUTE', label: 'Per-minute pricing' },
  ];
  readonly careTeamTypeOptions: Array<{ value: SelectableProfileCareTeamType; label: string }> = [
    ...CARE_TEAM_TYPE_OPTIONS.map((value) => ({ value, label: CARE_TEAM_TYPE_LABELS[value] })),
    { value: 'OTHER', label: 'Other' },
  ];
  readonly careServices = signal<Array<any>>([]);
  readonly carePricingTemplates = signal<Array<any>>([]);

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
    void this.loadCarePricingTemplates();
  }

  isListenerProfile(): boolean {
    return this.selectedStructuredCareTeamTypes().some((type) => isListenerCareTeamType(type));
  }

  isClinicalMentalHealthProfile(): boolean {
    return (
      this.isPsychologist &&
      this.selectedStructuredCareTeamTypes().some((type) =>
        isClinicalMentalHealthCareTeamType(type),
      )
    );
  }

  isCoachGuideProfile(): boolean {
    return (
      this.isPsychologist &&
      this.selectedStructuredCareTeamTypes().some((type) => isCoachGuideCareTeamType(type))
    );
  }

  specialtyFieldLabel(): string {
    if (!this.isPsychologist) return 'Specialty';
    if (this.isListenerProfile()) return 'Listening focus';
    if (this.isCoachGuideProfile()) return 'Coaching / guide focus';
    return 'Professional focus';
  }

  registrationFieldLabel(): string {
    return this.isPsychologist ? 'Registration / certification number' : 'Registration Number';
  }

  showRegistrationNumber(): boolean {
    return !this.isPsychologist || this.isClinicalMentalHealthProfile();
  }

  isProfileCareTeamTypeSelected(value: SelectableProfileCareTeamType): boolean {
    return this.profileModel().careTeamTypes.includes(value);
  }

  private selectedStructuredCareTeamTypes(): ProfileCareTeamType[] {
    return this.profileModel().careTeamTypes.filter(
      (value): value is ProfileCareTeamType => value !== 'OTHER',
    );
  }

  toggleProfileCareTeamType(value: SelectableProfileCareTeamType, checked: boolean): void {
    this.profileModel.update((current) => {
      const next = checked
        ? Array.from(new Set([...current.careTeamTypes, value]))
        : current.careTeamTypes.filter((item) => item !== value);
      const careTeamTypes: SelectableProfileCareTeamType[] = next.length
        ? next
        : ['MENTAL_WELLNESS_PROFESSIONAL'];
      return {
        ...current,
        careTeamTypes,
        careTeamType: this.primaryProfileCareTeamType(careTeamTypes),
        otherCareTeamType: value === 'OTHER' && !checked ? '' : current.otherCareTeamType,
      };
    });
  }

  setProfileCareTeamTypes(values: string[]): void {
    this.profileModel.update((current) => {
      const selected = values.filter((value): value is SelectableProfileCareTeamType =>
        this.careTeamTypeOptions.some((option) => option.value === value),
      );
      const careTeamTypes: SelectableProfileCareTeamType[] = selected.length
        ? selected
        : ['MENTAL_WELLNESS_PROFESSIONAL'];
      return {
        ...current,
        careTeamTypes,
        careTeamType: this.primaryProfileCareTeamType(careTeamTypes),
        otherCareTeamType: careTeamTypes.includes('OTHER') ? current.otherCareTeamType : '',
      };
    });
  }

  focusAreasPlaceholder(): string {
    if (!this.isPsychologist) {
      return 'e.g.\nChronic kidney disease\nDiabetes management\nHypertension';
    }
    if (this.isListenerProfile()) {
      return 'e.g.\nLoneliness\nExam pressure\nRelationship venting';
    }
    if (this.isCoachGuideProfile()) {
      return 'e.g.\nConfidence building\nCareer stress\nBreathwork practice';
    }
    return 'e.g.\nAnxiety support\nRelationship stress\nStudent counselling';
  }

  approachLabel(): string {
    if (this.isListenerProfile()) return 'Listening approach';
    if (this.isCoachGuideProfile()) return 'Coaching / guidance approach';
    return 'Counselling approach';
  }

  listenerReadinessItems() {
    const form = this.profileModel();
    const activeServices = this.careServices().filter((service) => service.isActive !== false);
    return [
      {
        key: 'photo',
        label: 'Profile photo added',
        complete: Boolean(this.profileImageUrl),
      },
      {
        key: 'gender',
        label: 'Gender selected',
        complete: Boolean(form.gender),
      },
      {
        key: 'bio',
        label: 'Bio explains your listener role',
        complete: form.bio.trim().length >= 80,
      },
      {
        key: 'languages',
        label: 'Languages added',
        complete: this.lines(form.languagesText).length > 0,
      },
      {
        key: 'sessionTypes',
        label: 'Session types added',
        complete: this.lines(form.sessionTypesText).length > 0,
      },
      {
        key: 'concerns',
        label: 'Concerns handled added',
        complete: this.lines(form.concernsHandledText).length > 0,
      },
      {
        key: 'safety',
        label: 'Safety escalation note added',
        complete: Boolean(form.safetyEscalationNote.trim()),
      },
      {
        key: 'safetyAcknowledgement',
        label: 'Safety acknowledgement accepted',
        complete: Boolean(form.listenerSafetyAcknowledged),
      },
      {
        key: 'availability',
        label: 'Available and accepting new users',
        complete: Boolean(form.isAvailable && form.acceptingNewUsers),
      },
      {
        key: 'services',
        label: 'At least one active service/price',
        complete: activeServices.length > 0,
      },
    ];
  }

  listenerReadinessLabel(): string {
    const items = this.listenerReadinessItems();
    return `${items.filter((item) => item.complete).length}/${items.length} complete`;
  }

  async loadCarePricingTemplates() {
    try {
      const res = await firstValueFrom(
        this.http.get<{ templates: Array<any> }>(
          `${this.apiBase}/hope-hub/care-team-pricing-templates`,
        ),
      );
      this.carePricingTemplates.set(res.templates);
    } catch {
      this.carePricingTemplates.set([]);
    }
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
            gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
            mobile?: string | null;
            doctorProfile?: DoctorProfileSummary | null;
          };
        }>(`${this.apiBase}${API_PATHS.DOCTOR.PROFILE}`),
      );

      const profile = response.profile;
      this.canPrescribe = capabilitiesForProvider(profile.doctorProfile).prescribe;
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
      const profileSpecialty = profile.doctorProfile?.specialty || '';
      const primaryCareTeamType =
        (mental?.careTeamType as ProfileCareTeamType | undefined) || 'MENTAL_WELLNESS_PROFESSIONAL';
      const careTeamTypes = mental?.careTeamTypes?.length
        ? (mental.careTeamTypes as SelectableProfileCareTeamType[])
        : this.inferProfileCareTeamTypes(primaryCareTeamType, profileSpecialty);

      this.profileModel.set({
        name: profile.name || '',
        email: profile.email || '',
        gender: profile.gender || '',
        mobile: profile.mobile || '',
        specialty: profile.doctorProfile?.specialty || '',
        registrationNo: profile.doctorProfile?.registrationNo || '',
        isAvailable: profile.doctorProfile?.isAvailable ?? true,
        bio: profile.doctorProfile?.bio || '',
        yearsOfExperience: profile.doctorProfile?.yearsOfExperience ?? '',
        focusAreasText: (profile.doctorProfile?.focusAreas ?? []).join('\n'),
        careTeamType: primaryCareTeamType,
        careTeamTypes,
        otherCareTeamType: this.inferOtherCareTeamType(profileSpecialty),
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
        listenerSafetyAcknowledged: Boolean(
          mental?.listenerSafetyAcknowledgedAt || mental?.listenerSafetyAcknowledgedVersion,
        ),
        listenerSafetyAcknowledgedVersion:
          mental?.listenerSafetyAcknowledgedVersion || LISTENER_SAFETY_ACKNOWLEDGEMENT_VERSION,
        acceptsHighRiskCases: mental?.acceptsHighRiskCases ?? false,
        autoMatchEnabled: mental?.autoMatchEnabled ?? true,
        acceptingNewUsers: mental?.acceptingNewUsers ?? true,
        maxSessionsPerDay: mental?.maxSessionsPerDay ?? '',
        maxSessionsPerWeek: mental?.maxSessionsPerWeek ?? '',
        serviceOffersText: this.formatServiceOffers(mental?.services ?? []),
        defaultMethodOptionId: profile.doctorProfile?.defaultMethodOptionId || '',
      });
      this.careServices.set(this.normalizeServiceList(mental?.services ?? []));
      this.doctorTypeLabel = profile.doctorProfile?.doctorTypeLabel || 'Provider';
      this.specialtyFocusLabel = this.isPsychologist
        ? careTeamTypeLabel(mental?.careTeamType)
        : profile.doctorProfile?.specialtyFocusLabel || '';
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
          gender: form.gender || null,
          mobile: form.mobile,
          specialty: this.specialtyForProfileSave(form),
          registrationNo: this.showRegistrationNumber() ? form.registrationNo : '',
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
                careTeamType: this.primaryProfileCareTeamType(form.careTeamTypes) as any,
                careTeamTypes: this.structuredProfileCareTeamTypes(form.careTeamTypes) as any,
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
                listenerSafetyAcknowledged: form.listenerSafetyAcknowledged,
                listenerSafetyAcknowledgedVersion: LISTENER_SAFETY_ACKNOWLEDGEMENT_VERSION,
                acceptsHighRiskCases: form.acceptsHighRiskCases,
                autoMatchEnabled: form.autoMatchEnabled,
                acceptingNewUsers: form.acceptingNewUsers,
                maxSessionsPerDay:
                  form.maxSessionsPerDay !== '' ? Number(form.maxSessionsPerDay) : null,
                maxSessionsPerWeek:
                  form.maxSessionsPerWeek !== '' ? Number(form.maxSessionsPerWeek) : null,
                services: this.servicesForSave(form.serviceOffersText),
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

  private primaryProfileCareTeamType(
    selected: SelectableProfileCareTeamType[],
  ): ProfileCareTeamType {
    return (
      (selected.find((value) => value !== 'OTHER') as ProfileCareTeamType | undefined) ||
      'MENTAL_WELLNESS_PROFESSIONAL'
    );
  }

  private structuredProfileCareTeamTypes(
    selected: SelectableProfileCareTeamType[],
  ): ProfileCareTeamType[] {
    const structured = selected.filter((value): value is ProfileCareTeamType => value !== 'OTHER');
    return structured.length ? structured : ['MENTAL_WELLNESS_PROFESSIONAL'];
  }

  private inferProfileCareTeamTypes(
    primaryCareTeamType: ProfileCareTeamType,
    specialty: string,
  ): SelectableProfileCareTeamType[] {
    const specialtyText = specialty.toLowerCase();
    const selected: SelectableProfileCareTeamType[] = CARE_TEAM_TYPE_OPTIONS.filter((value) => {
      const label = CARE_TEAM_TYPE_LABELS[value].toLowerCase();
      return value === primaryCareTeamType || specialtyText.includes(label);
    });
    if (/other:/i.test(specialty)) selected.push('OTHER');
    return selected.length ? Array.from(new Set(selected)) : [primaryCareTeamType];
  }

  private inferOtherCareTeamType(specialty: string): string {
    return specialty.match(/other:\s*([^,]+)/i)?.[1]?.trim() || '';
  }

  private specialtyForProfileSave(form: ReturnType<typeof emptyProfileModel>): string {
    if (!this.isPsychologist) return form.specialty;
    const labels = form.careTeamTypes
      .filter((value) => value !== 'OTHER')
      .map((value) => CARE_TEAM_TYPE_LABELS[value as ProfileCareTeamType])
      .filter(Boolean);
    const other = form.otherCareTeamType.trim();
    if (other) labels.push(`Other: ${other}`);
    return labels.join(', ') || 'Hope Hub Provider';
  }

  addCareService() {
    this.careServices.update((services) => [
      ...services,
      {
        title: '',
        pricingMode: 'FIXED',
        priceInPaise: 50000,
        firstSessionPriceInPaise: null,
        followUpPriceInPaise: null,
        introSessionLimit: 1,
        packageSessionCount: null,
        packagePriceInPaise: null,
        freeMinutes: 5,
        pricePerMinuteInPaise: null,
        currency: 'INR',
        durationMinutes: 30,
        description: '',
        isFree: false,
        isActive: true,
        sortOrder: services.length,
      },
    ]);
  }

  removeCareService(index: number) {
    this.careServices.update((services) =>
      services
        .filter((_, i) => i !== index)
        .map((service, sortOrder) => ({ ...service, sortOrder })),
    );
  }

  updateCareService(index: number, key: string, value: string | boolean) {
    this.careServices.update((services) =>
      services.map((service, i) => {
        if (i !== index) return service;
        const next = { ...service };
        if (
          key === 'priceInPaise' ||
          key === 'firstSessionPriceInPaise' ||
          key === 'followUpPriceInPaise' ||
          key === 'packagePriceInPaise' ||
          key === 'pricePerMinuteInPaise'
        ) {
          next[key] = value === '' ? null : Math.max(0, Math.round(Number(value) * 100));
        } else if (
          key === 'durationMinutes' ||
          key === 'introSessionLimit' ||
          key === 'packageSessionCount' ||
          key === 'freeMinutes'
        ) {
          next[key] = value === '' ? null : Math.max(1, Math.round(Number(value)));
        } else {
          next[key] = value;
        }
        if (key === 'pricingMode') {
          next.isFree = value === 'FREE_VOLUNTEER';
          if (value === 'FREE_VOLUNTEER' || value === 'PER_MINUTE') {
            next.priceInPaise = 0;
          }
        }
        return next;
      }),
    );
  }

  applyPricingTemplate(index: number, templateId: string) {
    const template = this.carePricingTemplates().find((item) => item.id === templateId);
    if (!template) return;
    this.careServices.update((services) =>
      services.map((service, i) =>
        i === index
          ? {
              ...service,
              pricingMode: template.pricingMode || 'FIXED',
              priceInPaise: template.priceInPaise ?? 0,
              firstSessionPriceInPaise: template.firstSessionPriceInPaise ?? null,
              followUpPriceInPaise: template.followUpPriceInPaise ?? null,
              introSessionLimit: template.introSessionLimit || 1,
              packageSessionCount: template.packageSessionCount ?? null,
              packagePriceInPaise: template.packagePriceInPaise ?? null,
              freeMinutes: template.freeMinutes || 0,
              pricePerMinuteInPaise: template.pricePerMinuteInPaise ?? null,
              durationMinutes: template.durationMinutes || 30,
              isFree: template.isFree || template.pricingMode === 'FREE_VOLUNTEER',
              description: service.description || template.description || '',
            }
          : service,
      ),
    );
  }

  rupees(value: number | null | undefined) {
    return value == null ? '' : String(value / 100);
  }

  showFirstPrice(service: any) {
    return service.pricingMode === 'DISCOUNTED_FIRST';
  }

  showFollowUpPrice(service: any) {
    return service.pricingMode === 'FREE_INTRO' || service.pricingMode === 'DISCOUNTED_FIRST';
  }

  showPackageFields(service: any) {
    return service.pricingMode === 'PACKAGE';
  }

  showPerMinuteFields(service: any) {
    return service.pricingMode === 'PER_MINUTE';
  }

  private normalizeServiceList(services: Array<any>) {
    return services.map((service, index) => ({
      ...service,
      pricingMode: service.pricingMode || 'FIXED',
      priceInPaise: service.priceInPaise ?? 0,
      introSessionLimit: service.introSessionLimit || 1,
      freeMinutes: service.freeMinutes || 0,
      pricePerMinuteInPaise: service.pricePerMinuteInPaise ?? null,
      durationMinutes: service.durationMinutes || 30,
      isActive: service.isActive !== false,
      sortOrder: service.sortOrder ?? index,
    }));
  }

  private servicesForSave(legacyText: string) {
    const structured = this.careServices().filter((service) => service.title?.trim());
    return structured.length
      ? this.normalizeServiceList(structured)
      : this.parseServiceOffers(legacyText);
  }

  private parseServiceOffers(text: string) {
    const modes = new Set([
      'FIXED',
      'FREE_INTRO',
      'DISCOUNTED_FIRST',
      'PACKAGE',
      'FREE_VOLUNTEER',
      'PER_MINUTE',
    ]);
    const rupeesToPaise = (value: string) =>
      value === '' ? null : Math.max(0, Math.round(Number(value || 0) * 100));
    return text
      .split('\n')
      .map((line, index) => {
        const parts = line.split('|').map((part) => part.trim());
        const [title = ''] = parts;
        if (!title) return null;
        const advanced = modes.has((parts[1] || '').toUpperCase());
        const pricingMode = advanced ? parts[1].toUpperCase() : 'FIXED';
        const price = advanced ? parts[2] || '' : parts[1] || '';
        const first = advanced ? parts[3] || '' : '';
        const followUp = advanced ? parts[4] || '' : '';
        const introLimit = advanced ? parts[5] || '' : '';
        const packageSessions = advanced ? parts[6] || '' : '';
        const packagePrice = advanced ? parts[7] || '' : '';
        const freeMinutes = advanced ? parts[8] || '' : '';
        const pricePerMinute = advanced ? parts[9] || '' : '';
        const minutes = advanced ? parts[10] || '' : parts[2] || '';
        const description = advanced ? parts[11] || '' : parts[3] || '';
        const active = advanced ? parts[12] || 'yes' : parts[4] || 'yes';
        const priceInPaise = rupeesToPaise(price) ?? 0;
        return {
          title,
          description: description || null,
          pricingMode,
          priceInPaise,
          firstSessionPriceInPaise: rupeesToPaise(first),
          followUpPriceInPaise: rupeesToPaise(followUp),
          introSessionLimit: Math.max(1, Number(introLimit || 1)),
          packageSessionCount: packageSessions ? Math.max(1, Number(packageSessions)) : null,
          packagePriceInPaise: rupeesToPaise(packagePrice),
          freeMinutes: Math.max(0, Number(freeMinutes || 0)),
          pricePerMinuteInPaise: rupeesToPaise(pricePerMinute),
          currency: 'INR',
          durationMinutes: Math.max(5, Number(minutes || 30)),
          isFree:
            pricingMode === 'FREE_VOLUNTEER' ||
            (pricingMode !== 'PER_MINUTE' && priceInPaise === 0),
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
          `${service.title} | ${service.pricingMode || 'FIXED'} | ${(service.priceInPaise || 0) / 100} | ${service.firstSessionPriceInPaise == null ? '' : service.firstSessionPriceInPaise / 100} | ${service.followUpPriceInPaise == null ? '' : service.followUpPriceInPaise / 100} | ${service.introSessionLimit || 1} | ${service.packageSessionCount || ''} | ${service.packagePriceInPaise == null ? '' : service.packagePriceInPaise / 100} | ${service.freeMinutes || 0} | ${service.pricePerMinuteInPaise == null ? '' : service.pricePerMinuteInPaise / 100} | ${service.durationMinutes || 30} | ${service.description || ''} | ${service.isActive === false ? 'no' : 'yes'}`,
      )
      .join('\n');
  }
}
