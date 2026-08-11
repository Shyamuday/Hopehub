import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BookingService, HopeHubProvider } from '../../core/services/booking.service';
import {
  CONSUMER_SUPPORT_PATHS,
  ConsumerSupportPath,
  isConsumerSupportPath,
  supportPathForProvider,
  supportPathMeta,
} from '../../core/constants/support-paths.constants';
import { CONSUMER_UX_COPY } from '../../core/constants/consumer-ux-copy.constants';
import {
  CONSUMER_ROUTES,
  ConsumerAssessmentRouteMatch,
} from '../../core/constants/consumer-routes.constants';
import {
  CONSUMER_CONCERN_FLOWS,
  ConsumerConcernFlow,
  ConsumerConcernKey,
} from '../../core/constants/consumer-concerns.constants';
import {
  consumerProviderAvailabilityClass,
  consumerProviderAvailabilityLabel,
} from '../../core/constants/consumer-availability.constants';
import { consumerProviderRoleBadgeClass } from '../../core/constants/consumer-provider-presentation.constants';
import {
  CONSUMER_AGE_GROUP_FILTER_OPTIONS,
  CONSUMER_CARE_TEAM_CONCERN_FILTER_OPTIONS,
  CONSUMER_LANGUAGE_FILTER_OPTIONS,
  CONSUMER_MODALITY_FILTER_OPTIONS,
  CONSUMER_QUICK_NEED_OPTIONS,
  CONSUMER_SESSION_TYPE_FILTER_OPTIONS,
  consumerModeLabel,
  consumerSessionModeFor,
} from '../../core/constants/consumer-form-options.constants';
import { PublicCommunicationConfigService } from '../../core/services/public-communication-config.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConsumerFlowsService } from '../../core/services/consumer-flows.service';
import { LiveConnectActionService } from '../../core/services/live-connect-action.service';
import {
  ConnectOptionMode,
  ConnectOptionsComponent,
  ContinueSupportBannerComponent,
  FormDropdownComponent,
  FormDropdownOption,
  SupportPathSelectorComponent,
} from '../../shared/components';

type CareTeamListService = NonNullable<HopeHubProvider['services']>[number];
type RoleGroup = '' | ConsumerSupportPath;

