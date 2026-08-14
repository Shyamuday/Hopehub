import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthModalService } from './auth-modal.service';
import { AuthService } from './auth.service';
import { BookingService, type HopeHubProvider } from './booking.service';
import { ConsumerFlowPreferencesService } from './consumer-flow-preferences.service';
import { LiveConnectActionService } from './live-connect-action.service';
import { NotificationService } from './notification.service';
import { PaymentService } from './payment.service';

describe('LiveConnectActionService', () => {
  const user$ = new BehaviorSubject<unknown | null>(null);
  const authService = {
    user$: user$.asObservable(),
    getToken: vi.fn<() => string | null>(),
    getCurrentUser: vi.fn(() => null),
  };
  const authModalService = { openRegister: vi.fn() };
  const bookingService = {
    createQuickTalk: vi.fn(),
    provider: vi.fn(),
  };
  const notificationService = {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  };
  const paymentService = { payConsultation: vi.fn() };
  const preferences = { update: vi.fn() };
  const router = { navigate: vi.fn().mockResolvedValue(true) };

  const provider = (overrides: Partial<HopeHubProvider> = {}): HopeHubProvider =>
    ({
      id: 'provider-1',
      name: 'Asha',
      quickTalkAvailable: true,
      supportedModes: ['CHAT', 'VOICE', 'VIDEO'],
      acceptsChat: true,
      acceptsVoiceCall: true,
      acceptsVideoCall: true,
      languages: ['English'],
      services: [],
      ...overrides,
    }) as HopeHubProvider;

  beforeEach(() => {
    user$.next(null);
    sessionStorage.clear();
    vi.resetAllMocks();
    router.navigate.mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        LiveConnectActionService,
        { provide: AuthService, useValue: authService },
        { provide: AuthModalService, useValue: authModalService },
        { provide: BookingService, useValue: bookingService },
        { provide: NotificationService, useValue: notificationService },
        { provide: PaymentService, useValue: paymentService },
        { provide: ConsumerFlowPreferencesService, useValue: preferences },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('stores the selected action and opens signup when authentication is required', async () => {
    authService.getToken.mockReturnValue(null);
    const service = TestBed.inject(LiveConnectActionService);

    await service.connect(provider(), 'chat', { checkoutPhone: '+91 98765 43210' });

    expect(authModalService.openRegister).toHaveBeenCalledOnce();
    expect(bookingService.createQuickTalk).not.toHaveBeenCalled();
    expect(sessionStorage.length).toBe(1);
  });

  it('resumes the stored provider and mode after login', async () => {
    authService.getToken.mockReturnValue(null);
    const service = TestBed.inject(LiveConnectActionService);
    await service.connect(provider(), 'video', { promoCode: 'FIRSTTALK1' });

    bookingService.provider.mockReturnValue(of({ provider: provider() }));
    bookingService.createQuickTalk.mockReturnValue(
      of({
        consultation: { id: 'consultation-after-login', payment: { amountInPaise: 0 } },
        provider: { id: 'provider-1', userId: 'user-1', name: 'Asha' },
      }),
    );
    authService.getToken.mockReturnValue('token');
    user$.next({ id: 'patient-1' });

    await vi.waitFor(() => {
      expect(bookingService.createQuickTalk).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'provider-1',
          sessionMode: 'online_video',
          promoCode: 'FIRSTTALK1',
        }),
      );
      expect(router.navigate).toHaveBeenCalledWith(['/live-session', 'consultation-after-login']);
    });
    expect(sessionStorage.length).toBe(0);
  });

  it('opens booking when the provider does not support the selected mode', async () => {
    authService.getToken.mockReturnValue('token');
    const service = TestBed.inject(LiveConnectActionService);

    await service.connect(provider({ supportedModes: ['CHAT'] }), 'video');

    expect(bookingService.createQuickTalk).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/contact'], {
      queryParams: expect.objectContaining({ providerId: 'provider-1', mode: 'video' }),
    });
  });

  it('opens the live room after a free session is created', async () => {
    authService.getToken.mockReturnValue('token');
    bookingService.createQuickTalk.mockReturnValue(
      of({
        consultation: { id: 'consultation-1', payment: { amountInPaise: 0 } },
        provider: { id: 'provider-1', userId: 'user-1', name: 'Asha' },
      }),
    );
    const service = TestBed.inject(LiveConnectActionService);

    await service.connect(provider(), 'voice');

    expect(paymentService.payConsultation).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/live-session', 'consultation-1']);
  });

  it('keeps a created session for dashboard retry when payment fails', async () => {
    authService.getToken.mockReturnValue('token');
    const consultation = { id: 'consultation-2', payment: { amountInPaise: 9900 } };
    bookingService.createQuickTalk.mockReturnValue(
      of({
        consultation,
        provider: { id: 'provider-1', userId: 'user-1', name: 'Asha' },
      }),
    );
    paymentService.payConsultation.mockRejectedValue(new Error('Payment was closed.'));
    const service = TestBed.inject(LiveConnectActionService);

    await service.connect(provider(), 'chat', { checkoutPhone: '+91 98765 43210' });

    expect(paymentService.payConsultation).toHaveBeenCalledWith(
      consultation,
      expect.objectContaining({ prefillPhone: '+91 98765 43210' }),
    );

    expect(router.navigate).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard'], {
      queryParams: { consultationId: 'consultation-2', payment: 'pending' },
    });
  });

  it('falls back to booking when the backend cannot create a live session', async () => {
    authService.getToken.mockReturnValue('token');
    bookingService.createQuickTalk.mockReturnValue(
      throwError(() => ({ error: { message: 'Provider is no longer live.' } })),
    );
    const service = TestBed.inject(LiveConnectActionService);

    await service.connect(provider(), 'chat');

    expect(notificationService.error).toHaveBeenCalledWith('Provider is no longer live.');
    expect(router.navigate).toHaveBeenCalledWith(['/contact'], {
      queryParams: expect.objectContaining({ providerId: 'provider-1', mode: 'chat' }),
    });
  });
});
