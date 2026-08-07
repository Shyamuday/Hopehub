import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
import { User } from '../../../../core/models/auth.model';
import { HopeHubProvider } from '../../../../core/services/booking.service';
import { PaymentFlowState, PaymentStatusOverlayComponent } from '../../../../shared/components';

type LiveConnectMode = 'chat' | 'voice' | 'video';

@Component({
  selector: 'app-live-connect',
  standalone: true,
  imports: [PaymentStatusOverlayComponent, RouterLink],
  templateUrl: './live-connect.component.html',
  styleUrl: './live-connect.component.scss',
})
export class LiveConnectComponent implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly notificationService = inject(NotificationService);
  private readonly paymentService = inject(PaymentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly currentUser = signal<User | null>(null);
  readonly providers = signal<HopeHubProvider[]>([]);
  readonly loading = signal(false);
  readonly message = signal('');
  readonly startingProviderId = signal('');
  readonly mode = signal<LiveConnectMode>('chat');
  readonly roleGroup = signal('');
  readonly paymentFlowState = signal<PaymentFlowState>('IDLE');
  readonly paymentFlowError = signal('');
  readonly paymentFlowConsultation = signal<any | null>(null);

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

  readonly tabs = [
    { value: '', label: 'All live' },
    { value: 'PROFESSIONALS', label: 'Psychologists' },
    { value: 'COUNSELLORS', label: 'Counsellors' },
    { value: 'VOLUNTEERS', label: 'Listeners' },
    { value: 'COACHES', label: 'Coaches' },
    { value: 'MENTORS', label: 'Mentors' },
  ];

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.currentUser.set(user);
    });
    this.loadProviders();
  }

  setMode(mode: LiveConnectMode): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.loadProviders();
  }

  setRoleGroup(roleGroup: string): void {
    if (this.roleGroup() === roleGroup) return;
    this.roleGroup.set(roleGroup);
    this.loadProviders();
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

  sessionMode(): string {
    const mode = this.mode();
    if (mode === 'video') return 'online_video';
    if (mode === 'voice') return 'online_audio';
    return 'live_chat';
  }

  buttonLabel(provider: HopeHubProvider): string {
    const meta = this.sessionMeta(provider);
    return `Start ${this.modeLabel().toLowerCase()}${meta ? ` · ${meta}` : ''}`;
  }

  sessionMeta(provider: HopeHubProvider): string {
    const service = provider.services?.[0];
    const duration = service?.durationMinutes || provider.sessionDurationMinutes;
    const price =
      service?.effectivePriceInPaise ?? service?.priceInPaise ?? provider.sessionFeeInPaise;
    const pieces: string[] = [];
    if (duration) pieces.push(`${duration} min`);
    if (price != null) pieces.push(price <= 0 ? 'Free' : this.formatPaise(price));
    return pieces.join(' · ');
  }

  async start(provider: HopeHubProvider): Promise<void> {
    if (this.startingProviderId()) return;
    if (!this.currentUser()) {
      this.notificationService.info('Sign up or log in to start a live session.');
      this.authModalService.openRegister();
      return;
    }

    this.startingProviderId.set(provider.id);
    this.message.set('');
    this.paymentFlowError.set('');
    try {
      const response = await firstValueFrom(
        this.bookingService.createQuickTalk({
          providerId: provider.id,
          careTeamServiceId: provider.services?.[0]?.id || '',
          preferredExpertType: provider.supportTierLabel || provider.supportRoleLabel || '',
          sessionMode: this.sessionMode(),
          preferredLanguage: provider.languages?.[0] || '',
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
      this.notificationService.success('Live session confirmed. Opening your dashboard.');
      void this.router.navigate(['/dashboard'], {
        queryParams: { consultationId: response.consultation?.id || undefined },
      });
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
        this.notificationService.success('Payment confirmed. Opening your dashboard.');
        void this.router.navigate(['/dashboard'], {
          queryParams: { consultationId: consultation.id || undefined },
        });
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
    if (state === 'SUCCESS') return 'Your session is confirmed. We are opening your dashboard.';
    if (state === 'ERROR') return this.paymentFlowError() || 'Please retry safely.';
    return '';
  }

  private loadProviders(): void {
    this.loading.set(true);
    this.message.set('');
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
            this.message.set(
              `No ${this.modeLabel().toLowerCase()} experts are live in this tab right now.`,
            );
          }
        },
        error: () => {
          this.providers.set([]);
          this.loading.set(false);
          this.message.set('Live Connect is loading slowly. Please try again in a moment.');
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

  private readErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const inner = (error as { error?: { message?: string } }).error;
      if (inner?.message) return inner.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return 'Could not start Live Connect right now.';
  }
}
