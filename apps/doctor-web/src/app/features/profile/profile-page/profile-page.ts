import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, OnDestroy, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { MultiSelectComponent, ProfileAvatarUploadComponent } from '@hopehub/platform-ui';
import {
  PROVIDER_ROLE_CODES,
  PROVIDER_SESSION_MODES,
  PROVIDER_SESSION_MODE_DEFINITIONS,
  providerSessionModeFromValue,
  type CarePricingTemplateDto,
  type ProviderRoleDefinitionDto,
  type ProviderSessionMode,
  type ProviderTaxonomyResponse,
} from '@hopehub/contracts';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
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
import { ProviderOnboardingDraftService } from '../../../core/services/provider-onboarding-draft.service';
import {
  PROVIDER_AGE_GROUP_SUGGESTIONS,
  PROVIDER_CLINICAL_METHOD_SUGGESTIONS,
  PROVIDER_COACHING_METHOD_SUGGESTIONS,
  PROVIDER_LANGUAGE_SUGGESTIONS,
  PROVIDER_LISTENER_METHOD_SUGGESTIONS,
  PROVIDER_STANDARD_SAFETY_NOTE,
} from '../../../core/constants/provider-profile-options.constants';
import { AppButtonComponent } from '../../../shared/ui/app-button.component';
import { AppActionBarComponent } from '../../../shared/ui/app-action-bar.component';
import { AppTagInputComponent } from '../../../shared/ui/app-tag-input.component';
import {
  indianMobileDisplay,
  indianMobileE164,
} from '../../../core/constants/indian-mobile.constants';
import { isProviderDisplayName } from '../../../core/constants/provider-input-validation.constants';

const LISTENER_SAFETY_ACKNOWLEDGEMENT_VERSION = 'listener-safety-v1-2026-08-07';
const CARE_TEAM_TYPE_OPTIONS = PROVIDER_ROLE_CODES;
type ProfileCareTeamType = string;
type SelectableProfileCareTeamType = ProfileCareTeamType | 'OTHER';
type ProfileSetupStepId = 'identity' | 'public' | 'care' | 'safety' | 'services';

export function resolveProviderServiceRole(
  providerRole: string | null | undefined,
  providerRoleCode: string | null | undefined,
  selectedRoles: readonly string[],
  primaryRole: string,
): string {
  return (
    [providerRole, providerRoleCode].find((role): role is string =>
      Boolean(role && selectedRoles.includes(role)),
    ) || primaryRole
  );
}

