import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, interval } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AuthService,
  BookingService,
  LiveConnectActionService,
  NotificationService,
  PaymentService,
} from '../../../../core/services';
import { IMAGE_ASSETS } from '../../../../core/constants/image-assets.constants';
import {
  CONSUMER_AVAILABILITY_COPY,
  consumerProviderLiveLabel,
} from '../../../../core/constants/consumer-availability.constants';
import { CONSUMER_UX_COPY } from '../../../../core/constants/consumer-ux-copy.constants';
import { CONSUMER_ROUTES } from '../../../../core/constants/consumer-routes.constants';
import {
  CONSUMER_CONNECT_MODE_META,
  CONSUMER_LIVE_CONNECT_MODE_OPTIONS,
  consumerSessionModeFor,
  type ConsumerLiveConnectMode,
} from '../../../../core/constants/consumer-form-options.constants';
import {
  ConsumerSupportPath,
  supportPathForProvider,
  supportPathMeta,
} from '../../../../core/constants/support-paths.constants';
import { User } from '../../../../core/models/auth.model';
import {
  HopeHubCheckoutQuote,
  HopeHubLiveGroup,
  HopeHubPublicCoupon,
  HopeHubProvider,
  featuredConsultationCoupon,
} from '../../../../core/services/booking.service';
import {
  providerAcceptsLiveConnectMode,
  providerNeedsListenerSupportConsent,
  providerServiceForLiveConnectMode,
} from '../../../../core/utils/live-connect-provider.utils';
import {
  PaymentFlowState,
  PaymentStatusOverlayComponent,
  EmptyStateComponent,
  AppButtonComponent,
  StatusChipComponent,
  PageHeaderComponent,
  CouponBoxComponent,
  AppModalComponent,
} from '../../../../shared/components';

type LiveConnectMode = ConsumerLiveConnectMode;
type LiveConnectRoleGroup = '' | ConsumerSupportPath;
type HomeProviderSection = {
  roleGroup: ConsumerSupportPath;
  eyebrow: string;
  title: string;
  description: string;
  providers: HopeHubProvider[];
  liveCount: number;
};

const HOME_PROVIDER_SECTIONS: ReadonlyArray<Omit<HomeProviderSection, 'providers' | 'liveCount'>> =
  [
    {
      roleGroup: 'EMOTIONAL_LISTENER',
      eyebrow: 'Feel heard',
      title: 'Emotional support listeners',
      description: 'A gentle, non-clinical space to talk, vent, and feel less alone.',
    },
    {
      roleGroup: 'COACH_MENTOR',
      eyebrow: 'Find direction',
      title: 'Coaches and mentors',
      description: 'Practical guidance for clarity, confidence, habits, study, and career goals.',
    },
    {
      roleGroup: 'PROFESSIONAL_CARE',
      eyebrow: 'Structured support',
      title: 'Psychologists and counsellors',
      description: 'Professional support for deeper emotional and mental-wellness concerns.',
    },
  ];

// A provider can be qualified for more than one support path. On the home page we
// show them once, under their highest-acuity path, so a psychologist is not also
// repeated in the coach or listener carousel.
const HOME_PROVIDER_SECTION_PRIORITY: readonly ConsumerSupportPath[] = [
  'PROFESSIONAL_CARE',
  'COACH_MENTOR',
  'EMOTIONAL_LISTENER',
];

