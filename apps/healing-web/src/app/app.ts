import { Component, HostListener, signal, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter, take } from 'rxjs';
import { HeaderComponent, FooterComponent } from './layout';
import {
  GlobalLoadingComponent,
  HopeGuideComponent,
  QuickAccessComponent,
  AuthModalComponent,
  ScrollToTopComponent,
  NotificationCenterComponent,
  CookieConsentComponent,
} from './shared/components';
import {
  ConsultationCallInviteComponent,
  ConsultationWebrtcCallService,
  type IceServerConfig,
} from '@hopehub/platform-ui';
import { ConsumerChromeService, HopeHubRealtimeService, NavigationService } from './core/services';
import { AuthModalService } from './core/services/auth-modal.service';
import { AuthService } from './core/services/auth.service';
import { BookingService } from './core/services/booking.service';
import { FontLoader } from './core/utils/font-loader.util';
import { captureReferralAttribution } from './core/utils/referral-attribution.util';
import { CallPushNotificationService } from './core/services/call-push-notification.service';
import { GoogleAdsService } from './core/services/google-ads.service';
import {
  HOPE_HUB_ANALYTICS_EVENTS,
  ProductAnalyticsService,
} from './core/services/product-analytics.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    GlobalLoadingComponent,
    HopeGuideComponent,
    QuickAccessComponent,
    AuthModalComponent,
    ScrollToTopComponent,
    NotificationCenterComponent,
    CookieConsentComponent,
    ConsultationCallInviteComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('hope-hub-website');
  protected readonly isOnline = signal(true);
  protected readonly chrome = inject(ConsumerChromeService);

  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private authModalService = inject(AuthModalService);
  private router = inject(Router);
  private realtime = inject(HopeHubRealtimeService);
  private globalCall = inject(ConsultationWebrtcCallService);
  private bookingService = inject(BookingService);
  private callPush = inject(CallPushNotificationService);
  private googleAds = inject(GoogleAdsService);
  private productAnalytics = inject(ProductAnalyticsService);
  readonly callIceServers = signal<IceServerConfig[]>([{ urls: 'stun:stun.l.google.com:19302' }]);

  constructor(private navigationService: NavigationService) {}

  ngOnInit(): void {
    // Navigation service is automatically initialized through dependency injection

    // Initialize font loading detection in browser only
    if (isPlatformBrowser(this.platformId)) {
      this.isOnline.set(window.navigator.onLine);
      captureReferralAttribution(new URLSearchParams(window.location.search).get('ref'));
      FontLoader.init();

      this.openAuthModalWhenSessionMissing();
      this.bindGlobalCallAlerts();
      this.callPush.init();
      this.googleAds.initialize();
      this.loadCallIceServers();
    }
  }

  @HostListener('window:online')
  onOnline(): void {
    this.isOnline.set(true);
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.isOnline.set(false);
  }

  @HostListener('document:submit', ['$event'])
  onFormSubmit(event: SubmitEvent): void {
    if (!isPlatformBrowser(this.platformId) || !(event.target instanceof HTMLFormElement)) return;
    const form = event.target;
    window.requestAnimationFrame(() => {
      const invalid = Array.from(
        form.querySelectorAll<HTMLElement>(
          ':invalid, .ng-invalid:not(form), [aria-invalid="true"]',
        ),
      ).find((element) => element.getClientRects().length > 0);
      if (!invalid) return;
      invalid.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!isPlatformBrowser(this.platformId) || !(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) return;

    try {
      const destination = new URL(anchor.href, window.location.origin);
      if (destination.hostname !== 't.me' && destination.hostname !== 'telegram.me') return;
      this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.TELEGRAM_OUTBOUND_CLICKED, {
        destination: destination.pathname.replace(/^\//, '') || 'telegram',
        source: window.location.pathname,
      });
    } catch {
      // Ignore malformed third-party URLs and allow normal navigation to continue.
    }
  }

  openIncomingCall(consultationId: string): void {
    if (!consultationId) return;
    void this.router.navigate(['/live-session', consultationId]);
  }

  private bindGlobalCallAlerts(): void {
    this.authService.authState$.subscribe((state) => {
      if (!state.isAuthenticated && !this.authService.getToken()) {
        if (this.globalCall.hasActiveCall()) void this.globalCall.endCurrentCall('signed_out');
        return;
      }
      const socket = this.realtime.connect();
      if (socket) this.globalCall.bindSocket(socket);
    });
  }

  private loadCallIceServers(): void {
    this.bookingService
      .iceServers()
      .pipe(take(1))
      .subscribe({
        next: ({ iceServers }) => {
          if (iceServers?.length) this.callIceServers.set(iceServers);
        },
        error: () => undefined,
      });
  }

  private openAuthModalWhenSessionMissing(): void {
    this.authService.authState$
      .pipe(
        filter((state) => !state.isLoading),
        take(1),
      )
      .subscribe((state) => {
        if (state.isAuthenticated || this.authService.getToken()) {
          return;
        }

        const referralVisit = new URLSearchParams(window.location.search).has('ref');
        window.setTimeout(
          () => {
            if (!this.authService.getToken() && !this.authModalService.getCurrentModal()) {
              this.authModalService.openRegister();
            }
          },
          referralVisit ? 0 : 12000,
        );
      });
  }
}
