import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
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
  HopeHubProvider,
} from '../../../../core/services/booking.service';
import {
  LISTENER_SUPPORT_CONSENT_MESSAGE,
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
  ConnectComfortDialogComponent,
  AppModalComponent,
} from '../../../../shared/components';

type LiveConnectMode = ConsumerLiveConnectMode;
type LiveConnectRoleGroup = '' | ConsumerSupportPath;
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
    ConnectComfortDialogComponent,
    AppModalComponent,
  ],
  templateUrl: './live-connect.component.html',
  styleUrl: './live-connect.component.scss',
})
export class LiveConnectComponent implements OnInit {
  readonly UX = CONSUMER_UX_COPY;
  readonly ROUTES = CONSUMER_ROUTES;
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);
  private readonly liveConnectAction = inject(LiveConnectActionService);
  private readonly notificationService = inject(NotificationService);
  private readonly paymentService = inject(PaymentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private providerRequestVersion = 0;

  readonly currentUser = signal<User | null>(null);
  readonly providers = signal<HopeHubProvider[]>([]);
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
  readonly couponCode = signal('');
  readonly appliedCouponCode = signal('');
  readonly couponQuote = signal<HopeHubCheckoutQuote | null>(null);
  readonly couponLoading = signal(false);
  readonly couponError = signal('');
  readonly couponSuccess = signal('');
  readonly view = signal<'providers' | 'groups'>('providers');
  readonly mode = signal<LiveConnectMode>('chat');
  readonly roleGroup = signal<LiveConnectRoleGroup>('EMOTIONAL_LISTENER');
  readonly paymentFlowState = signal<PaymentFlowState>('IDLE');
  readonly paymentFlowError = signal('');
  readonly paymentFlowConsultation = signal<any | null>(null);
  readonly liveConnectImage = IMAGE_ASSETS.HEALING_HUB.PHOTOS.PHONE_SESSION;

  readonly modes = CONSUMER_LIVE_CONNECT_MODE_OPTIONS;

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.currentUser.set(user);
    });
    this.loadProviders();
    this.loadGroups();
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

  buttonLabel(_provider: HopeHubProvider): string {
    return 'Connect now';
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

  requestStart(provider: HopeHubProvider): void {
    if (this.startingProviderId()) return;
    this.clearLiveCoupon();
    this.pendingProvider.set(provider);
    this.pendingMode.set(null);
  }

  cancelStart(): void {
    this.pendingProvider.set(null);
    this.pendingMode.set(null);
    this.clearLiveCoupon();
  }

  chooseConnectionMode(mode: LiveConnectMode): void {
    const provider = this.pendingProvider();
    if (
      !provider ||
      !this.providerModes(provider).some((item) => item.mode === mode && item.enabled)
    ) {
      return;
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
    this.mode.set(selectedMode);
    this.pendingMode.set(null);
    this.pendingProvider.set(null);
    if (this.startingProviderId()) return;
    if (!this.currentUser()) {
      await this.liveConnectAction.connect(provider, selectedMode, {
        careTeamServiceId: this.providerServiceForMode(provider)?.id || '',
        promoCode: this.appliedCouponCode(),
        fallbackQueryParams: {
          source: 'live-connect',
          supportPath: this.roleGroup() || undefined,
          preferredExpertType: supportPathMeta(supportPathForProvider(provider)).title,
        },
      });
      return;
    }

    const listenerConsent = this.needsListenerSupportConsent(provider)
      ? this.confirmListenerSupportConsent()
      : true;
    if (!listenerConsent) return;

    this.startingProviderId.set(provider.id);
    this.message.set('');
    this.paymentFlowError.set('');
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
      if (payableInPaise > 0) {
        this.paymentFlowState.set('CREATING_ORDER');
        await this.paymentService.payConsultation(response.consultation, {
          onOrderCreated: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
          onCheckoutOpened: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
          onVerifying: () => this.paymentFlowState.set('VERIFYING'),
        });
      }

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
      this.paymentFlowState.set('ERROR');
      this.message.set(message);
      this.notificationService.error(message);
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
      this.couponSuccess.set(
        quote.payableInPaise <= 0
          ? `${code} applied. No payment will be needed.`
          : `${code} applied. Pay ${this.formatPaise(quote.payableInPaise)} after confirmation.`,
      );
    } catch (error) {
      this.appliedCouponCode.set('');
      this.couponQuote.set(null);
      this.couponError.set(this.readErrorMessage(error));
    } finally {
      this.couponLoading.set(false);
    }
  }

  clearLiveCoupon(): void {
    this.couponCode.set('');
    this.appliedCouponCode.set('');
    this.couponQuote.set(null);
    this.couponLoading.set(false);
    this.couponError.set('');
    this.couponSuccess.set('');
  }

  private needsListenerSupportConsent(provider: HopeHubProvider): boolean {
    return providerNeedsListenerSupportConsent(provider);
  }

  private confirmListenerSupportConsent(): boolean {
    if (typeof window === 'undefined') return true;
    return window.confirm(LISTENER_SUPPORT_CONSENT_MESSAGE);
  }

  retryPayment(): void {
    const consultation = this.paymentFlowConsultation();
    if (!consultation || this.startingProviderId()) return;
    this.paymentFlowError.set('');
    this.paymentFlowState.set('CREATING_ORDER');
    void this.paymentService
      .payConsultation(consultation, {
        onOrderCreated: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
        onCheckoutOpened: () => this.paymentFlowState.set('OPENING_CHECKOUT'),
        onVerifying: () => this.paymentFlowState.set('VERIFYING'),
      })
      .then(() => {
        this.paymentFlowState.set('SUCCESS');
        this.notificationService.success('Payment confirmed. Opening your session room.');
        void this.openLiveSession(consultation.id);
      })
      .catch((error) => {
        const message = this.readErrorMessage(error);
        this.paymentFlowError.set(message);
        this.paymentFlowState.set('ERROR');
        this.notificationService.error(message);
      });
  }

  closePaymentOverlay(): void {
    const state = this.paymentFlowState();
    if (state === 'SUCCESS' || state === 'ERROR') {
      this.paymentFlowState.set('IDLE');
      this.paymentFlowError.set('');
      if (state === 'SUCCESS') this.paymentFlowConsultation.set(null);
    }
  }

  paymentFlowTitle(): string {
    const state = this.paymentFlowState();
    if (state === 'CREATING_ORDER') return 'Preparing payment';
    if (state === 'OPENING_CHECKOUT') return 'Secure checkout';
    if (state === 'VERIFYING') return 'Confirming payment';
    if (state === 'SUCCESS') return 'Live session ready';
    if (state === 'ERROR') return 'Could not start live session';
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

  private loadProviders(): void {
    const requestVersion = ++this.providerRequestVersion;
    this.loading.set(true);
    this.message.set('');
    this.bookingService
      .quickTalkProviders({
        roleGroup: this.roleGroup(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (requestVersion !== this.providerRequestVersion) return;
          this.providers.set(res.providers.slice(0, 8));
          this.loading.set(false);
          if (!res.providers.length) {
            this.message.set(this.unavailableMessage());
          }
        },
        error: () => {
          if (requestVersion !== this.providerRequestVersion) return;
          this.providers.set([]);
          this.loading.set(false);
          this.message.set(CONSUMER_UX_COPY.messages.liveConnectSlow);
        },
      });
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
