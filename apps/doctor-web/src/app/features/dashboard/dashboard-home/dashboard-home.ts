import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { buildDetailRows, DetailRowsComponent } from '@hopehub/platform-ui';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import {
  capabilitiesForProvider,
  type DoctorCapabilities,
  type DoctorProfileSummary,
} from '../../../core/constants/doctor-types.constants';
import {
  buildProviderOnboardingStatus,
  type ProviderOnboardingStep,
  type ProviderOnboardingStatus,
} from '../../../core/constants/provider-onboarding.constants';
import {
  HOMEOPATHY_PROVIDER_LANGUAGE,
  PH_PROVIDER_LANGUAGE,
} from '../../../core/constants/provider-language.constants';
import { ConsultationNavigationService } from '../../../core/services/consultation-navigation.service';
import { buildPaymentSummaryStatFields } from '../constants/dashboard-stat.fields';
import { WorklistApiService } from '../../worklist/worklist-api.service';
import {
  DoctorSessionService,
  type ProviderReadiness,
} from '../../../core/services/doctor-session';

type PaymentSummary = {
  doctorSharePercent: number;
  totals: {
    paidConsultations: number;
    pendingConsultations?: number;
    grossInPaise: number;
    estimatedDoctorEarningsInPaise: number;
    pendingEarningsInPaise?: number;
  };
  payments: Array<any>;
};

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule, RouterLink, DetailRowsComponent],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss',
})
export class DashboardHome {
  readonly worklistPath = `/${ROUTE_PATHS.WORKLIST}`;
  private readonly apiBase = environment.apiUrl;
  readonly consultationNav = inject(ConsultationNavigationService);
  readonly loading = signal(false);
  readonly worklistLoading = signal(false);
  readonly error = signal('');
  readonly worklistError = signal('');
  readonly worklistCounts = signal({ assigned: 0, inProgress: 0, followUpDue: 0 });
  readonly summary = signal<PaymentSummary | null>(null);
  readonly capabilities = signal<DoctorCapabilities>(capabilitiesForProvider(null));
  readonly canPrescribe = signal(true);
  readonly listenerProfile = signal<DoctorProfileSummary | null>(null);
  readonly listenerProfileImageUrl = signal<string | null>(null);
  readonly providerProfile = signal<DoctorProfileSummary | null>(null);
  readonly language = signal(PH_PROVIDER_LANGUAGE);
  readonly onboarding = signal<ProviderOnboardingStatus>(buildProviderOnboardingStatus(null, null));
  readonly readiness = signal<ProviderReadiness | null>(null);
  readonly onboardingRequiredNotice = signal(false);

  constructor(
    private readonly http: HttpClient,
    private readonly worklistApi: WorklistApiService,
    private readonly session: DoctorSessionService,
    route: ActivatedRoute,
  ) {
    this.onboardingRequiredNotice.set(
      route.snapshot.queryParamMap.get('onboarding') === 'required',
    );
    void this.loadRole();
    void this.loadReadiness();
    void this.loadSummary();
    void this.loadWorklistCounts();
  }

  async loadReadiness() {
    try {
      this.readiness.set(await this.session.readiness());
    } catch {
      this.readiness.set(null);
    }
  }

  private async loadRole() {
    try {
      await this.session.load();
      const snapshot = this.session.snapshot();
      const capabilities = this.session.capabilities();
      this.capabilities.set(capabilities);
      this.canPrescribe.set(capabilities.prescribe);
      this.providerProfile.set(snapshot?.doctorProfile ?? null);
      this.language.set(
        snapshot?.doctorProfile?.doctorType === 'PSYCHOLOGIST'
          ? PH_PROVIDER_LANGUAGE
          : HOMEOPATHY_PROVIDER_LANGUAGE,
      );
      this.listenerProfile.set(
        this.isListenerProfile(snapshot?.doctorProfile) ? (snapshot?.doctorProfile ?? null) : null,
      );
      this.listenerProfileImageUrl.set(snapshot?.profileImageUrl ?? null);
      this.onboarding.set(
        buildProviderOnboardingStatus(snapshot?.doctorProfile ?? null, snapshot?.profileImageUrl),
      );
    } catch {
      const capabilities = capabilitiesForProvider(null);
      this.capabilities.set(capabilities);
      this.canPrescribe.set(capabilities.prescribe);
      this.language.set(HOMEOPATHY_PROVIDER_LANGUAGE);
      this.providerProfile.set(null);
      this.onboarding.set(buildProviderOnboardingStatus(null, null));
    }
  }

