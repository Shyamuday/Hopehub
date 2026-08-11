import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CONSUMER_ROUTES } from '../constants/consumer-routes.constants';
import { CONSUMER_STORAGE_KEYS } from '../constants/storage-keys.constants';
import { supportPathForProvider, supportPathMeta } from '../constants/support-paths.constants';
import { AuthModalService } from './auth-modal.service';
import { AuthService } from './auth.service';
import { BookingService, HopeHubProvider } from './booking.service';
import { NotificationService } from './notification.service';
import { PaymentService } from './payment.service';
import { ConsumerFlowPreferencesService } from './consumer-flow-preferences.service';

export type LiveConnectActionMode = 'chat' | 'voice' | 'video' | 'book';

type PendingLiveConnectAction = {
  providerId: string;
  mode: LiveConnectActionMode;
  careTeamServiceId?: string;
  fallbackQueryParams?: Record<string, unknown>;
};

@Injectable({ providedIn: 'root' })
export class LiveConnectActionService {
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly bookingService = inject(BookingService);
  private readonly notificationService = inject(NotificationService);
  private readonly paymentService = inject(PaymentService);
  private readonly preferences = inject(ConsumerFlowPreferencesService);
  private readonly router = inject(Router);
  private readonly pendingStorageKey = CONSUMER_STORAGE_KEYS.pendingLiveConnectAction;
  private replayingPending = false;

  constructor() {
    this.authService.user$.subscribe((user) => {
      if (!user || this.replayingPending) return;
      void this.resumePendingAction();
    });
  }

  async connect(
    provider: HopeHubProvider,
    mode: LiveConnectActionMode,
    options: {
      careTeamServiceId?: string;
      fallbackQueryParams?: Record<string, unknown>;
    } = {},
  ): Promise<void> {
    if (mode === 'book') {
      await this.openBooking(provider, 'voice', options);
      return;
    }
    this.savePreference(provider, mode, options.fallbackQueryParams);

    const canUseMode = this.providerAcceptsMode(provider, mode);
    const canStartNow = Boolean(provider.quickTalkAvailable) && canUseMode;
    if (!canStartNow) {
      this.notificationService.info(
        canUseMode
          ? 'This provider is not live right now. Choose a slot and we will route your request.'
          : `${this.modeLabel(mode)} is not available for this provider. Choose a slot instead.`,
      );
      await this.openBooking(provider, mode, options);
      return;
    }

    if (!this.authService.getToken()) {
      this.savePendingAction({
        providerId: provider.id,
        mode,
        careTeamServiceId: options.careTeamServiceId,
        fallbackQueryParams: options.fallbackQueryParams,
      });
      this.notificationService.info('Sign up or log in to start this live session.');
      this.authModalService.openRegister();
      return;
    }

    if (this.needsListenerSupportConsent(provider) && !this.confirmListenerSupportConsent()) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.bookingService.createQuickTalk({
          providerId: provider.id,
          careTeamServiceId:
            options.careTeamServiceId || this.providerServiceForMode(provider, mode)?.id || '',
          preferredExpertType: supportPathMeta(supportPathForProvider(provider)).title,
          sessionMode: this.sessionMode(mode),
          preferredLanguage: provider.languages?.[0] || '',
          listenerSupportConsent: this.needsListenerSupportConsent(provider),
          message: `${this.modeLabel(mode)} Live Connect request`,
          entryPage: typeof window === 'undefined' ? undefined : window.location.href,
        }),
      );

      const payableInPaise = Number(response.consultation?.payment?.amountInPaise ?? 0);
      if (payableInPaise > 0) {
        await this.paymentService.payConsultation(response.consultation);
      }

      this.notificationService.success(`${this.modeLabel(mode)} session confirmed.`);
      await this.router.navigate(['/live-session', response.consultation?.id]);
    } catch (error) {
      const message = this.readErrorMessage(error);
      this.notificationService.error(message);
      await this.openBooking(provider, mode, options);
    }
  }

  async openBooking(
    provider: HopeHubProvider,
    mode: Exclude<LiveConnectActionMode, 'book'>,
    options: {
      fallbackQueryParams?: Record<string, unknown>;
      careTeamServiceId?: string;
    } = {},
  ): Promise<void> {
    this.savePreference(provider, mode, options.fallbackQueryParams);
    await this.router.navigate(CONSUMER_ROUTES.links.bookSupport, {
      queryParams: {
        ...(options.fallbackQueryParams || {}),
        providerId: provider.id,
        consultant: provider.name,
        careTeamServiceId:
          options.careTeamServiceId || options.fallbackQueryParams?.['careTeamServiceId'] || '',
        mode,
        sessionMode: this.sessionMode(mode),
        source: `smart-connect-${mode}`,
      },
    });
  }

  private async resumePendingAction(): Promise<void> {
    if (typeof sessionStorage === 'undefined') return;
    const raw = sessionStorage.getItem(this.pendingStorageKey);
    if (!raw) return;
    sessionStorage.removeItem(this.pendingStorageKey);

    try {
      this.replayingPending = true;
      const pending = JSON.parse(raw) as PendingLiveConnectAction;
      const { provider } = await firstValueFrom(this.bookingService.provider(pending.providerId));
      await this.connect(provider, pending.mode, {
        careTeamServiceId: pending.careTeamServiceId,
        fallbackQueryParams: pending.fallbackQueryParams,
      });
    } catch {
      this.notificationService.info(
        'You are signed in. Please choose your live support option again.',
      );
    } finally {
      this.replayingPending = false;
    }
  }

  private savePendingAction(action: PendingLiveConnectAction): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(this.pendingStorageKey, JSON.stringify(action));
  }

  private savePreference(
    provider: HopeHubProvider,
    mode: Exclude<LiveConnectActionMode, 'book'>,
    fallbackQueryParams?: Record<string, unknown>,
  ): void {
    this.preferences.update({
      mode,
      providerId: provider.id,
      serviceName: String(
        fallbackQueryParams?.['serviceName'] || fallbackQueryParams?.['service'] || '',
      ),
      concern: String(
        fallbackQueryParams?.['concernCategory'] || fallbackQueryParams?.['concern'] || '',
      ),
    });
  }

  private providerAcceptsMode(
    provider: HopeHubProvider,
    mode: Exclude<LiveConnectActionMode, 'book'>,
  ): boolean {
    if (mode === 'chat') return provider.acceptsChat !== false;
    if (mode === 'voice') return provider.acceptsVoiceCall !== false;
    return provider.acceptsVideoCall !== false;
  }

  private providerServiceForMode(
    provider: HopeHubProvider,
    mode: Exclude<LiveConnectActionMode, 'book'>,
  ) {
    const services = provider.services || [];
    return (
      services.find((service) => {
        const text = [service.title, service.description, service.pricingLabel]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (mode === 'chat') return /\b(chat|message|text)\b/.test(text);
        if (mode === 'video') return /\bvideo\b/.test(text);
        return /\b(voice|audio|call)\b/.test(text);
      }) ||
      services[0] ||
      null
    );
  }

  private sessionMode(mode: Exclude<LiveConnectActionMode, 'book'>): string {
    if (mode === 'video') return 'online_video';
    if (mode === 'chat') return 'live_chat';
    return 'online_audio';
  }

  private modeLabel(mode: LiveConnectActionMode): string {
    if (mode === 'video') return 'Video';
    if (mode === 'voice') return 'Voice';
    if (mode === 'chat') return 'Chat';
    return 'Booking';
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

  private readErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const inner = (error as { error?: { message?: string } }).error;
      if (inner?.message) return inner.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return 'Could not start this live session right now.';
  }
}
