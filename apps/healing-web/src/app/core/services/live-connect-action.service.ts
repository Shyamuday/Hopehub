import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  consumerModeLabel,
  consumerSessionModeFor,
} from '../constants/consumer-form-options.constants';
import { CONSUMER_ROUTES } from '../constants/consumer-routes.constants';
import { CONSUMER_UX_COPY } from '../constants/consumer-ux-copy.constants';
import { CONSUMER_STORAGE_KEYS } from '../constants/storage-keys.constants';
import { supportPathForProvider, supportPathMeta } from '../constants/support-paths.constants';
import { AuthModalService } from './auth-modal.service';
import { AuthService } from './auth.service';
import { BookingService, HopeHubProvider } from './booking.service';
import { NotificationService } from './notification.service';
import { PaymentService } from './payment.service';
import { ConsumerFlowPreferencesService } from './consumer-flow-preferences.service';
import type { ProviderConsumerSessionMode } from '@hopehub/contracts';
import {
  LISTENER_SUPPORT_CONSENT_MESSAGE,
  providerAcceptsLiveConnectMode,
  providerNeedsListenerSupportConsent,
  providerServiceForLiveConnectMode,
} from '../utils/live-connect-provider.utils';

export type LiveConnectActionMode = ProviderConsumerSessionMode | 'book';

type PendingLiveConnectAction = {
  providerId: string;
  mode: LiveConnectActionMode;
  careTeamServiceId?: string;
  fallbackQueryParams?: Record<string, unknown>;
};

type QuickTalkResponse = {
  consultation: any;
  provider: { id: string; userId: string; name: string };
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

    const canUseMode = providerAcceptsLiveConnectMode(provider, mode);
    const canStartNow = Boolean(provider.quickTalkAvailable) && canUseMode;
    if (!canStartNow) {
      this.notificationService.info(
        canUseMode
          ? CONSUMER_UX_COPY.messages.providerNotLiveBook
          : CONSUMER_UX_COPY.messages.modeUnavailableBook(this.modeLabel(mode)),
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
      this.notificationService.info(CONSUMER_UX_COPY.messages.authRequiredLive);
      this.authModalService.openRegister();
      return;
    }

    if (providerNeedsListenerSupportConsent(provider) && !this.confirmListenerSupportConsent()) {
      return;
    }

    let response: QuickTalkResponse;
    try {
      response = await firstValueFrom(
        this.bookingService.createQuickTalk({
          providerId: provider.id,
          careTeamServiceId:
            options.careTeamServiceId ||
            providerServiceForLiveConnectMode(provider, mode)?.id ||
            '',
          preferredExpertType: supportPathMeta(supportPathForProvider(provider)).title,
          sessionMode: this.sessionMode(mode),
          preferredLanguage: provider.languages?.[0] || '',
          listenerSupportConsent: providerNeedsListenerSupportConsent(provider),
          message: `${consumerModeLabel(mode)} Live Connect request`,
          entryPage: typeof window === 'undefined' ? undefined : window.location.href,
        }),
      );
    } catch (error) {
      const message = this.readErrorMessage(error);
      this.notificationService.error(message);
      await this.openBooking(provider, mode, options);
      return;
    }

    const consultation = response.consultation;
    const consultationId = String(consultation?.id || '');
    if (!consultationId) {
      this.notificationService.error(CONSUMER_UX_COPY.messages.couldNotStartLive);
      await this.router.navigate(CONSUMER_ROUTES.links.dashboard);
      return;
    }

    const payableInPaise = Number(consultation?.payment?.amountInPaise ?? 0);
    if (payableInPaise > 0) {
      try {
        await this.paymentService.payConsultation(consultation);
      } catch (error) {
        this.notificationService.error(this.readErrorMessage(error));
        this.notificationService.info(
          'Your session request is saved. You can retry payment from your dashboard.',
        );
        await this.router.navigate(CONSUMER_ROUTES.links.dashboard, {
          queryParams: { consultationId, payment: 'pending' },
        });
        return;
      }
    }

    this.notificationService.success(`${consumerModeLabel(mode)} session confirmed.`);
    await this.router.navigate(['/live-session', consultationId]);
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
      const pending = this.parsePendingAction(raw);
      if (!pending) throw new Error('Invalid pending live-connect action.');
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
    try {
      sessionStorage.setItem(this.pendingStorageKey, JSON.stringify(action));
    } catch {
      // Authentication can still continue when browser storage is unavailable.
    }
  }

  private parsePendingAction(raw: string): PendingLiveConnectAction | null {
    try {
      const value = JSON.parse(raw) as Partial<PendingLiveConnectAction>;
      if (!value || typeof value.providerId !== 'string' || !value.providerId.trim()) return null;
      if (!['chat', 'voice', 'video'].includes(String(value.mode))) return null;
      return {
        providerId: value.providerId,
        mode: value.mode as ProviderConsumerSessionMode,
        careTeamServiceId:
          typeof value.careTeamServiceId === 'string' ? value.careTeamServiceId : undefined,
        fallbackQueryParams:
          value.fallbackQueryParams && typeof value.fallbackQueryParams === 'object'
            ? value.fallbackQueryParams
            : undefined,
      };
    } catch {
      return null;
    }
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

  private sessionMode(mode: Exclude<LiveConnectActionMode, 'book'>): string {
    return consumerSessionModeFor(mode);
  }

  private modeLabel(mode: LiveConnectActionMode): string {
    return consumerModeLabel(mode);
  }

  private confirmListenerSupportConsent(): boolean {
    if (typeof window === 'undefined') return true;
    return window.confirm(LISTENER_SUPPORT_CONSENT_MESSAGE);
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