  launchActions() {
    const canPrescribe = this.canPrescribe();
    const capabilities = this.capabilities();
    const sessionTitle = this.language().sessionTitle;
    const profile = this.providerProfile();
    const isHopeHub = profile?.doctorType === 'PSYCHOLOGIST';
    const actions = [
      {
        label: canPrescribe ? 'Open worklist' : `Open ${sessionTitle.toLowerCase()} worklist`,
        description: canPrescribe
          ? 'See assigned cases, active consults, and follow-ups.'
          : 'See assigned support sessions and follow-ups.',
        route: this.worklistPath,
        queryParams: { view: 'ASSIGNED' },
        primary: true,
        enabled: true,
      },
      {
        label: isHopeHub ? 'Go live / pause' : 'Manage live availability',
        description: isHopeHub
          ? 'Turn chat, voice, or video availability on when you are ready.'
          : 'Control instant consultation availability.',
        route: `/${ROUTE_PATHS.ONLINE_DOCTOR}`,
        queryParams: null,
        primary: false,
        enabled: capabilities.onlineConsult,
      },
      {
        label: isHopeHub ? 'Set available times' : 'Set slots',
        description: isHopeHub
          ? 'Keep your bookable support times clear so users can choose the right session.'
          : 'Keep bookable availability clean so users can choose a time.',
        route: `/${ROUTE_PATHS.SLOTS}`,
        queryParams: null,
        primary: false,
        enabled: capabilities.slots,
      },
      {
        label: 'View earnings',
        description: 'Track paid sessions, pending payouts, and provider share.',
        route: `/${ROUTE_PATHS.EARNINGS}`,
        queryParams: null,
        primary: false,
        enabled: capabilities.earnings,
      },
      {
        label: 'Polish profile',
        description: 'Update bio, services, safety note, language, and public listing details.',
        route: `/${ROUTE_PATHS.PROFILE}`,
        queryParams: null,
        primary: false,
        enabled: true,
      },
    ];

    if (canPrescribe) {
      actions.splice(1, 0, {
        label: 'Case analysis studio',
        description: 'Open the clinical workspace for prescriptions and analysis.',
        route: `/${ROUTE_PATHS.CASE_ANALYSIS_STUDIO}`,
        queryParams: null,
        primary: false,
        enabled: capabilities.caseAnalysis,
      });
    }

    return actions.filter((action) => action.enabled);
  }

  nextOnboardingStep(): ProviderOnboardingStep | null {
    return this.onboarding().steps.find((step) => step.required && !step.complete) || null;
  }

  async loadWorklistCounts() {
    this.worklistError.set('');
    this.worklistLoading.set(true);
    try {
      const response = await this.worklistApi.loadWorklist();
      this.worklistCounts.set(response.counts);
    } catch {
      this.worklistError.set('Could not load worklist summary.');
    } finally {
      this.worklistLoading.set(false);
    }
  }

  async loadSummary() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.summary.set(
        await firstValueFrom(
          this.http.get<PaymentSummary>(`${this.apiBase}${API_PATHS.DOCTOR.PAYMENTS_SUMMARY}`),
        ),
      );
    } catch {
      this.error.set('Could not load payment summary.');
    } finally {
      this.loading.set(false);
    }
  }

  paymentStatRows(data: PaymentSummary) {
    return buildDetailRows(
      {
        paidConsultations: data.totals.paidConsultations,
        pendingConsultations: data.totals.pendingConsultations,
        grossInPaise: data.totals.grossInPaise,
        estimatedDoctorEarningsInPaise: data.totals.estimatedDoctorEarningsInPaise,
        pendingEarningsInPaise: data.totals.pendingEarningsInPaise,
        doctorSharePercent: data.doctorSharePercent,
      },
      buildPaymentSummaryStatFields({
        sessionPluralTitle: this.language().sessionPluralTitle,
      }),
    );
  }

  openPaidConsultation(consultationId?: string | null) {
    if (!consultationId) return;
    void this.consultationNav.openPrescription(consultationId);
  }

  openSession(consultationId?: string | null) {
    if (!consultationId) return;
    void this.consultationNav.openOnlineSession(consultationId);
  }

  listenerCompletionPercent(profile: DoctorProfileSummary | null = this.listenerProfile()): number {
    if (!profile?.mentalHealthProfile) return 0;
    const mental = profile.mentalHealthProfile;
    const checks = [
      Boolean(this.listenerProfileImageUrl()),
      Boolean(profile.bio && profile.bio.trim().length >= 80),
      Boolean(mental.languages?.length),
      Boolean(mental.sessionTypes?.length),
      Boolean(mental.concernsHandled?.length),
      Boolean(mental.safetyEscalationNote?.trim()),
      Boolean(mental.acceptingNewUsers),
      Boolean(mental.services?.some((service: any) => service.isActive)),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  private isListenerProfile(profile: DoctorProfileSummary | null | undefined): boolean {
    const type = profile?.mentalHealthProfile?.careTeamType;
    return type === 'PSYCHOLOGY_STUDENT_VOLUNTEER' || type === 'PEER_SUPPORT_VOLUNTEER';
  }
}
