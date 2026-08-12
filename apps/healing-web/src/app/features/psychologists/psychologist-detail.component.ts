import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { BookingService, HopeHubProvider } from '../../core/services/booking.service';
import {
  supportPathForProvider,
  supportPathMeta as getSupportPathMeta,
} from '../../core/constants/support-paths.constants';
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
  consumerLiveMode,
  consumerSessionModeFor,
} from '../../core/constants/consumer-form-options.constants';
import { NotificationService } from '../../core/services/notification.service';
import { PublicCommunicationConfigService } from '../../core/services/public-communication-config.service';
import { ConsumerFlowsService } from '../../core/services/consumer-flows.service';
import { LiveConnectActionService } from '../../core/services/live-connect-action.service';
import {
  AppButtonComponent,
  ConnectOptionMode,
  ConnectOptionsComponent,
} from '../../shared/components';

type CareTeamService = NonNullable<HopeHubProvider['services']>[number];

@Component({
  selector: 'app-psychologist-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, AppButtonComponent, ConnectOptionsComponent],
  templateUrl: './psychologist-detail.component.html',
})
export class PsychologistDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly booking = inject(BookingService);
  private readonly notificationService = inject(NotificationService);
  private readonly consumerFlowsService = inject(ConsumerFlowsService);
  private readonly liveConnectAction = inject(LiveConnectActionService);
  private readonly destroyRef = inject(DestroyRef);
  readonly publicConfig = inject(PublicCommunicationConfigService);

  readonly provider = signal<HopeHubProvider | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly expandedBio = signal(false);
  readonly expandedApproach = signal(false);
  readonly expandedSections = signal<Record<string, boolean>>({});
  readonly showProfileDetails = signal(false);
  readonly ROUTES = CONSUMER_ROUTES;
  readonly concernFlows =
    signal<Record<ConsumerConcernKey, ConsumerConcernFlow>>(CONSUMER_CONCERN_FLOWS);

  ngOnInit(): void {
    this.consumerFlowsService.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.concernFlows.set(state.flows));

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      const message = 'Care team profile not found.';
      this.error.set(message);
      this.notificationService.error(message);
      return;
    }
    this.loading.set(true);
    this.booking.provider(id).subscribe({
      next: ({ provider }) => {
        this.provider.set(provider);
        this.expandedBio.set(false);
        this.expandedApproach.set(false);
        this.expandedSections.set({});
        this.showProfileDetails.set(false);
        this.loading.set(false);
      },
      error: () => {
        const message = 'Could not load this profile.';
        this.error.set(message);
        this.notificationService.error(message);
        this.loading.set(false);
      },
    });
  }

  providerImageUrl(provider: HopeHubProvider): string | null {
    if (!provider.profileImageUrl) return null;
    return provider.profileImageUrl.startsWith('http')
      ? provider.profileImageUrl
      : `${environment.apiUrl}${provider.profileImageUrl}`;
  }

  book(provider: HopeHubProvider, service?: CareTeamService): void {
    const selectedService = service || null;
    const supportPath = supportPathForProvider(provider);
    const supportMeta = getSupportPathMeta(supportPath);
    const directProviderPriceInPaise =
      provider.sessionFeeInPaise ?? this.publicConfig.defaultSessionPriceInPaise;
    this.router.navigate(CONSUMER_ROUTES.links.bookSupport, {
      queryParams: {
        service: selectedService?.title || this.publicConfig.defaultServiceName,
        serviceName: selectedService?.title || this.publicConfig.defaultServiceName,
        consultant: provider.name,
        providerId: provider.id,
        careTeamServiceId: selectedService?.id || '',
        supportPath,
        supportPathLabel: supportMeta.label,
        preferredExpertType: supportMeta.title,
        duration: selectedService
          ? `${selectedService.durationMinutes} minutes`
          : this.sessionLabel(provider),
        price: selectedService
          ? (selectedService.effectivePriceInPaise ?? selectedService.priceInPaise) / 100
          : directProviderPriceInPaise
            ? directProviderPriceInPaise / 100
            : undefined,
        source: selectedService ? 'care-team-service-profile' : 'care-team-profile',
      },
    });
  }

  connect(provider: HopeHubProvider, mode: ConnectOptionMode, service?: CareTeamService): void {
    void this.liveConnectAction.connect(provider, mode, {
      careTeamServiceId: service?.id || '',
      fallbackQueryParams: this.bookingQueryParams(provider, mode, service),
    });
  }

  private bookingQueryParams(
    provider: HopeHubProvider,
    mode: ConnectOptionMode,
    service?: CareTeamService,
  ) {
    const selectedService = service || null;
    const supportPath = supportPathForProvider(provider);
    const supportMeta = getSupportPathMeta(supportPath);
    const selectedMode = consumerLiveMode(mode);
    const directProviderPriceInPaise =
      provider.sessionFeeInPaise ?? this.publicConfig.defaultSessionPriceInPaise;
    return {
      service: selectedService?.title || this.publicConfig.defaultServiceName,
      serviceName: selectedService?.title || this.publicConfig.defaultServiceName,
      consultant: provider.name,
      providerId: provider.id,
      careTeamServiceId: selectedService?.id || '',
      supportPath,
      supportPathLabel: supportMeta.label,
      preferredExpertType: supportMeta.title,
      duration: selectedService
        ? `${selectedService.durationMinutes} minutes`
        : this.sessionLabel(provider),
      price: selectedService
        ? (selectedService.effectivePriceInPaise ?? selectedService.priceInPaise) / 100
        : directProviderPriceInPaise
          ? directProviderPriceInPaise / 100
          : undefined,
      mode: selectedMode,
      sessionMode: consumerSessionModeFor(selectedMode),
      source: selectedService
        ? `care-team-service-${selectedMode}`
        : `care-team-profile-${selectedMode}`,
    };
  }

  sessionLabel(provider: HopeHubProvider): string {
    return provider.sessionDurationMinutes ? `${provider.sessionDurationMinutes} min session` : '';
  }

  supportPathMeta(provider: HopeHubProvider) {
    return getSupportPathMeta(supportPathForProvider(provider));
  }

  isNonClinicalSupport(provider: HopeHubProvider): boolean {
    return !this.supportPathMeta(provider).clinical;
  }

  providerRoleLabel(provider: HopeHubProvider): string {
    return provider.supportRoleLabel ?? '';
  }

  providerRoleBadgeClass(provider: HopeHubProvider): string {
    return consumerProviderRoleBadgeClass(provider);
  }

  providerTierLabel(provider: HopeHubProvider): string {
    return provider.supportTierLabel ?? '';
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

  providerRoleDescription(provider: HopeHubProvider): string {
    return provider.supportRoleDescription ?? '';
  }

  providerScope(provider: HopeHubProvider): string {
    return provider.supportScope ?? '';
  }

  providerBestFor(provider: HopeHubProvider): string[] {
    return provider.supportBestFor?.length
      ? provider.supportBestFor
      : (provider.concernsHandled ?? []);
  }

  providerNotFor(provider: HopeHubProvider): string[] {
    return provider.supportNotFor ?? [];
  }

  bookingCta(provider: HopeHubProvider): string {
    return provider.bookingCtaLabel ?? '';
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

  servicePriceLabel(service: {
    priceInPaise: number;
    effectivePriceInPaise?: number;
    pricingLabel?: string;
    isFree: boolean;
  }) {
    if (service.pricingLabel) return service.pricingLabel;
    const amount = service.effectivePriceInPaise ?? service.priceInPaise;
    return service.isFree || amount === 0 ? 'Free' : `₹${amount / 100}`;
  }

  listOrEmpty(items: string[] | undefined) {
    return items ?? [];
  }

  textIsLong(value: string | null | undefined): boolean {
    return (value?.trim().length ?? 0) > 360;
  }

  toggleBio(): void {
    this.expandedBio.update((value) => !value);
  }

  toggleApproach(): void {
    this.expandedApproach.update((value) => !value);
  }

  toggleProfileDetails(): void {
    this.showProfileDetails.update((visible) => !visible);
  }

  visibleItems(key: string, items: string[] | undefined, limit = 6): string[] {
    const list = this.listOrEmpty(items);
    return this.expandedSections()[key] ? list : list.slice(0, limit);
  }

  hiddenItemCount(key: string, items: string[] | undefined, limit = 6): number {
    const list = this.listOrEmpty(items);
    return this.expandedSections()[key] ? 0 : Math.max(0, list.length - limit);
  }

  toggleSection(key: string): void {
    this.expandedSections.update((sections) => ({
      ...sections,
      [key]: !sections[key],
    }));
  }

  availabilityLabel(provider: HopeHubProvider): string {
    return consumerProviderAvailabilityLabel(provider);
  }

  availabilityBadgeClass(provider: HopeHubProvider): string {
    return consumerProviderAvailabilityClass(provider);
  }
}