function emptyProfileModel() {
  return {
    name: '',
    email: '',
    gender: '',
    mobile: indianMobileDisplay(''),
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
  imports: [
    FormField,
    ProfileAvatarUploadComponent,
    MultiSelectComponent,
    AppButtonComponent,
    AppActionBarComponent,
    AppTagInputComponent,
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage implements OnDestroy {
  readonly sessionModes = PROVIDER_SESSION_MODES;
  readonly languageSuggestions = PROVIDER_LANGUAGE_SUGGESTIONS;
  readonly ageGroupSuggestions = PROVIDER_AGE_GROUP_SUGGESTIONS;
  private readonly http = inject(HttpClient);
  private readonly session = inject(DoctorSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly onboardingDrafts = inject(ProviderOnboardingDraftService);
  readonly apiBase = environment.apiUrl;
  readonly authTokenKey = AUTH_TOKEN_KEY;
  readonly profileImageUploadPath = API_PATHS.DOCTOR.PROFILE_IMAGE;
  profileImageUrl: string | null = null;

  readonly profileModel = signal(emptyProfileModel());
  readonly profileForm = form(this.profileModel);
  readonly servicePricingModeOptions = [
    { value: 'FIXED', label: 'Fixed price' },
    { value: 'FREE_INTRO', label: 'First session free' },
    { value: 'DISCOUNTED_FIRST', label: 'First-session offer' },
    { value: 'PACKAGE', label: 'Package' },
    { value: 'FREE_VOLUNTEER', label: 'Free emotional support listener support' },
    { value: 'PER_MINUTE', label: 'Per-minute pricing' },
  ];
  careTeamTypeOptions: Array<{ value: SelectableProfileCareTeamType; label: string }> = [
    ...CARE_TEAM_TYPE_OPTIONS.map((value) => ({ value, label: CARE_TEAM_TYPE_LABELS[value] })),
  ];
  private roleDefinitions = new Map<string, ProviderRoleDefinitionDto>();
  readonly careServices = signal<Array<any>>([]);
  readonly carePricingTemplates = signal<CarePricingTemplateDto[]>([]);
  readonly commonServiceDurations = [15, 20, 30, 45, 60, 90, 120];
  readonly customDurationServiceIndexes = signal<Set<number>>(new Set());

  methodOptions: Array<{ id: string; label: string }> = [];
  doctorTypeLabel = '';
  specialtyFocusLabel = '';
  showOnWebsite = false;
  consultationSharePercent = 60;
  listenerScreeningPassed = false;
  canPrescribe = false;
  isPsychologist = false;
  message = '';
  error = '';
  isLoading = false;
  saving = false;
  readonly activeSetupStep = signal<ProfileSetupStepId>('identity');
  readonly autosaveStatus = signal<'idle' | 'local' | 'saving' | 'saved' | 'error'>('idle');
  private profileLoaded = false;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private lastServerPayload = '';

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      this.setSetupStepFromParam(params.get('step'));
    });
    void this.loadProfile();
    void this.loadProviderTaxonomy();
    void this.loadCarePricingTemplates();
    effect(() => {
      const model = this.profileModel();
      const services = this.careServices();
      const step = this.activeSetupStep();
      if (!this.profileLoaded) return;
      this.persistDraftAndQueueAutosave(step, model, services);
    });
  }

  ngOnDestroy(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
  }

  isListenerProfile(): boolean {
    return this.selectedStructuredCareTeamTypes().some(
      (type) => this.roleCategory(type) === 'EMOTIONAL_LISTENER' || isListenerCareTeamType(type),
    );
  }

  isClinicalMentalHealthProfile(): boolean {
    return (
      this.isPsychologist &&
      this.selectedStructuredCareTeamTypes().some(
        (type) =>
          this.roleCategory(type) === 'PROFESSIONAL_CARE' ||
          isClinicalMentalHealthCareTeamType(type),
      )
    );
  }

  isCoachGuideProfile(): boolean {
    return (
      this.isPsychologist &&
      this.selectedStructuredCareTeamTypes().some(
        (type) => this.roleCategory(type) === 'COACH_MENTOR' || isCoachGuideCareTeamType(type),
      )
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

  sessionModeLabel(mode: ProviderSessionMode): string {
    return PROVIDER_SESSION_MODE_DEFINITIONS[mode].label;
  }

  sessionModeDescription(mode: ProviderSessionMode): string {
    return PROVIDER_SESSION_MODE_DEFINITIONS[mode].description;
  }

  isSessionModeSelected(mode: ProviderSessionMode): boolean {
    return this.lines(this.profileModel().sessionTypesText).some(
      (value) => providerSessionModeFromValue(value) === mode,
    );
  }

  toggleSessionMode(mode: ProviderSessionMode, checked: boolean): void {
    const current = this.lines(this.profileModel().sessionTypesText)
      .map(providerSessionModeFromValue)
      .filter((value): value is ProviderSessionMode => Boolean(value));
    const next = checked
      ? Array.from(new Set([...current, mode]))
      : current.filter((value) => value !== mode);
    this.profileModel.update((profile) => ({ ...profile, sessionTypesText: next.join('\n') }));
  }

  suggestedServicesForSelectedSubtypes() {
    const seen = new Set<string>();
    const selectedRoles = this.selectedStructuredCareTeamTypes();
    return this.carePricingTemplates()
      .filter(
        (template) =>
          !template.applicableRoleCodes.length ||
          template.applicableRoleCodes.some((role) => selectedRoles.includes(role)),
      )
      .map((template) => {
        const providerRole =
          template.applicableRoleCodes.find((role) => selectedRoles.includes(role)) ||
          selectedRoles[0] ||
          this.profileModel().careTeamType;
        return {
          ...template,
          providerRole,
          subtype: this.roleLabel(providerRole),
        };
      })
      .filter((service) => {
        const key = service.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  recommendedService() {
    return this.suggestedServicesForSelectedSubtypes()[0];
  }

  addRecommendedService(): void {
    const service = this.recommendedService();
    if (service) this.addSuggestedService(service);
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
      const structured = careTeamTypes.filter(
        (item): item is ProfileCareTeamType => item !== 'OTHER',
      );
      const primary = structured.includes(current.careTeamType as ProfileCareTeamType)
        ? (current.careTeamType as ProfileCareTeamType)
        : this.primaryProfileCareTeamType(careTeamTypes);
      return {
        ...current,
        careTeamTypes: [primary, ...careTeamTypes.filter((item) => item !== primary)],
        careTeamType: primary,
        otherCareTeamType: value === 'OTHER' && !checked ? '' : current.otherCareTeamType,
      };
    });
    this.reconcileServiceRoles();
  }

  setProfileCareTeamTypes(values: string[]): void {
    this.profileModel.update((current) => {
      const selected = values.filter((value): value is SelectableProfileCareTeamType =>
        this.careTeamTypeOptions.some((option) => option.value === value),
      );
      const careTeamTypes: SelectableProfileCareTeamType[] = selected.length
        ? selected
        : ['MENTAL_WELLNESS_PROFESSIONAL'];
      const structured = careTeamTypes.filter(
        (item): item is ProfileCareTeamType => item !== 'OTHER',
      );
      const primary = structured.includes(current.careTeamType as ProfileCareTeamType)
        ? (current.careTeamType as ProfileCareTeamType)
        : this.primaryProfileCareTeamType(careTeamTypes);
      return {
        ...current,
        careTeamTypes: [primary, ...careTeamTypes.filter((item) => item !== primary)],
        careTeamType: primary,
        otherCareTeamType: careTeamTypes.includes('OTHER') ? current.otherCareTeamType : '',
      };
    });
    this.reconcileServiceRoles();
  }

  selectedProviderRoleOptions() {
    const selected = new Set(this.selectedStructuredCareTeamTypes());
    return this.careTeamTypeOptions.filter(
      (option): option is { value: ProfileCareTeamType; label: string } =>
        option.value !== 'OTHER' && selected.has(option.value),
    );
  }

  setPrimaryProviderRole(value: string): void {
    const selected = this.selectedStructuredCareTeamTypes();
    if (!selected.includes(value as ProfileCareTeamType)) return;
    this.profileModel.update((current) => {
      const otherSelected = current.careTeamTypes.includes('OTHER');
      const reordered: SelectableProfileCareTeamType[] = [
        value as ProfileCareTeamType,
        ...selected.filter((role) => role !== value),
        ...(otherSelected ? (['OTHER'] as const) : []),
      ];
      return { ...current, careTeamType: value, careTeamTypes: reordered };
    });
  }

  private reconcileServiceRoles(): void {
    const allowed = this.selectedStructuredCareTeamTypes();
    const fallback = this.profileModel().careTeamType as ProfileCareTeamType;
    this.careServices.update((services) =>
      services.map((service) => {
        const role = resolveProviderServiceRole(
          service.providerRole,
          service.providerRoleCode,
          allowed,
          fallback,
        );
        return { ...service, providerRole: role, providerRoleCode: role };
      }),
    );
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

  concernSuggestions(): string[] {
    const suggestions = this.selectedStructuredCareTeamTypes().flatMap(
      (role) => this.roleDefinitions.get(role)?.bestFor ?? [],
    );
    return Array.from(new Set(suggestions));
  }

  methodSuggestions(): readonly string[] {
    if (this.isListenerProfile()) return PROVIDER_LISTENER_METHOD_SUGGESTIONS;
    if (this.isCoachGuideProfile()) return PROVIDER_COACHING_METHOD_SUGGESTIONS;
    if (this.isClinicalMentalHealthProfile()) return PROVIDER_CLINICAL_METHOD_SUGGESTIONS;
    return [];
  }

  useStandardSafetyNote(): void {
    this.profileModel.update((profile) => ({
      ...profile,
      safetyEscalationNote: PROVIDER_STANDARD_SAFETY_NOTE,
    }));
  }

  setListenerSafetyAcknowledgement(acknowledged: boolean): void {
    this.profileModel.update((profile) => ({
      ...profile,
      listenerSafetyAcknowledged: acknowledged,
      safetyEscalationNote:
        acknowledged && profile.safetyEscalationNote.trim().length < 20
          ? PROVIDER_STANDARD_SAFETY_NOTE
          : profile.safetyEscalationNote,
    }));
  }

  approachLabel(): string {
    if (this.isListenerProfile()) return 'Listening approach';
    if (this.isCoachGuideProfile()) return 'Coaching / guidance approach';
    return 'Counselling approach';
  }

  listenerReadinessItems() {
    const form = this.profileModel();
    const activeServices = this.careServices().filter(
      (service) =>
        service.isActive !== false &&
        String(service.title || '').trim().length >= 2 &&
        Number(service.durationMinutes) >= 5,
    );
    return [
      {
        key: 'photo',
        label: 'Profile photo added',
        complete: Boolean(this.profileImageUrl),
      },
      {
        key: 'mobile',
        label: 'Mobile number added',
        complete: form.mobile.trim().length >= 8,
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
        complete: form.safetyEscalationNote.trim().length >= 20,
      },
      {
        key: 'safetyAcknowledgement',
        label: 'Safety acknowledgement accepted',
        complete: Boolean(form.listenerSafetyAcknowledged),
      },
      {
        key: 'screening',
        label: 'Listener screening test passed',
        complete: this.listenerScreeningPassed,
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

  setupStepItems() {
    const form = this.profileModel();
    const activeServices = this.careServices().filter(
      (service) =>
        service.isActive !== false &&
        String(service.title || '').trim().length >= 2 &&
        Number(service.durationMinutes) >= 5,
    );
    const identityMissing = [
      !this.profileImageUrl ? 'profile photo' : '',
      !isProviderDisplayName(form.name) ? 'valid name' : '',
      !indianMobileE164(form.mobile) ? 'valid 10-digit Indian mobile number' : '',
      !form.gender ? 'gender' : '',
      !form.specialty.trim() && !this.isPsychologist ? 'specialty/focus' : '',
    ].filter(Boolean);
    const publicMissing = [
      form.bio.trim().length < 80 ? 'bio of at least 80 characters' : '',
      !this.isPsychologist && this.lines(form.focusAreasText).length <= 0 ? 'focus areas' : '',
    ].filter(Boolean);
    const careMissing = [
      this.structuredProfileCareTeamTypes(form.careTeamTypes).length <= 0 ? 'provider role' : '',
      this.lines(form.languagesText).length <= 0 ? 'languages' : '',
      this.lines(form.sessionTypesText).length <= 0 ? 'session types' : '',
      this.lines(form.concernsHandledText).length <= 0 ? 'concerns handled' : '',
      this.isClinicalMentalHealthProfile() && !form.qualifiedFrom.trim()
        ? 'qualification/training details'
        : '',
      this.isClinicalMentalHealthProfile() && !form.licenseCouncil.trim() ? 'license/council' : '',
      this.isClinicalMentalHealthProfile() && !form.licenseNumber.trim()
        ? 'license/registration number'
        : '',
    ].filter(Boolean);
    const safetyMissing = [
      this.isPsychologist && form.safetyEscalationNote.trim().length < 20
        ? 'safety escalation note'
        : '',
      this.isListenerProfile() && !form.listenerSafetyAcknowledged
        ? 'listener safety acknowledgement'
        : '',
    ].filter(Boolean);
    const servicesMissing = activeServices.length <= 0 ? ['one active service/price'] : [];
    const steps = [
      {
        id: 'identity' as const,
        label: 'Identity',
        title: 'Basic identity',
        description: 'Add the essentials people need to recognise and trust you.',
        complete:
          Boolean(this.profileImageUrl) &&
          isProviderDisplayName(form.name) &&
          Boolean(indianMobileE164(form.mobile)) &&
          Boolean(form.gender) &&
          Boolean(form.specialty.trim() || this.isPsychologist),
        missing: identityMissing,
      },
      {
        id: 'public' as const,
        label: 'Public profile',
        title: 'Public profile',
        description: 'Help people understand who you are and how you can support them.',
        complete:
          form.bio.trim().length >= 80 &&
          (this.isPsychologist || this.lines(form.focusAreasText).length > 0),
        missing: publicMissing,
      },
      {
        id: 'care' as const,
        label: 'Support details',
        title: 'How you support people',
        description: 'Choose the support, languages, and session styles you genuinely offer.',
        complete:
          !this.isPsychologist ||
          (this.structuredProfileCareTeamTypes(form.careTeamTypes).length > 0 &&
            this.lines(form.languagesText).length > 0 &&
            this.lines(form.sessionTypesText).length > 0 &&
            this.lines(form.concernsHandledText).length > 0 &&
            (!this.isClinicalMentalHealthProfile() ||
              (Boolean(form.qualifiedFrom.trim()) &&
                Boolean(form.licenseCouncil.trim()) &&
                Boolean(form.licenseNumber.trim())))),
        missing: careMissing,
      },
      {
        id: 'safety' as const,
        label: 'Safety',
        title: 'Safety & scope',
        description: 'Set clear boundaries so every conversation remains safe.',
        complete:
          !this.isPsychologist ||
          (form.safetyEscalationNote.trim().length >= 20 &&
            (!this.isListenerProfile() || Boolean(form.listenerSafetyAcknowledged))),
        missing: safetyMissing,
      },
      {
        id: 'services' as const,
        label: 'Services',
        title: 'Your first service',
        description: 'Start with one simple plan. You can add advanced pricing later.',
        complete: !this.isPsychologist || activeServices.length > 0,
        missing: servicesMissing,
      },
    ];

    return this.isPsychologist
      ? steps
      : steps.filter((step) => step.id === 'identity' || step.id === 'public');
  }

  setupCompletionPercent() {
    const steps = this.setupStepItems();
    return Math.round(
      (steps.filter((step) => step.complete).length / Math.max(steps.length, 1)) * 100,
    );
  }

  setupIsComplete() {
    return this.setupStepItems().every((step) => step.complete);
  }

  nextSetupStep() {
    return this.setupStepItems().find((step) => !step.complete) || null;
  }

  currentSetupStepPosition() {
    const steps = this.setupStepItems();
    const active = this.activeSetupStep();
    return Math.max(steps.findIndex((step) => step.id === active) + 1, 1);
  }

  setupStepTitle() {
    return (
      this.setupStepItems().find((step) => step.id === this.activeSetupStep())?.title ||
      'Profile setup'
    );
  }

  setupStepDescription() {
    return (
      this.setupStepItems().find((step) => step.id === this.activeSetupStep())?.description ||
      'Complete your provider profile.'
    );
  }

  activeSetupStepMissingItems() {
    return this.setupStepItems().find((step) => step.id === this.activeSetupStep())?.missing || [];
  }

  setSetupStep(step: ProfileSetupStepId) {
    const nextStep = this.nextSetupStep();
    if (
      this.setupStepItems().some((item) => item.id === step) &&
      (this.setupIsComplete() || nextStep?.id === step)
    ) {
      this.activeSetupStep.set(step);
    }
  }

  setSetupStepFromParam(step: string | null) {
    const nextStep = this.nextSetupStep();
    if (
      (step === 'identity' ||
        step === 'public' ||
        step === 'care' ||
        step === 'safety' ||
        step === 'services') &&
      (this.setupIsComplete() || nextStep?.id === step)
    ) {
      this.activeSetupStep.set(step);
    }
  }

  async saveAndContinue() {
    const activeStep = this.activeSetupStep();
    const missing = this.activeSetupStepMissingItems();
    if (missing.length) {
      this.error = `Complete this step first: ${missing.join(', ')}.`;
      return;
    }
    const saved = await this.saveProfile({ refreshProfile: false });
    if (!saved) return;
    if (this.setupIsComplete()) {
      if (this.isListenerProfile() && !this.listenerScreeningPassed) {
        try {
          // The route guard needs the newly saved listener role, but it does not need a
          // second full profile-page reload before navigation.
          await this.session.load(true);
          const navigated = await this.router.navigate(['/', ROUTE_PATHS.LISTENER_SCREENING]);
          if (!navigated) {
            this.error = 'Could not open the screening test. Please try again.';
          }
        } catch (error: any) {
          this.error = this.profileSaveErrorMessage(error);
        }
        return;
      }
      await this.router.navigate(['/', ROUTE_PATHS.SLOTS], {
        queryParams: { setup: 'availability' },
      });
      return;
    }
    const steps = this.setupStepItems();
    const index = steps.findIndex((step) => step.id === activeStep);
    const next = steps.slice(index + 1).find((step) => !step.complete) || steps[index + 1] || null;
    if (next) {
      this.activeSetupStep.set(next.id);
    }
  }

  previousSetupStep() {
    const steps = this.setupStepItems();
    const index = steps.findIndex((step) => step.id === this.activeSetupStep());
    if (index > 0) this.activeSetupStep.set(steps[index - 1].id);
  }

  canGoToPreviousSetupStep() {
    const steps = this.setupStepItems();
    return steps.findIndex((step) => step.id === this.activeSetupStep()) > 0;
  }

  setupContinueLabel() {
    const steps = this.setupStepItems();
    const lastStep = steps[steps.length - 1]?.id === this.activeSetupStep();
    if (!lastStep) return 'Continue';
    if (this.isListenerProfile() && !this.listenerScreeningPassed) return 'Continue to screening';
    return 'Continue to availability';
  }

  setListField(
    field:
      | 'focusAreasText'
      | 'qualificationsText'
      | 'languagesText'
      | 'modalitiesText'
      | 'ageGroupsText'
      | 'concernsHandledText',
    value: string,
  ) {
    this.profileModel.update((current) => ({ ...current, [field]: value }));
  }

  primaryActiveService() {
    return this.careServices().find(
      (service) => service.isActive !== false && String(service.title || '').trim().length >= 2,
    );
  }

  profilePreviewRole() {
    const selected = this.selectedProviderRoleOptions();
    return (
      selected.find((option) => option.value === this.profileModel().careTeamType)?.label ||
      selected[0]?.label ||
      this.doctorTypeLabel ||
      'Hope Hub provider'
    );
  }

  profilePreviewConcerns() {
    const form = this.profileModel();
    const concerns = this.isPsychologist
      ? this.lines(form.concernsHandledText)
      : this.lines(form.focusAreasText);
    return concerns.slice(0, 3);
  }

  profilePreviewLanguages() {
    return this.lines(this.profileModel().languagesText).slice(0, 3);
  }

  profilePreviewBio() {
    const bio = this.profileModel().bio.trim();
    return bio.length > 150 ? `${bio.slice(0, 147).trim()}…` : bio;
  }

  servicePreviewPrice(service: any) {
    if (service.pricingMode === 'FREE_VOLUNTEER' || service.isFree) return 'Free';
    if (service.pricingMode === 'PER_MINUTE') {
      return `₹${this.rupees(service.pricePerMinuteInPaise) || '0'}/min`;
    }
    return `₹${this.rupees(service.priceInPaise) || '0'}`;
  }

  servicePricingSummary(service: any): string {
    const duration = `${Number(service.durationMinutes) || 30} min`;
    if (service.pricingMode === 'FREE_VOLUNTEER' || service.isFree) return `Free · ${duration}`;
    if (service.pricingMode === 'PER_MINUTE') {
      return `₹${this.rupees(service.pricePerMinuteInPaise) || '0'}/min · ${duration}`;
    }
    if (service.pricingMode === 'PACKAGE' && service.packagePriceInPaise) {
      return `₹${this.rupees(service.packagePriceInPaise)} package · ${duration}`;
    }
    return `₹${this.rupees(service.priceInPaise) || '0'} · ${duration}`;
  }

  async loadCarePricingTemplates() {
    try {
      const res = await firstValueFrom(
        this.http.get<{ templates: CarePricingTemplateDto[] }>(
          `${this.apiBase}/hope-hub/care-team-pricing-templates`,
        ),
      );
      this.carePricingTemplates.set(
        res.templates.map((template) => ({
          ...template,
          applicableRoleCodes: template.applicableRoleCodes ?? [],
        })),
      );
    } catch {
      this.carePricingTemplates.set([]);
    }
  }

  async loadProviderTaxonomy() {
    try {
      const taxonomy = await firstValueFrom(
        this.http.get<ProviderTaxonomyResponse>(`${this.apiBase}/provider-taxonomy`),
      );
      this.roleDefinitions = new Map<string, ProviderRoleDefinitionDto>(
        (taxonomy.roles || []).map((role) => [role.code, role]),
      );
      this.careTeamTypeOptions = [
        ...(taxonomy.roles || []).map((role) => ({ value: role.code, label: role.label })),
      ];
    } catch {
      // Static shared roles remain available while the API is temporarily unavailable.
    }
  }

  async loadProfile() {
    this.profileLoaded = false;
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
      const assignedRoles = profile.doctorProfile?.providerClassification?.roles || [];
      const primaryCareTeamType =
        profile.doctorProfile?.providerClassification?.primaryRole ||
        (mental?.careTeamType as ProfileCareTeamType | undefined) ||
        'MENTAL_WELLNESS_PROFESSIONAL';
      const careTeamTypes = assignedRoles.length
        ? (assignedRoles as SelectableProfileCareTeamType[])
        : mental?.careTeamTypes?.length
          ? (mental.careTeamTypes as SelectableProfileCareTeamType[])
          : this.inferProfileCareTeamTypes(primaryCareTeamType, profileSpecialty);
      const listenerSafetyAcknowledged = Boolean(
        mental?.listenerSafetyAcknowledgedAt || mental?.listenerSafetyAcknowledgedVersion,
      );

      this.profileModel.set({
        name: profile.name || '',
        email: profile.email || '',
        gender: profile.gender || '',
        mobile: indianMobileDisplay(profile.mobile),
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
        safetyEscalationNote:
          mental?.safetyEscalationNote ||
          (listenerSafetyAcknowledged ? PROVIDER_STANDARD_SAFETY_NOTE : ''),
        listenerSafetyAcknowledged,
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
      this.consultationSharePercent = Math.max(
        0,
        Math.min(100, Number(profile.doctorProfile?.consultationSharePercent ?? 60)),
      );
      this.listenerScreeningPassed = Boolean(mental?.listenerScreening?.passed);
      this.profileImageUrl =
        (profile as { profileImageUrl?: string | null }).profileImageUrl ?? null;
      const nextServerStep = this.nextSetupStep()?.id || 'identity';
      const serverPayload = JSON.stringify(
        this.profileStepPayload(nextServerStep, this.profileModel()),
      );
      const draft = this.onboardingDrafts.load<ReturnType<typeof emptyProfileModel>, any>(
        this.profileModel().email,
      );
      const resumableStep = this.profileSetupStep(draft?.step);
      const restoredDraft = Boolean(draft?.model && resumableStep);
      if (draft?.model && resumableStep) {
        this.profileModel.update((current) => ({ ...current, ...draft.model }));
        this.careServices.set(Array.isArray(draft.services) ? draft.services : this.careServices());
        this.activeSetupStep.set(resumableStep);
        this.autosaveStatus.set('local');
      } else {
        this.activeSetupStep.set(nextServerStep);
      }
      this.profileLoaded = true;
      this.lastServerPayload = serverPayload;
      if (restoredDraft) {
        this.persistDraftAndQueueAutosave(
          this.activeSetupStep(),
          this.profileModel(),
          this.careServices(),
        );
      }
    } catch {
      this.error = 'Could not load profile.';
    } finally {
      this.isLoading = false;
    }
  }

  onProfileImageChange(profileImageUrl: string | null) {
    this.profileImageUrl = profileImageUrl;
    if (this.profileLoaded) {
      this.persistDraftAndQueueAutosave(
        this.activeSetupStep(),
        this.profileModel(),
        this.careServices(),
      );
    }
  }

  async saveProfile(
    options: { step?: ProfileSetupStepId; refreshProfile?: boolean } = {},
  ): Promise<boolean> {
    const step = options.step ?? this.activeSetupStep();
    const refreshProfile = options.refreshProfile ?? true;
    const form = this.profileModel();
    this.message = '';
    this.error = '';
    this.saving = true;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    try {
      await firstValueFrom(
        this.http
          .patch(`${this.apiBase}${API_PATHS.DOCTOR.PROFILE}`, this.profileStepPayload(step, form))
          .pipe(timeout(15_000)),
      );
      this.onboardingDrafts.clear(form.email);
      this.autosaveStatus.set('saved');
      this.lastServerPayload = JSON.stringify(this.profileStepPayload(step, form));
      if (refreshProfile) {
        await this.session.load(true);
        await this.loadProfile();
      }
      this.message = 'Profile updated successfully.';
      return true;
    } catch (error: any) {
      this.error = this.profileSaveErrorMessage(error);
      return false;
    } finally {
      this.saving = false;
    }
  }

  autosaveLabel(): string {
    switch (this.autosaveStatus()) {
      case 'local':
        return 'Draft saved on this device';
      case 'saving':
        return 'Saving…';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Draft kept on this device';
      default:
        return '';
    }
  }

  private profileSetupStep(value?: string | null): ProfileSetupStepId | null {
    return value === 'identity' ||
      value === 'public' ||
      value === 'care' ||
      value === 'safety' ||
      value === 'services'
      ? value
      : null;
  }

  private persistDraftAndQueueAutosave(
    step: ProfileSetupStepId,
    model: ReturnType<typeof emptyProfileModel>,
    services: Array<any>,
  ): void {
    if (!model.email.trim()) return;
    this.onboardingDrafts.save(model.email, { step, model, services });
    this.autosaveStatus.set('local');
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    if (this.activeSetupStepMissingItems().length) return;
    const payload = JSON.stringify(this.profileStepPayload(step, model));
    if (payload === this.lastServerPayload) return;
    this.autosaveTimer = setTimeout(
      () => void this.autosaveValidStep(step, model.email, payload),
      900,
    );
  }

  private async autosaveValidStep(
    step: ProfileSetupStepId,
    email: string,
    serializedPayload: string,
  ): Promise<void> {
    if (this.saving || step !== this.activeSetupStep()) return;
    this.autosaveStatus.set('saving');
    try {
      await firstValueFrom(
        this.http
          .patch(`${this.apiBase}${API_PATHS.DOCTOR.PROFILE}`, JSON.parse(serializedPayload))
          .pipe(timeout(15_000)),
      );
      this.lastServerPayload = serializedPayload;
      this.onboardingDrafts.clear(email);
      await this.session.load(true);
      this.autosaveStatus.set('saved');
    } catch {
      this.autosaveStatus.set('error');
    }
  }

  private profileStepPayload(
    step: ProfileSetupStepId,
    form: ReturnType<typeof emptyProfileModel>,
  ): Record<string, unknown> {
    if (step === 'identity') {
      return {
        step,
        name: form.name,
        gender: form.gender || null,
        mobile: indianMobileE164(form.mobile) || form.mobile,
        isAvailable: form.isAvailable,
        ...(this.canPrescribe ? { defaultMethodOptionId: form.defaultMethodOptionId || null } : {}),
      };
    }

    if (step === 'public') {
      return {
        step,
        bio: form.bio.trim() || null,
        yearsOfExperience: form.yearsOfExperience !== '' ? Number(form.yearsOfExperience) : null,
        focusAreas: this.lines(form.focusAreasText),
      };
    }

    if (step === 'care') {
      return {
        step,
        specialty: this.specialtyForProfileSave(form),
        registrationNo: this.showRegistrationNumber() ? form.registrationNo : '',
        mentalHealthProfile: {
          qualifications: this.lines(form.qualificationsText),
          primaryRoleCode: this.primaryProfileCareTeamType(form.careTeamTypes),
          roleCodes: this.structuredProfileCareTeamTypes(form.careTeamTypes),
          qualifiedFrom: form.qualifiedFrom || null,
          licenseNumber: form.licenseNumber || null,
          licenseCouncil: form.licenseCouncil || null,
          languages: this.lines(form.languagesText),
          modalities: this.lines(form.modalitiesText),
          sessionTypes: this.lines(form.sessionTypesText),
          ageGroups: this.lines(form.ageGroupsText),
          concernsHandled: this.lines(form.concernsHandledText),
        },
      };
    }

    if (step === 'safety') {
      return {
        step,
        mentalHealthProfile: {
          introSessionTitle: form.introSessionTitle || null,
          counsellingApproach: form.counsellingApproach || null,
          safetyEscalationNote: form.safetyEscalationNote || null,
          listenerSafetyAcknowledged: form.listenerSafetyAcknowledged,
          listenerSafetyAcknowledgedVersion: LISTENER_SAFETY_ACKNOWLEDGEMENT_VERSION,
          acceptsHighRiskCases: form.acceptsHighRiskCases,
        },
      };
    }

    return {
      step,
      mentalHealthProfile: {
        autoMatchEnabled: form.autoMatchEnabled,
        acceptingNewUsers: form.acceptingNewUsers,
        maxSessionsPerDay: form.maxSessionsPerDay !== '' ? Number(form.maxSessionsPerDay) : null,
        maxSessionsPerWeek: form.maxSessionsPerWeek !== '' ? Number(form.maxSessionsPerWeek) : null,
        services: this.servicesForSave(form.serviceOffersText),
      },
    };
  }

  private profileSaveErrorMessage(error: any) {
    if (error?.name === 'TimeoutError') {
      return 'This is taking longer than expected. Your details may have saved; please retry once before leaving this page.';
    }
    const issues = error?.error?.issues;
    if (Array.isArray(issues) && issues.length) {
      const readableIssues = issues
        .map((issue: any) => {
          const field = Array.isArray(issue.path) ? issue.path.join('.') : issue.path;
          return field ? `${field}: ${issue.message}` : issue.message;
        })
        .filter(Boolean)
        .slice(0, 3);
      if (readableIssues.length) {
        return `Please check: ${readableIssues.join('; ')}`;
      }
    }
    return error?.error?.message || 'Could not save profile.';
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
      const label = this.roleLabel(value).toLowerCase();
      return value === primaryCareTeamType || specialtyText.includes(label);
    });
    if (/other:/i.test(specialty)) selected.push('OTHER');
    return selected.length ? Array.from(new Set(selected)) : [primaryCareTeamType];
  }

  private inferOtherCareTeamType(specialty: string): string {
    return specialty.match(/other:\s*([^,]+)/i)?.[1]?.trim() || '';
  }

  private roleLabel(code: string): string {
    return this.roleDefinitions.get(code)?.label || CARE_TEAM_TYPE_LABELS[code] || code;
  }

  private roleCategory(code: string): string {
    return this.roleDefinitions.get(code)?.category || '';
  }

  private specialtyForProfileSave(form: ReturnType<typeof emptyProfileModel>): string {
    if (!this.isPsychologist) return form.specialty;
    const other = form.otherCareTeamType.trim();
    return other ? `Hope Hub Support · ${other}` : 'Hope Hub Support';
  }

  addCareService() {
    this.careServices.update((services) => [
      ...services,
      {
        providerRole: this.profileModel().careTeamType,
        title: '',
        pricingMode: 'FIXED',
        priceInPaise: 0,
        firstSessionPriceInPaise: null,
        offerEndsAt: null,
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

  addSuggestedService(service: {
    providerRole: ProfileCareTeamType;
    title: string;
    description?: string | null;
    pricingMode: CarePricingTemplateDto['pricingMode'];
    priceInPaise: number;
    firstSessionPriceInPaise?: number | null;
    offerEndsAt?: string | null;
    followUpPriceInPaise?: number | null;
    introSessionLimit?: number;
    packageSessionCount?: number | null;
    packagePriceInPaise?: number | null;
    freeMinutes?: number;
    pricePerMinuteInPaise?: number | null;
    durationMinutes: number;
    isFree?: boolean;
  }) {
    this.careServices.update((services) => [
      ...services,
      {
        providerRole: service.providerRole,
        title: service.title,
        description: service.description || '',
        pricingMode: service.pricingMode,
        priceInPaise: service.priceInPaise,
        firstSessionPriceInPaise: service.firstSessionPriceInPaise ?? null,
        offerEndsAt: service.offerEndsAt ?? null,
        followUpPriceInPaise: service.followUpPriceInPaise ?? null,
        introSessionLimit: service.introSessionLimit ?? 1,
        packageSessionCount: service.packageSessionCount ?? null,
        packagePriceInPaise: service.packagePriceInPaise ?? null,
        freeMinutes: service.freeMinutes ?? 0,
        pricePerMinuteInPaise: service.pricePerMinuteInPaise ?? null,
        durationMinutes: service.durationMinutes,
        isFree: service.isFree || service.priceInPaise === 0,
        isActive: true,
        sortOrder: services.length,
      },
    ]);
    this.activeSetupStep.set('services');
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
        if (key === 'providerRole') {
          next.providerRoleCode = value;
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

  durationChoice(index: number, service: { durationMinutes?: number | null }): string {
    const duration = Number(service.durationMinutes || 30);
    return this.customDurationServiceIndexes().has(index) ||
      !this.commonServiceDurations.includes(duration)
      ? 'custom'
      : String(duration);
  }

  setCareServiceDuration(index: number, value: string): void {
    if (value === 'custom') {
      this.customDurationServiceIndexes.update((indexes) => new Set(indexes).add(index));
      return;
    }
    this.customDurationServiceIndexes.update((indexes) => {
      const next = new Set(indexes);
      next.delete(index);
      return next;
    });
    this.updateCareService(index, 'durationMinutes', value);
  }

  offerDiscountPercent(service: {
    priceInPaise?: number | null;
    firstSessionPriceInPaise?: number | null;
  }): number {
    const regular = Number(service.priceInPaise || 0);
    const offer = Number(service.firstSessionPriceInPaise || 0);
    if (regular <= 0 || offer <= 0 || offer >= regular) return 0;
    return Math.max(1, Math.min(99, Math.round((1 - offer / regular) * 100)));
  }

  estimatedPayoutInPaise(amountInPaise: number | null | undefined): number {
    return Math.max(
      0,
      Math.round((Number(amountInPaise || 0) * this.consultationSharePercent) / 100),
    );
  }

  setCareServiceOfferDiscount(index: number, value: string): void {
    const discount = Math.max(1, Math.min(99, Math.round(Number(value) || 0)));
    this.careServices.update((services) =>
      services.map((service, currentIndex) => {
        if (currentIndex !== index) return service;
        const regular = Math.max(0, Number(service.priceInPaise || 0));
        return {
          ...service,
          firstSessionPriceInPaise: Math.round((regular * (100 - discount)) / 100),
          introSessionLimit: Math.max(1, Number(service.introSessionLimit || 1)),
          isFree: false,
        };
      }),
    );
  }

  offerEndsAtInput(value: string | Date | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }

  setCareServiceOfferEnd(index: number, value: string): void {
    this.careServices.update((services) =>
      services.map((service, currentIndex) =>
        currentIndex === index
          ? { ...service, offerEndsAt: value ? new Date(value).toISOString() : null }
          : service,
      ),
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
              offerEndsAt: service.offerEndsAt ?? null,
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

  pricingTemplatesForRole(roleCode?: string | null): CarePricingTemplateDto[] {
    return this.carePricingTemplates().filter(
      (template) =>
        !template.applicableRoleCodes.length ||
        Boolean(roleCode && template.applicableRoleCodes.includes(roleCode)),
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
    const selectedRoles = this.selectedStructuredCareTeamTypes();
    const primaryRole = this.profileModel().careTeamType || 'MENTAL_WELLNESS_PROFESSIONAL';
    return services.map((service, index) => {
      const providerRole = resolveProviderServiceRole(
        service.providerRole,
        service.providerRoleCode,
        selectedRoles,
        primaryRole,
      );
      return {
        ...service,
        providerRole,
        providerRoleCode: providerRole,
        pricingMode: service.pricingMode || 'FIXED',
        priceInPaise: service.priceInPaise ?? 0,
        offerEndsAt: service.offerEndsAt ?? null,
        introSessionLimit: service.introSessionLimit || 1,
        freeMinutes: service.freeMinutes || 0,
        pricePerMinuteInPaise: service.pricePerMinuteInPaise ?? null,
        durationMinutes: service.durationMinutes || 30,
        isActive: service.isActive !== false,
        sortOrder: service.sortOrder ?? index,
      };
    });
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
