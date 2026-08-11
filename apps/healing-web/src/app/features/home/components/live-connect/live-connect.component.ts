import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AuthModalService,
  AuthService,
  BookingService,
  NotificationService,
  PaymentService,
} from '../../../../core/services';
import { IMAGE_ASSETS } from '../../../../core/constants/image-assets.constants';
import { CONSUMER_UX_COPY } from '../../../../core/constants/consumer-ux-copy.constants';
import { CONSUMER_ROUTES } from '../../../../core/constants/consumer-routes.constants';
import {
  ConsumerSupportPath,
  supportPathForProvider,
  supportPathMeta,
} from '../../../../core/constants/support-paths.constants';
import { User } from '../../../../core/models/auth.model';
import { HopeHubLiveGroup, HopeHubProvider } from '../../../../core/services/booking.service';
import {
  PaymentFlowState,
  PaymentStatusOverlayComponent,
  SupportPathSelectorComponent,
} from '../../../../shared/components';

type LiveConnectMode = 'chat' | 'voice' | 'video';
type LiveConnectRoleGroup = '' | ConsumerSupportPath;
type LiveConnectAlternativeMode = {
  mode: LiveConnectMode;
  label: string;
  icon: string;
  count: number;
};

@Component({
  selector: 'app-live-connect',
  standalone: true,
  imports: [FormsModule, PaymentStatusOverlayComponent, RouterModule, SupportPathSelectorComponent],
  templateUrl: './live-connect.component.html',
  styleUrl: './live-connect.component.scss',
})
export class LiveConnectComponent implements OnInit {
  readonly UX = CONSUMER_UX_COPY;
  readonly ROUTES = CONSUMER_ROUTES;
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly notificationService = inject(NotificationService);
  private readonly paymentService = inject(PaymentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

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
  readonly view = signal<'providers' | 'groups'>('providers');
  readonly mode = signal<LiveConnectMode>('chat');
  readonly roleGroup = signal<LiveConnectRoleGroup>('');
  readonly alternativeModes = signal<LiveConnectAlternativeMode[]>([]);
  readonly alternativeModesLoading = signal(false);
  readonly paymentFlowState = signal<PaymentFlowState>('IDLE');
  readonly paymentFlowError = signal('');
  readonly paymentFlowConsultation = signal<any | null>(null);
  readonly liveConnectImage = IMAGE_ASSETS.HEALING_HUB.PHOTOS.PHONE_SESSION;

  readonly modes: Array<{
    value: LiveConnectMode;
    label: string;
    icon: string;
    copy: string;
  }> = [
    { value: 'chat', label: 'Chat', icon: '💬', copy: 'Private messages first' },
    { value: 'voice', label: 'Voice', icon: '🎧', copy: 'Speak without camera' },
    { value: 'video', label: 'Video', icon: '🎥', copy: 'Face-to-face support' },
  ];

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
    const mode = this.mode();
    if (mode === 'video') return 'online_video';
    if (mode === 'voice') return 'online_audio';
    return 'live_chat';
  }

  buttonLabel(_provider: HopeHubProvider): string {
    return `Start ${this.modeLabel().toLowerCase()} support`;
  }

  providerTrustLabel(provider: HopeHubProvider): string {
    if (provider.isClinicalCare) return 'Verified professional';
    const role = this.providerRoleLabel(provider) || this.providerTierLabel(provider);
    if (/listener|volunteer/i.test(role)) return 'Reviewed listener';
    if (/counsellor/i.test(role)) return 'Verified counsellor';
    return 'Verified support';
  }

  providerLiveLabel(provider: HopeHubProvider): string {
    const wentLiveAt = provider.wentLiveAt ? new Date(provider.wentLiveAt).getTime() : 0;
    if (!wentLiveAt || Number.isNaN(wentLiveAt)) return 'Online now';
    const minutes = Math.max(0, Math.floor((Date.now() - wentLiveAt) / 60_000));
    if (minutes < 1) return 'Online just now';
    if (minutes < 60) return `Online ${minutes} min`;
    return 'Online today';
  }

  providerLanguagesLabel(provider: HopeHubProvider): string {
    const languages = provider.languages?.filter(Boolean).slice(0, 3) || [];
    return languages.length ? languages.join(', ') : 'Language flexible';
  }

  providerFocusLabel(provider: HopeHubProvider): string {
    const focus = provider.concernsHandled?.length ? provider.concernsHandled : provider.focusAreas;
    return focus?.filter(Boolean).slice(0, 2).join(' · ') || 'Emotional support';
  }

  providerModeBadges(provider: HopeHubProvider): Array<{
    mode: LiveConnectMode;
    label: string;
    icon: string;
    enabled: boolean;
  }> {
    return [
      { mode: 'chat', label: 'Chat', icon: '💬', enabled: Boolean(provider.acceptsChat) },
      {
        mode: 'voice',
        label: 'Voice',
        icon: '🎧',
        enabled: Boolean(provider.acceptsVoiceCall),
      },
      {
        mode: 'video',
        label: 'Video',
        icon: '🎥',
        enabled: Boolean(provider.acceptsVideoCall),
      },
    ];
  }