@Component({
  selector: 'app-live-connect',
  standalone: true,
  imports: [
    FormsModule,
    PaymentStatusOverlayComponent,
    AppButtonComponent,
    RouterModule,
    EmptyStateComponent,
    StatusChipComponent,
    PageHeaderComponent,
    CouponBoxComponent,
    AppModalComponent,
  ],
  templateUrl: './live-connect.component.html',
  styleUrl: './live-connect.component.scss',
})
export class LiveConnectComponent implements OnInit {
  private static readonly DEFAULT_LIVE_COUPON = 'WELCOME100';
  private static readonly PROVIDER_CAROUSEL_INTERVAL_MS = 7000;
  private static readonly PROVIDER_CAROUSEL_INTERACTION_PAUSE_MS = 12000;
  readonly UX = CONSUMER_UX_COPY;
  readonly ROUTES = CONSUMER_ROUTES;
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);
  private readonly liveConnectAction = inject(LiveConnectActionService);
  private readonly notificationService = inject(NotificationService);
  private readonly paymentService = inject(PaymentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private providerRequestVersion = 0;
  private readonly providerCarouselPausedUntil = new Map<ConsumerSupportPath, number>();

  readonly currentUser = signal<User | null>(null);
  readonly providers = signal<HopeHubProvider[]>([]);
  readonly providerSections = signal<HomeProviderSection[]>([]);
  readonly providerCarouselIndexes = signal<Partial<Record<ConsumerSupportPath, number>>>({});
  readonly groups = signal<HopeHubLiveGroup[]>([]);
  readonly loading = signal(false);
  readonly groupsLoading = signal(false);
  readonly creatingGroup = signal(false);
  readonly message = signal('');
  readonly groupMessage = signal('');
  readonly newGroupTitle = signal('');
  readonly newGroupDescription = signal('');
  readonly startingProviderId = signal('');
  readonly pendingProvider = signal<HopeHubProvider | null>(null);
  readonly pendingMode = signal<LiveConnectMode | null>(null);
  readonly couponCode = signal(LiveConnectComponent.DEFAULT_LIVE_COUPON);
  readonly appliedCouponCode = signal('');
  readonly couponQuote = signal<HopeHubCheckoutQuote | null>(null);
  readonly couponLoading = signal(false);
  readonly couponError = signal('');
  readonly couponSuccess = signal('');
  readonly checkoutPhone = signal('');
  readonly editingCheckoutPhone = signal(true);
  readonly phoneError = signal('');
  readonly featuredCoupon = signal<HopeHubPublicCoupon | null>(null);
  readonly view = signal<'providers' | 'groups'>('providers');
  readonly mode = signal<LiveConnectMode>('chat');
  readonly roleGroup = signal<LiveConnectRoleGroup>('EMOTIONAL_LISTENER');
  readonly paymentFlowState = signal<PaymentFlowState>('IDLE');
  readonly paymentFlowError = signal('');
  readonly paymentFlowConsultation = signal<any | null>(null);
  readonly paymentRetryAvailable = signal(false);
  readonly liveConnectImage = IMAGE_ASSETS.HEALING_HUB.PHOTOS.PHONE_SESSION;

  readonly modes = CONSUMER_LIVE_CONNECT_MODE_OPTIONS;

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.currentUser.set(user);
    });
    this.loadProviders();
    this.loadGroups();
    this.loadAvailableCoupons();

    if (this.isBrowser) {
      interval(LiveConnectComponent.PROVIDER_CAROUSEL_INTERVAL_MS)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.autoAdvanceVisibleProviderCarousels());
    }
  }

  providerCarouselIndex(roleGroup: ConsumerSupportPath): number {
    return this.providerCarouselIndexes()[roleGroup] ?? 0;
  }

  pauseProviderCarousel(roleGroup: ConsumerSupportPath): void {
    this.providerCarouselPausedUntil.set(
      roleGroup,
      Date.now() + LiveConnectComponent.PROVIDER_CAROUSEL_INTERACTION_PAUSE_MS,
    );
  }

  moveProviderCarousel(roleGroup: ConsumerSupportPath, direction: -1 | 1): void {
    this.pauseProviderCarousel(roleGroup);
    this.scrollProviderCarousel(roleGroup, direction, false);
  }

  updateProviderCarouselIndex(roleGroup: ConsumerSupportPath, event: Event): void {
    if (!this.isBrowser) return;
    const carousel = event.currentTarget as HTMLElement | null;
    if (!carousel) return;
    const cards = this.providerCarouselCards(carousel);
    if (!cards.length) return;

    const carouselLeft = carousel.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    cards.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - carouselLeft);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (this.providerCarouselIndex(roleGroup) === closestIndex) return;
    this.providerCarouselIndexes.update((indexes) => ({ ...indexes, [roleGroup]: closestIndex }));
  }

  setView(view: 'providers' | 'groups'): void {
    if (this.view() === view) return;
    this.view.set(view);
    this.message.set('');
    if (view === 'groups' && !this.groups().length) {
      this.loadGroups();
    }
  }

  setMode(mode: LiveConnectMode): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.loadProviders();
  }

  setRoleGroup(roleGroup: ConsumerSupportPath): void {
    if (this.roleGroup() === roleGroup) return;
    this.roleGroup.set(roleGroup);
    this.loadProviders();
  }

  activeSupportPathTitle(): string {
    const path = this.roleGroup();
    return path ? supportPathMeta(path).title : 'Hope Hub support';
  }

  providerImageUrl(provider: HopeHubProvider): string | null {
    if (!provider.profileImageUrl) return null;
    if (provider.profileImageUrl.startsWith('http')) return provider.profileImageUrl;
    return `${environment.apiUrl}${provider.profileImageUrl}`;
  }

  providerTierLabel(provider: HopeHubProvider): string {
    return provider.supportTierLabel ?? '';
  }

  providerRoleLabel(provider: HopeHubProvider): string {
    return provider.supportRoleLabel ?? '';
  }

  modeLabel(): string {
    return this.modes.find((mode) => mode.value === this.mode())?.label ?? 'Chat';
  }

  modeOption(mode: LiveConnectMode): (typeof this.modes)[number] {
    return this.modes.find((item) => item.value === mode) ?? this.modes[0];
  }

  sessionMode(): string {
    return consumerSessionModeFor(this.mode());
  }

  buttonLabel(provider: HopeHubProvider): string {
    return this.isProviderLive(provider) ? 'Connect now' : 'Book a session';
  }

  isProviderLive(provider: HopeHubProvider): boolean {
    return provider.quickTalkAvailable === true;
  }

  providerAvailabilityLabel(provider: HopeHubProvider): string {
    return this.isProviderLive(provider) ? this.providerLiveLabel(provider) : 'Available to book';
  }

  sectionSummary(section: HomeProviderSection): string {
    if (section.liveCount > 0) {
      return `${section.liveCount} available now${
        section.providers.length > section.liveCount ? ' · More available to book' : ''
      }`;
    }
    return section.providers.length
      ? 'Choose a profile and book a suitable time'
      : 'View all profiles';
  }

  directoryLabel(section: HomeProviderSection): string {
    if (section.roleGroup === 'EMOTIONAL_LISTENER') return 'See all listeners';
    if (section.roleGroup === 'COACH_MENTOR') return 'See all coaches and mentors';
    return 'See all psychologists and counsellors';
  }

  selectProvider(provider: HopeHubProvider): void {
    const supportPath = supportPathForProvider(provider);
    this.roleGroup.set(supportPath);
    if (this.isProviderLive(provider)) {
      this.requestStart(provider);
      return;
    }

    const service = this.providerServiceForMode(provider);
    void this.liveConnectAction.openBooking(provider, this.mode(), {
      careTeamServiceId: service?.id || '',
      fallbackQueryParams: {
        service: service?.title || 'Private Hope Hub support',
        serviceName: service?.title || 'Private Hope Hub support',
        consultant: provider.name,
        providerId: provider.id,
        careTeamServiceId: service?.id || '',
        supportPath,
        supportPathLabel: supportPathMeta(supportPath).label,
        preferredExpertType: supportPathMeta(supportPath).title,
        duration: service?.durationMinutes ? `${service.durationMinutes} minutes` : undefined,
        price:
          service?.effectivePriceInPaise != null
            ? service.effectivePriceInPaise / 100
            : service?.priceInPaise != null
              ? service.priceInPaise / 100
              : undefined,
        source: 'home-care-team',
      },
    });
  }

  providerTrustLabel(provider: HopeHubProvider): string {
    if (provider.isClinicalCare) return 'Verified professional';
    const role = this.providerRoleLabel(provider) || this.providerTierLabel(provider);
    if (/listener|volunteer/i.test(role)) return 'Reviewed listener';
    if (/counsellor/i.test(role)) return 'Verified counsellor';
    return 'Verified support';
  }

  providerLiveLabel(provider: HopeHubProvider): string {
    return consumerProviderLiveLabel(provider);
  }

  providerLanguagesLabel(provider: HopeHubProvider): string {
    const languages = provider.languages?.filter(Boolean).slice(0, 3) || [];
    return languages.length ? languages.join(', ') : CONSUMER_AVAILABILITY_COPY.languageFlexible;
  }

  providerFocusLabel(provider: HopeHubProvider): string {
    const focus = provider.concernsHandled?.length ? provider.concernsHandled : provider.focusAreas;
    return focus?.filter(Boolean).slice(0, 2).join(' · ') || 'Emotional support';
  }

  providerModes(provider: HopeHubProvider): Array<{
    mode: LiveConnectMode;
    label: string;
    icon: string;
    enabled: boolean;
  }> {
    return [
      {
        mode: 'chat',
        label: CONSUMER_CONNECT_MODE_META.chat.label,
        icon: CONSUMER_CONNECT_MODE_META.chat.icon,
        enabled: providerAcceptsLiveConnectMode(provider, 'chat'),
      },
      {
        mode: 'voice',
        label: CONSUMER_CONNECT_MODE_META.voice.label,
        icon: CONSUMER_CONNECT_MODE_META.voice.icon,
        enabled: providerAcceptsLiveConnectMode(provider, 'voice'),
      },
      {
        mode: 'video',
        label: CONSUMER_CONNECT_MODE_META.video.label,
        icon: CONSUMER_CONNECT_MODE_META.video.icon,
        enabled: providerAcceptsLiveConnectMode(provider, 'video'),
      },
    ];
  }

  groupStatusLabel(group: HopeHubLiveGroup): string {
    if (group.status === 'LIVE') return CONSUMER_AVAILABILITY_COPY.liveNow;
    if (group.status === 'SCHEDULED') return 'Scheduled';
    return group.status;
  }

  liveGroupModeLabel(_group: HopeHubLiveGroup): string {
    return 'Open chat';
  }

  unavailableTitle(): string {
    return 'All our listeners are supporting someone right now';
  }

  unavailableMessage(): string {
    return 'You can reserve a private time that works for you, or explore the wider Hope Hub support team.';
  }

  bookConsultation(): void {
    const supportPath = this.roleGroup();
    void this.router.navigate(['/contact'], {
      queryParams: {
        source: 'live-connect',
        mode: this.mode(),
        supportPath: supportPath || null,
        preferredExpertType: supportPath ? supportPathMeta(supportPath).title : null,
      },
    });
  }

  groupLastMessageLabel(group: HopeHubLiveGroup): string {
    const message = group.lastMessage;
    if (!message?.body) return 'No messages yet — be the first to say hello.';
    const author = message.senderName || 'Member';
    return `${author}: ${message.body}`;
  }

  canHostGroups(): boolean {
    const role = this.currentUser()?.role;
    return role === 'DOCTOR' || role === 'ADMIN' || role === 'HR';
  }

  joinGroup(group: HopeHubLiveGroup): void {
    void this.router.navigate(['/live-groups', group.slug || group.id]);
  }

  createGroup(): void {
    const title = this.newGroupTitle().trim();
    const description = this.newGroupDescription().trim();
    if (!title || this.creatingGroup()) return;
    if (!this.canHostGroups()) {
      this.notificationService.warning('Only providers and admins can open support chats.');
      return;
    }

    this.creatingGroup.set(true);
    this.groupMessage.set('');
    this.bookingService
      .createLiveGroup({
        title,
        description,
        mode: 'CHAT',
        status: 'LIVE',
      })
      .subscribe({
        next: (res) => {
          this.groups.update((groups) => [
            res.group,
            ...groups.filter((item) => item.id !== res.group.id),
          ]);
          this.newGroupTitle.set('');
          this.newGroupDescription.set('');
          this.creatingGroup.set(false);
          this.groupMessage.set('Support chat is live. Opening it now.');
          this.notificationService.success(CONSUMER_UX_COPY.messages.supportChatCreated);
          void this.router.navigate(['/live-groups', res.group.slug || res.group.id]);
        },
        error: (error) => {
          const message = this.readErrorMessage(error);
          this.creatingGroup.set(false);
          this.groupMessage.set(message);
          this.notificationService.error(message);
        },
      });
  }

  isFreeProvider(provider: HopeHubProvider): boolean {
    const service = this.providerServiceForMode(provider);
    const price =
      service?.effectivePriceInPaise ?? service?.priceInPaise ?? provider.sessionFeeInPaise;
    return Number(price ?? 0) <= 0;
  }

  sessionMeta(provider: HopeHubProvider): string {
    const service = this.providerServiceForMode(provider);
    const duration = service?.durationMinutes || provider.sessionDurationMinutes;
    const pieces: string[] = [];
    if (duration) pieces.push(`${duration} min`);
    pieces.push(CONSUMER_UX_COPY.service.privateOneToOne);
    return pieces.join(' · ');
  }

  livePriceLabel(provider: HopeHubProvider): string {
    const service = this.providerServiceForMode(provider);
    if (service?.pricingLabel) return service.pricingLabel;
    const amount = Number(
      service?.effectivePriceInPaise ?? service?.priceInPaise ?? provider.sessionFeeInPaise ?? 0,
    );
    return amount <= 0 ? 'Free' : `₹${Math.round(amount / 100)}`;
  }

  hasLiveFirstSessionOffer(provider: HopeHubProvider): boolean {
    const service = this.providerServiceForMode(provider);
    return Boolean(
      service?.pricingRule === 'DISCOUNTED_FIRST' &&
      service.effectivePriceInPaise != null &&
      service.effectivePriceInPaise < service.priceInPaise,
    );
  }

  liveRegularPriceLabel(provider: HopeHubProvider): string {
    const price = this.providerServiceForMode(provider)?.priceInPaise;
    return price ? `₹${Math.round(price / 100)}` : '';
  }

  requestStart(provider: HopeHubProvider): void {
    if (this.startingProviderId()) return;
    this.clearLiveCoupon();
    const savedPhone = this.currentUser()?.mobile?.trim() || '';
    this.checkoutPhone.set(savedPhone);
    this.editingCheckoutPhone.set(!savedPhone);
    this.phoneError.set('');
    this.updateLiveCoupon(LiveConnectComponent.DEFAULT_LIVE_COUPON);
    const availableModes = this.providerModes(provider).filter((option) => option.enabled);
    const preferredMode = availableModes.some((option) => option.mode === this.mode())
      ? this.mode()
      : availableModes[0]?.mode || null;
    this.pendingProvider.set(provider);
    this.pendingMode.set(preferredMode);
    queueMicrotask(() => void this.applyLiveCoupon());
  }

  cancelStart(): void {
    this.pendingProvider.set(null);
    this.pendingMode.set(null);
    this.clearLiveCoupon();
    this.checkoutPhone.set('');
    this.editingCheckoutPhone.set(true);
    this.phoneError.set('');
  }

  chooseConnectionMode(mode: LiveConnectMode): void {
    const provider = this.pendingProvider();
    if (
      !provider ||
      !this.providerModes(provider).some((item) => item.mode === mode && item.enabled)
    ) {
      return;
    }
    if (this.pendingMode() && this.pendingMode() !== mode) {
      this.clearLiveCoupon();
      queueMicrotask(() => void this.applyLiveCoupon());
    }
    this.pendingMode.set(mode);
  }

  changeConnectionMode(): void {
    this.pendingMode.set(null);
    this.clearLiveCoupon();
  }

  async confirmStart(): Promise<void> {
    const provider = this.pendingProvider();
    const selectedMode = this.pendingMode();
    if (!provider || !selectedMode) return;
    const service = providerServiceForLiveConnectMode(provider, selectedMode);
    const grossInPaise = Number(
      service?.effectivePriceInPaise ?? service?.priceInPaise ?? provider.sessionFeeInPaise ?? 0,
    );
    const payableInPaise = this.couponQuote()?.payableInPaise ?? grossInPaise;
    if (this.couponNeedsApply()) {
      this.couponError.set('Apply the coupon before continuing.');
      return;
    }
    if (payableInPaise > 0 && this.checkoutPhone().replace(/\D/g, '').length < 8) {
      this.editingCheckoutPhone.set(true);
      this.phoneError.set('Enter a valid phone number for secure payment.');
      return;
    }
    this.mode.set(selectedMode);
    this.pendingMode.set(null);
    this.pendingProvider.set(null);
    if (this.startingProviderId()) return;
    if (!this.currentUser()) {
      await this.liveConnectAction.connect(provider, selectedMode, {
        careTeamServiceId: this.providerServiceForMode(provider)?.id || '',
        promoCode: this.appliedCouponCode(),
        checkoutPhone: this.checkoutPhone(),
        fallbackQueryParams: {
          source: 'live-connect',
          supportPath: this.roleGroup() || undefined,
          preferredExpertType: supportPathMeta(supportPathForProvider(provider)).title,
        },
      });
      return;
    }

    const listenerConsent = this.needsListenerSupportConsent(provider);

    this.startingProviderId.set(provider.id);
    this.message.set('');
    this.paymentFlowError.set('');
    this.paymentFlowConsultation.set(null);
    this.paymentRetryAvailable.set(false);
    this.paymentFlowState.set('IDLE');
    try {
      const response = await firstValueFrom(
        this.bookingService.createQuickTalk({
          providerId: provider.id,
          careTeamServiceId: this.providerServiceForMode(provider)?.id || '',
          preferredExpertType: supportPathMeta(supportPathForProvider(provider)).title,
          sessionMode: this.sessionMode(),
          preferredLanguage: provider.languages?.[0] || '',
          listenerSupportConsent: listenerConsent,
          promoCode: this.appliedCouponCode(),
          message: `Homepage Live Connect ${this.modeLabel()} request`,
          entryPage: typeof window === 'undefined' ? undefined : window.location.href,
        }),
      );

      this.paymentFlowConsultation.set(response.consultation);
      const payableInPaise = Number(response.consultation?.payment?.amountInPaise ?? 0);
      if (this.couponQuote()?.payableInPaise === 0 && payableInPaise > 0) {
        const message = 'The free coupon was not applied by the server. Payment was not opened.';
        this.paymentFlowError.set(message);
        this.paymentFlowState.set('ERROR');
        this.message.set(message);
        this.notificationService.error(message);
        return;
      }
      if (payableInPaise > 0) {
        this.paymentRetryAvailable.set(true);
        this.paymentFlowState.set('CREATING_ORDER');
        await this.paymentService.payConsultation(response.consultation, {
          onOrderCreated: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
          onCheckoutOpened: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
          onVerifying: () => this.paymentFlowState.set('VERIFYING'),
          prefillName: this.currentUser()?.name || '',
          prefillEmail: this.currentUser()?.email || '',
          prefillPhone: this.checkoutPhone(),
        });
      }

      this.paymentRetryAvailable.set(false);
      this.paymentFlowState.set('SUCCESS');
      this.message.set(
        `${this.modeLabel()} session is ready with ${response.provider?.name || provider.name}.`,
      );
      this.notificationService.success(CONSUMER_UX_COPY.messages.liveSessionConfirmed);
      this.clearLiveCoupon();
      void this.openLiveSession(response.consultation?.id);
    } catch (error) {
      const message = this.readErrorMessage(error);
      this.paymentFlowError.set(message);
      this.message.set(message);
      this.notificationService.error(message);
      if (this.paymentFlowConsultation() && this.paymentRetryAvailable()) {
        this.paymentFlowState.set('ERROR');
      } else {
        this.paymentFlowState.set('IDLE');
        this.paymentFlowConsultation.set(null);
        this.paymentRetryAvailable.set(false);
        this.loadProviders();
      }
    } finally {
      this.startingProviderId.set('');
    }
  }

  updateLiveCoupon(value: string): void {
    const normalized = value
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '')
      .slice(0, 32);
    this.couponCode.set(normalized);
    if (this.appliedCouponCode() !== normalized) {
      this.appliedCouponCode.set('');
      this.couponQuote.set(null);
      this.couponSuccess.set('');
    }
    this.couponError.set('');
  }

  couponNeedsApply(): boolean {
    const entered = this.couponCode().trim().toUpperCase();
    return Boolean(entered) && this.appliedCouponCode() !== entered;
  }

  updateCheckoutPhone(value: string): void {
    const normalized = String(value || '')
      .replace(/[^\d+\s()-]/g, '')
      .slice(0, 20);
    this.checkoutPhone.set(normalized);
    this.phoneError.set('');
  }

  editCheckoutPhone(): void {
    this.editingCheckoutPhone.set(true);
    this.phoneError.set('');
  }

  async applyLiveCoupon(): Promise<void> {
    const provider = this.pendingProvider();
    const code = this.couponCode().trim().toUpperCase();
    if (!provider || code.length < 2 || this.couponLoading()) {
      this.couponError.set(CONSUMER_UX_COPY.messages.couponInvalid);
      return;
    }

    if (!this.currentUser()) {
      this.appliedCouponCode.set(code);
      this.couponError.set('');
      this.couponSuccess.set('Coupon saved. It will be checked after you sign in.');
      return;
    }

    const service = providerServiceForLiveConnectMode(provider, this.pendingMode() || this.mode());
    const grossInPaise = Number(
      service?.effectivePriceInPaise ?? service?.priceInPaise ?? provider.sessionFeeInPaise ?? 0,
    );
    if (grossInPaise <= 0) {
      this.couponError.set('This live session is already free.');
      return;
    }

    this.couponLoading.set(true);
    this.couponError.set('');
    this.couponSuccess.set('');
    try {
      const { quote } = await firstValueFrom(
        this.bookingService.checkoutQuote({
          grossInPaise,
          promoCode: code,
          serviceName: service?.title || 'Quick Hope Hub talk',
          careTeamServiceId: service?.id || undefined,
          providerId: provider.id,
        }),
      );
      if (quote.discountInPaise <= 0) {
        this.appliedCouponCode.set('');
        this.couponQuote.set(null);
        this.couponError.set('This coupon does not apply to this live session.');
        return;
      }
      this.appliedCouponCode.set(code);
      this.couponQuote.set(quote);
      if (quote.discountStrategy === 'PROVIDER_OFFER') {
        this.couponSuccess.set(
          `The provider offer gives you the lower price. ${code} was checked but was not combined. Pay ${this.formatPaise(quote.payableInPaise)} after confirmation.`,
        );
      } else if (quote.discountStrategy === 'COUPON') {
        this.couponSuccess.set(
          quote.payableInPaise <= 0
            ? `${code} gives you the better price. No payment will be needed.`
            : `${code} gives you the better price. Pay ${this.formatPaise(quote.payableInPaise)} after confirmation.`,
        );
      } else {
        this.couponSuccess.set(
          quote.payableInPaise <= 0
            ? `${code} applied. No payment will be needed.`
            : `${code} applied. Pay ${this.formatPaise(quote.payableInPaise)} after confirmation.`,
        );
      }
    } catch (error) {
      this.appliedCouponCode.set('');
      this.couponQuote.set(null);
      this.couponError.set(this.readErrorMessage(error));
    } finally {
      this.couponLoading.set(false);
    }
  }

  applySuggestedCoupon(code: string): void {
    this.updateLiveCoupon(code);
    void this.applyLiveCoupon();
  }

  clearLiveCoupon(): void {
    this.couponCode.set(LiveConnectComponent.DEFAULT_LIVE_COUPON);
    this.appliedCouponCode.set('');
    this.couponQuote.set(null);
    this.couponLoading.set(false);
    this.couponError.set('');
    this.couponSuccess.set('');
  }

  private loadAvailableCoupons(): void {
    this.bookingService
      .availableCoupons()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ coupons }) => {
          this.featuredCoupon.set(featuredConsultationCoupon(coupons));
        },
        error: () => this.featuredCoupon.set(null),
      });
  }

  private needsListenerSupportConsent(provider: HopeHubProvider): boolean {
    return providerNeedsListenerSupportConsent(provider);
  }

  retryPayment(): void {
    const consultation = this.paymentFlowConsultation();
    if (!consultation || !this.paymentRetryAvailable() || this.startingProviderId()) return;
    this.paymentFlowError.set('');
    this.paymentFlowState.set('CREATING_ORDER');
    void this.paymentService
      .payConsultation(consultation, {
        onOrderCreated: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
        onCheckoutOpened: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
        onVerifying: () => this.paymentFlowState.set('VERIFYING'),
        prefillName: this.currentUser()?.name || '',
        prefillEmail: this.currentUser()?.email || '',
        prefillPhone: this.checkoutPhone(),
      })
      .then(() => {
        this.paymentRetryAvailable.set(false);
        this.paymentFlowState.set('SUCCESS');
        this.notificationService.success('Payment confirmed. Opening your session room.');
        void this.openLiveSession(consultation.id);
      })
      .catch((error) => {
        const message = this.readErrorMessage(error);
        this.paymentFlowError.set(message);
        this.paymentFlowState.set('ERROR');
        this.paymentRetryAvailable.set(true);
        this.notificationService.error(message);
      });
  }

  closePaymentOverlay(): void {
    const state = this.paymentFlowState();
    if (state === 'SUCCESS' || state === 'ERROR') {
      this.paymentFlowState.set('IDLE');
      this.paymentFlowError.set('');
      this.paymentFlowConsultation.set(null);
      this.paymentRetryAvailable.set(false);
    }
  }

  paymentFlowTitle(): string {
    const state = this.paymentFlowState();
    if (state === 'CREATING_ORDER') return 'Preparing payment';
    if (state === 'OPENING_CHECKOUT') return 'Secure checkout';
    if (state === 'VERIFYING') return 'Confirming payment';
    if (state === 'SUCCESS') return 'Live session ready';
    if (state === 'ERROR') {
      return this.paymentRetryAvailable()
        ? 'Payment could not be completed'
        : 'Could not start live session';
    }
    return '';
  }

  paymentFlowMessage(): string {
    const state = this.paymentFlowState();
    if (state === 'CREATING_ORDER') return 'Setting up secure payment for this live session.';
    if (state === 'OPENING_CHECKOUT') return 'Complete payment in the secure checkout window.';
    if (state === 'VERIFYING') return 'Confirming payment. Please keep this page open.';
    if (state === 'SUCCESS') return 'Your session is confirmed. We are opening your live room.';
    if (state === 'ERROR') return this.paymentFlowError() || 'Please retry safely.';
    return '';
  }

  private async loadProviders(): Promise<void> {
    const requestVersion = ++this.providerRequestVersion;
    this.loading.set(true);
    this.message.set('');
    let requestFailed = false;

    try {
      const liveRequest = firstValueFrom(
        this.bookingService.quickTalkProviders({ mode: this.mode() }),
      ).catch(() => {
        requestFailed = true;
        return { providers: [] as HopeHubProvider[], total: 0 };
      });
      const directoryRequests = HOME_PROVIDER_SECTIONS.map((section) =>
        firstValueFrom(
          this.bookingService.providers({
            page: 1,
            pageSize: 10,
            roleGroup: section.roleGroup,
          }),
        ).catch(() => {
          requestFailed = true;
          return {
            providers: [] as HopeHubProvider[],
            pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
          };
        }),
      );
      const [liveResponse, ...directoryResponses] = await Promise.all([
        liveRequest,
        ...directoryRequests,
      ]);
      if (requestVersion !== this.providerRequestVersion) return;

      const candidatesByRoleGroup = new Map<ConsumerSupportPath, HopeHubProvider[]>();

      HOME_PROVIDER_SECTIONS.forEach((section, index) => {
        const liveProviders = liveResponse.providers
          .filter((provider) => supportPathForProvider(provider) === section.roleGroup)
          .map((provider) => ({ ...provider, quickTalkAvailable: true }));
        const seen = new Set(liveProviders.map((provider) => provider.id));
        const bookableProviders = (directoryResponses[index]?.providers || [])
          .filter((provider) => provider.acceptingNewUsers !== false && !seen.has(provider.id))
          .map((provider) => ({ ...provider, quickTalkAvailable: false }));
        candidatesByRoleGroup.set(section.roleGroup, [...liveProviders, ...bookableProviders]);
      });

      const claimedProviderIds = new Set<string>();
      const providersByRoleGroup = new Map<ConsumerSupportPath, HopeHubProvider[]>();
      HOME_PROVIDER_SECTION_PRIORITY.forEach((roleGroup) => {
        const providers = (candidatesByRoleGroup.get(roleGroup) || [])
          .filter((provider) => !claimedProviderIds.has(provider.id))
          .slice(0, 5);
        providers.forEach((provider) => claimedProviderIds.add(provider.id));
        providersByRoleGroup.set(roleGroup, providers);
      });

      const sections = HOME_PROVIDER_SECTIONS.map((section): HomeProviderSection => {
        const providers = providersByRoleGroup.get(section.roleGroup) || [];
        return {
          ...section,
          providers,
          liveCount: providers.filter((provider) => provider.quickTalkAvailable).length,
        };
      });
      const providers = sections.flatMap((section) => section.providers);
      this.providerSections.set(sections.filter((section) => section.providers.length > 0));
      this.providerCarouselIndexes.set({});
      this.providers.set(providers);
      this.loading.set(false);
      if (!providers.length) {
        this.message.set(
          requestFailed ? CONSUMER_UX_COPY.messages.liveConnectSlow : this.unavailableMessage(),
        );
      }
    } catch {
      if (requestVersion !== this.providerRequestVersion) return;
      this.providerSections.set([]);
      this.providers.set([]);
      this.loading.set(false);
      this.message.set(CONSUMER_UX_COPY.messages.liveConnectSlow);
    }
  }

  private autoAdvanceVisibleProviderCarousels(): void {
    const view = this.document.defaultView;
    if (!view || view.innerWidth > 640 || this.document.hidden) return;
    if (view.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.providerSections().forEach((section) => {
      if ((this.providerCarouselPausedUntil.get(section.roleGroup) ?? 0) > Date.now()) return;
      this.scrollProviderCarousel(section.roleGroup, 1, true);
    });
  }

  private scrollProviderCarousel(
    roleGroup: ConsumerSupportPath,
    direction: -1 | 1,
    automatic: boolean,
  ): void {
    const view = this.document.defaultView;
    if (!view || view.innerWidth > 640) return;

    const carousel = this.document.getElementById(`home-provider-carousel-${roleGroup}`);
    if (!carousel) return;
    const bounds = carousel.getBoundingClientRect();
    if (automatic && (bounds.bottom <= 0 || bounds.top >= view.innerHeight)) return;

    const cards = this.providerCarouselCards(carousel);
    if (cards.length < 2) return;
    const currentIndex = Math.min(this.providerCarouselIndex(roleGroup), cards.length - 1);
    const nextIndex = (currentIndex + direction + cards.length) % cards.length;
    const cardBounds = cards[nextIndex].getBoundingClientRect();
    const targetLeft = carousel.scrollLeft + cardBounds.left - bounds.left;
    const reduceMotion = view.matchMedia('(prefers-reduced-motion: reduce)').matches;

    carousel.scrollTo({ left: targetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
    this.providerCarouselIndexes.update((indexes) => ({ ...indexes, [roleGroup]: nextIndex }));
  }

  private providerCarouselCards(carousel: HTMLElement): HTMLElement[] {
    return Array.from(carousel.children).filter((child) =>
      child.classList.contains('live-provider-card'),
    ) as HTMLElement[];
  }

  private providerServiceForMode(
    provider: HopeHubProvider,
  ): NonNullable<HopeHubProvider['services']>[number] | null {
    return providerServiceForLiveConnectMode(provider, this.mode());
  }

  private loadGroups(): void {
    this.groupsLoading.set(true);
    this.bookingService.liveGroups().subscribe({
      next: (res) => {
        this.groups.set((res.groups || []).slice(0, 6));
        this.groupsLoading.set(false);
      },
      error: () => {
        this.groups.set([]);
        this.groupsLoading.set(false);
      },
    });
  }

  private formatPaise(amountInPaise: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amountInPaise / 100);
  }

  private openLiveSession(consultationId: string | undefined): Promise<boolean> {
    if (consultationId) {
      return this.router.navigate(['/live-session', consultationId]);
    }
    return this.router.navigate(['/dashboard']);
  }

  private readErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const inner = (error as { error?: { message?: string } }).error;
      if (inner?.message) return inner.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return CONSUMER_UX_COPY.messages.couldNotStartLive;
  }
}