@Component({
  selector: 'app-psychologists',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    SupportPathSelectorComponent,
    ConnectOptionsComponent,
    ContinueSupportBannerComponent,
    FormDropdownComponent,
  ],
  templateUrl: './psychologists.component.html',
})
export class PsychologistsComponent implements OnInit {
  readonly UX = CONSUMER_UX_COPY;
  readonly ROUTES = CONSUMER_ROUTES;
  private readonly bookingService = inject(BookingService);
  readonly publicConfig = inject(PublicCommunicationConfigService);
  private readonly notificationService = inject(NotificationService);
  private readonly consumerFlowsService = inject(ConsumerFlowsService);
  private readonly liveConnectAction = inject(LiveConnectActionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly providers = signal<HopeHubProvider[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly q = signal('');
  readonly concern = signal('');
  readonly language = signal('');
  readonly modality = signal('');
  readonly sessionType = signal('');
  readonly ageGroup = signal('');
  readonly roleGroup = signal<RoleGroup>('');
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly roleCounts = signal<Record<RoleGroup, number>>({
    '': 0,
    PROFESSIONAL_CARE: 0,
    COACH_MENTOR: 0,
    EMOTIONAL_LISTENER: 0,
  });
  readonly quickNeedOptions: FormDropdownOption[] = CONSUMER_QUICK_NEED_OPTIONS;
  readonly concernOptions: FormDropdownOption[] = CONSUMER_CARE_TEAM_CONCERN_FILTER_OPTIONS;
  readonly languageOptions: FormDropdownOption[] = CONSUMER_LANGUAGE_FILTER_OPTIONS;
  readonly modalityOptions: FormDropdownOption[] = CONSUMER_MODALITY_FILTER_OPTIONS;
  readonly sessionTypeOptions: FormDropdownOption[] = CONSUMER_SESSION_TYPE_FILTER_OPTIONS;
  readonly ageGroupOptions: FormDropdownOption[] = CONSUMER_AGE_GROUP_FILTER_OPTIONS;
  readonly roleTabs = CONSUMER_SUPPORT_PATHS;
  readonly concernFlows =
    signal<Record<ConsumerConcernKey, ConsumerConcernFlow>>(CONSUMER_CONCERN_FLOWS);

  ngOnInit(): void {
    this.consumerFlowsService.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.concernFlows.set(state.flows));
    this.hydrateFiltersFromUrl();
    this.load();
    this.loadRoleCounts();
  }

  load(options: { syncUrl?: boolean; refreshCounts?: boolean } = {}): void {
    if (options.syncUrl !== false) this.syncUrl();
    this.loading.set(true);
    this.error.set('');
    this.bookingService
      .providers({
        page: this.page(),
        pageSize: this.pageSize,
        q: this.q(),
        roleGroup: this.roleGroup(),
        concern: this.concern(),
        language: this.language(),
        modality: this.modality(),
        sessionType: this.sessionType(),
        ageGroup: this.ageGroup(),
      })
      .subscribe({
        next: (res) => {
          this.providers.set(this.sortedProviders(res.providers));
          this.total.set(res.pagination.total);
          this.totalPages.set(res.pagination.totalPages);
          this.loading.set(false);
          if (options.refreshCounts) this.loadRoleCounts();
        },
        error: () => {
          const message = 'Could not load the care team right now.';
          this.error.set(message);
          this.notificationService.error(message);
          this.loading.set(false);
        },
      });
  }

  search(value: string): void {
    this.q.set(value);
    this.page.set(1);
    this.load({ refreshCounts: true });
  }

  setFilter(
    key: 'concern' | 'language' | 'modality' | 'sessionType' | 'ageGroup',
    value: string,
  ): void {
    this[key].set(value);
    this.page.set(1);
    this.load({ refreshCounts: true });
  }

  setRoleGroup(value: RoleGroup): void {
    this.roleGroup.set(value);
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.q.set('');
    this.concern.set('');
    this.language.set('');
    this.modality.set('');
    this.sessionType.set('');
    this.ageGroup.set('');
    this.roleGroup.set('');
    this.page.set(1);
    this.load({ refreshCounts: true });
  }

  careTeamProfileLink(provider: HopeHubProvider): string[] {
    return [...CONSUMER_ROUTES.links.careTeam, provider.slug || provider.id];
  }

  assessmentForProvider(provider: HopeHubProvider): ConsumerAssessmentRouteMatch {
    return this.flowForProvider(provider).assessment;
  }

  flowForProvider(provider: HopeHubProvider): ConsumerConcernFlow {
    return this.consumerFlowsService.matchFlowForText(
      [
        provider.supportRoleLabel,
        provider.supportRoleDescription,
        provider.supportScope,
        ...(provider.focusAreas ?? []),
        ...(provider.concernsHandled ?? []),
        ...(provider.supportBestFor ?? []),
        ...(provider.services ?? []).map(
          (service) => `${service.title} ${service.description ?? ''}`,
        ),
      ].join(' '),
      this.concernFlows(),
    );
  }

  private hydrateFiltersFromUrl(): void {
    const params = this.route.snapshot.queryParamMap;
    const role = params.get('roleGroup') || '';
    this.q.set(params.get('q') || '');
    this.concern.set(params.get('concern') || '');
    this.language.set(params.get('language') || '');
    this.modality.set(params.get('modality') || '');
    this.sessionType.set(params.get('sessionType') || '');
    this.ageGroup.set(params.get('ageGroup') || '');
    this.roleGroup.set(this.isRoleGroup(role) ? role : '');
    const page = Number(params.get('page') || 1);
    this.page.set(Number.isFinite(page) && page > 0 ? page : 1);
  }

  private syncUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        q: this.q() || null,
        roleGroup: this.roleGroup() || null,
        concern: this.concern() || null,
        language: this.language() || null,
        modality: this.modality() || null,
        sessionType: this.sessionType() || null,
        ageGroup: this.ageGroup() || null,
        page: this.page() > 1 ? this.page() : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private isRoleGroup(value: string): value is RoleGroup {
    return value === '' || isConsumerSupportPath(value);
  }

  private loadRoleCounts(): void {
    const base = {
      q: this.q(),
      concern: this.concern(),
      language: this.language(),
      modality: this.modality(),
      sessionType: this.sessionType(),
      ageGroup: this.ageGroup(),
      page: 1,
      pageSize: 1,
    };
    Promise.all(
      this.roleTabs.map((tab) =>
        firstValueFrom(this.bookingService.providers({ ...base, roleGroup: tab.value }))
          .then((res) => [tab.value, res?.pagination.total ?? 0] as const)
          .catch(() => [tab.value, 0] as const),
      ),
    ).then((entries) => {
      this.roleCounts.set(Object.fromEntries(entries) as Record<RoleGroup, number>);
    });
  }

  recommendedHint(): string {
    const concern = `${this.concern()} ${this.q()}`.toLowerCase();
    if (/anxiety|stress|panic|depress|trauma|relationship|family/.test(concern)) {
      return 'Recommended: start with Professional care for structured support.';
    }
    if (/lonely|loneliness|breakup|motivation|heartbreak|friend/.test(concern)) {
      return `Recommended: ${CONSUMER_UX_COPY.cta.talkNow} is a softer first step when you mainly need to vent or feel heard.`;
    }
    if (/study|career|exam|focus|job/.test(concern)) {
      return 'Recommended: Clarity & growth first, then Professional care if emotions feel heavy.';
    }
    if (/breath|sleep|relax|mindful|meditation/.test(concern)) {
      return 'Recommended: Clarity & growth for coaching, breathing, and grounding practice.';
    }
    return 'Tip: choose one of the three support paths if you already know what kind of help you want.';
  }

  roleCount(value: RoleGroup): number {
    return this.roleCounts()[value] || 0;
  }

  bestMatchLabel(provider: HopeHubProvider): string {
    const concernText = `${this.concern()} ${this.q()}`.toLowerCase();
    const role = provider.supportRole || '';
    const tone = provider.supportTierTone || '';
    if (/anxiety|stress|panic|depress|trauma|relationship|family/.test(concernText)) {
      if (tone === 'professional' || role === 'QUALIFIED_COUNSELLOR') return 'Best match';
    }
    if (/lonely|loneliness|breakup|motivation|heartbreak|friend/.test(concernText)) {
      if (role === 'PEER_SUPPORT_VOLUNTEER' || tone === 'coach') return 'Best match';
    }
    if (/study|career|exam|focus|job/.test(concernText)) {
      if (role === 'CAREER_STUDY_MENTOR' || tone === 'coach') return 'Best match';
    }
    if (/breath|sleep|relax|mindful|meditation/.test(concernText)) {
      if (role === 'MEDITATION_BREATHWORK_GUIDE' || tone === 'wellness') return 'Best match';
    }
    if (this.roleGroup()) return 'Selected type';
    return '';
  }

  emptySuggestion(): string {
    const tab = this.roleTabs.find((item) => item.value === this.roleGroup());
    if (this.roleGroup() === 'EMOTIONAL_LISTENER') {
      return 'No emotional support listeners match this filter right now. Try Professional care or send a general request so the team can guide you.';
    }
    if (this.roleGroup() === 'PROFESSIONAL_CARE') {
      return 'No psychologist/counsellor match found for this filter. Try another support path, adjust concern/language, or book a general request.';
    }
    if (this.roleGroup() === 'COACH_MENTOR') {
      return 'No coach/mentor match found for this filter. Try another support path or send a general request.';
    }
    if (this.roleGroup()) {
      return `No ${tab?.label.toLowerCase()} match this filter right now. Try another support path or send a general request.`;
    }
    return 'No profiles match these filters. Try clearing filters or book a general request.';
  }

  private sortedProviders(providers: HopeHubProvider[]): HopeHubProvider[] {
    const concernText = `${this.concern()} ${this.q()}`.toLowerCase();
    const roleWeight = (provider: HopeHubProvider) => {
      const tone = provider.supportTierTone || '';
      const role = provider.supportRole || '';
      if (/anxiety|stress|panic|depress|trauma|relationship|family/.test(concernText)) {
        if (tone === 'professional') return 0;
        if (role === 'QUALIFIED_COUNSELLOR') return 1;
      }
      if (/lonely|loneliness|breakup|motivation|heartbreak|friend/.test(concernText)) {
        if (role === 'PEER_SUPPORT_VOLUNTEER') return 0;
        if (tone === 'coach') return 1;
      }
      if (/study|career|exam|focus|job/.test(concernText)) {
        if (role === 'CAREER_STUDY_MENTOR') return 0;
        if (tone === 'coach') return 1;
      }
      if (/breath|sleep|relax|mindful|meditation/.test(concernText)) {
        if (role === 'MEDITATION_BREATHWORK_GUIDE') return 0;
        if (tone === 'wellness') return 1;
      }
      return 5;
    };
    return [...providers].sort((a, b) => {
      const byRole = roleWeight(a) - roleWeight(b);
      if (byRole) return byRole;
      const aHasService = a.services?.length ? 0 : 1;
      const bHasService = b.services?.length ? 0 : 1;
      if (aHasService !== bHasService) return aHasService - bHasService;
      return a.name.localeCompare(b.name);
    });
  }

  setPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) {
      return;
    }
    this.page.set(page);
    this.load();
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, index) => index + 1);
  }

  providerImageUrl(provider: HopeHubProvider): string | null {
    if (!provider.profileImageUrl) {
      return null;
    }
    if (provider.profileImageUrl.startsWith('http')) {
      return provider.profileImageUrl;
    }
    return `${environment.apiUrl}${provider.profileImageUrl}`;
  }

  providerRoleLabel(provider: HopeHubProvider): string {
    return provider.supportRoleLabel || this.publicConfig.defaultCareRoleLabel;
  }

  providerRoleBadgeClass(provider: HopeHubProvider): string {
    return consumerProviderRoleBadgeClass(provider);
  }

  providerTierLabel(provider: HopeHubProvider): string {
    return provider.supportTierLabel || (provider.isClinicalCare ? 'Professional care' : 'Support');
  }

  genderLabel(provider: HopeHubProvider): string {
    const labels: Record<string, string> = {
      FEMALE: 'Female',
      MALE: 'Male',
      OTHER: 'Other',
      PREFER_NOT_TO_SAY: 'Prefer not to say',
    };
    return provider.gender ? labels[provider.gender] || provider.gender : '';
  }

  languagesLabel(provider: HopeHubProvider, limit = 3): string {
    const languages = provider.languages ?? [];
    if (!languages.length) return '';
    const visible = languages.slice(0, limit).join(', ');
    const extra = languages.length > limit ? ` +${languages.length - limit}` : '';
    return `${visible}${extra}`;
  }

  providerRoleDescription(provider: HopeHubProvider): string {
    return (
      provider.supportRoleDescription ||
      'Hope Hub support for emotional wellness and guided conversation.'
    );
  }

  providerBestFor(provider: HopeHubProvider): string[] {
    return provider.supportBestFor?.length
      ? provider.supportBestFor
      : provider.focusAreas.slice(0, 3);
  }

  providerScope(provider: HopeHubProvider): string {
    return (
      provider.supportScope || 'Support scope depends on the person’s qualification and service.'
    );
  }

  primaryService(provider: HopeHubProvider) {
    return provider.services?.[0] ?? null;
  }

  bookingQueryParams(provider: HopeHubProvider, service: CareTeamListService | null = null) {
    const directProviderPriceInPaise =
      provider.sessionFeeInPaise ?? this.publicConfig.defaultSessionPriceInPaise;
    const supportPath = supportPathForProvider(provider);
    const supportMeta = supportPathMeta(supportPath);
    return {
      service: service?.title || this.publicConfig.defaultServiceName,
      serviceName: service?.title || this.publicConfig.defaultServiceName,
      consultant: provider.name,
      providerId: provider.id,
      careTeamServiceId: service?.id || '',
      supportPath,
      supportPathLabel: supportMeta.label,
      preferredExpertType: supportMeta.title,
      duration: service
        ? `${service.durationMinutes} minutes`
        : this.publicConfig.defaultSessionLabel,
      price: service
        ? (service.effectivePriceInPaise ?? service.priceInPaise) / 100
        : directProviderPriceInPaise
          ? directProviderPriceInPaise / 100
          : undefined,
      source: service ? 'care-team-service-list' : 'care-team-list',
    };
  }

  connectQueryParams(
    provider: HopeHubProvider,
    mode: ConnectOptionMode,
    service: CareTeamListService | null = null,
  ) {
    return {
      ...this.bookingQueryParams(provider, service),
      mode: mode === 'book' ? 'voice' : mode,
      sessionMode: consumerSessionModeFor(mode),
      source: `care-team-${mode}`,
    };
  }

  connect(
    provider: HopeHubProvider,
    mode: ConnectOptionMode,
    service: CareTeamListService | null = null,
  ): void {
    void this.liveConnectAction.connect(provider, mode, {
      careTeamServiceId: service?.id || '',
      fallbackQueryParams: this.connectQueryParams(provider, mode, service),
    });
  }

  bookingCta(provider: HopeHubProvider): string {
    return provider.bookingCtaLabel || CONSUMER_UX_COPY.cta.bookSupport;
  }

  availabilityLabel(provider: HopeHubProvider): string {
    return consumerProviderAvailabilityLabel(provider);
  }

  providerModeLabels(provider: HopeHubProvider): string[] {
    const modes: string[] = [];
    if (provider.acceptsChat !== false) modes.push(consumerModeLabel('chat'));
    if (provider.acceptsVoiceCall !== false) modes.push(consumerModeLabel('voice'));
    if (provider.acceptsVideoCall !== false) modes.push(consumerModeLabel('video'));
    return modes.length ? modes : ['Slot booking'];
  }

  providerDecisionHint(provider: HopeHubProvider): string {
    if (provider.quickTalkAvailable) {
      const modes = this.providerModeLabels(provider).join(', ').toLowerCase();
      return `Start now by ${modes}`;
    }
    if (provider.liveStatus === 'ONLINE') return 'Try quick talk or book a slot';
    return 'Book the nearest suitable slot';
  }

  availabilityBadgeClass(provider: HopeHubProvider): string {
    return consumerProviderAvailabilityClass(provider);
  }
}