  groupStatusLabel(group: HopeHubLiveGroup): string {
    if (group.status === 'LIVE') return 'Live now';
    if (group.status === 'SCHEDULED') return 'Scheduled';
    return group.status;
  }

  liveGroupModeLabel(_group: HopeHubLiveGroup): string {
    return 'Open chat';
  }

  unavailableTitle(): string {
    return `No ${this.modeLabel().toLowerCase()} expert is live right now`;
  }

  unavailableMessage(): string {
    return `You can still book a consultation and we will route you to the right Hope Hub expert for ${this.modeLabel().toLowerCase()} support.`;
  }

  alternativeModesMessage(): string {
    const alternatives = this.alternativeModes();
    if (!alternatives.length) return '';
    if (alternatives.length === 1) {
      const item = alternatives[0];
      return `${item.count} ${item.label.toLowerCase()} ${item.count === 1 ? 'expert is' : 'experts are'} live now.`;
    }
    return 'Other live options are available now.';
  }

  tryAlternativeMode(mode: LiveConnectMode): void {
    this.setMode(mode);
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
          this.notificationService.success('Support chat created.');
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

  async start(provider: HopeHubProvider): Promise<void> {
    if (this.startingProviderId()) return;
    if (!this.currentUser()) {
      this.notificationService.info('Sign up or log in to start a live session.');
      this.authModalService.openRegister();
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
      this.notificationService.success('Live session confirmed. Opening your session room.');
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

  private needsListenerSupportConsent(provider: HopeHubProvider): boolean {
    return /listener|volunteer|peer support/i.test(
      [
        provider.supportRole,
        provider.careTeamType,
        provider.supportRoleLabel,
        provider.supportTierLabel,
        provider.specialty,
        provider.designation,
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  private confirmListenerSupportConsent(): boolean {
    if (typeof window === 'undefined') return true;
    return window.confirm(
      'Emotional support listeners are non-clinical. They cannot diagnose, prescribe, or handle emergencies alone. Safety concerns may be escalated to Hope Hub/professional support. Continue?',
    );
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
    this.loading.set(true);
    this.message.set('');
    this.alternativeModes.set([]);
    this.alternativeModesLoading.set(false);
    this.bookingService
      .quickTalkProviders({
        roleGroup: this.roleGroup(),
        mode: this.mode(),
      })
      .subscribe({
        next: (res) => {
          this.providers.set(res.providers.slice(0, 8));
          this.loading.set(false);
          if (!res.providers.length) {
            this.message.set(this.unavailableMessage());
            void this.loadAlternativeModes(this.mode(), this.roleGroup());
          }
        },
        error: () => {
          this.providers.set([]);
          this.alternativeModes.set([]);
          this.alternativeModesLoading.set(false);
          this.loading.set(false);
          this.message.set('Live Connect is loading slowly. Please try again in a moment.');
        },
      });
  }

  private providerServiceForMode(
    provider: HopeHubProvider,
  ): NonNullable<HopeHubProvider['services']>[number] | null {
    const services = provider.services || [];
    const mode = this.mode();
    const matched = services.find((service) => {
      const text = `${service.title || ''} ${service.description || ''}`.toLowerCase();
      if (mode === 'chat') return /\b(chat|message|text)\b/.test(text);
      if (mode === 'video') return /\b(video)\b/.test(text);
      return /\b(voice|audio|call)\b/.test(text);
    });
    return matched || services[0] || null;
  }

  private async loadAlternativeModes(
    requestedMode: LiveConnectMode,
    requestedRoleGroup: string,
  ): Promise<void> {
    const modes = this.modes.filter((item) => item.value !== requestedMode);
    this.alternativeModesLoading.set(true);
    try {
      const alternatives = await Promise.all(
        modes.map(async (item) => {
          try {
            const res = await firstValueFrom(
              this.bookingService.quickTalkProviders({
                roleGroup: requestedRoleGroup,
                mode: item.value,
              }),
            );
            const count = Math.max(Number(res.total || 0), res.providers?.length || 0);
            return count > 0
              ? {
                  mode: item.value,
                  label: item.label,
                  icon: item.icon,
                  count,
                }
              : null;
          } catch {
            return null;
          }
        }),
      );

      if (this.mode() !== requestedMode || this.roleGroup() !== requestedRoleGroup) return;
      this.alternativeModes.set(
        alternatives.filter((item): item is LiveConnectAlternativeMode => Boolean(item)),
      );
    } finally {
      if (this.mode() === requestedMode && this.roleGroup() === requestedRoleGroup) {
        this.alternativeModesLoading.set(false);
      }
    }
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
    return 'Could not start Live Connect right now.';
  }
}
