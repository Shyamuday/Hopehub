import { Component, signal, OnInit, PLATFORM_ID, inject } from '@angular/core';
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
} from './shared/components';
import {
  ConsultationCallInviteComponent,
  ConsultationWebrtcCallService,
  type IceServerConfig,
} from '@hopehub/platform-ui';
import { HopeHubRealtimeService, NavigationService, SEOService } from './core/services';
import { AuthModalService } from './core/services/auth-modal.service';
import { AuthService } from './core/services/auth.service';
import { BookingService } from './core/services/booking.service';
import { FontLoader } from './core/utils/font-loader.util';
import { captureReferralAttribution } from './core/utils/referral-attribution.util';
import { CallPushNotificationService } from './core/services/call-push-notification.service';

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
    ConsultationCallInviteComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('hope-hub-website');

  private seoService = inject(SEOService);
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private authModalService = inject(AuthModalService);
  private router = inject(Router);
  private realtime = inject(HopeHubRealtimeService);
  private globalCall = inject(ConsultationWebrtcCallService);
  private bookingService = inject(BookingService);
  private callPush = inject(CallPushNotificationService);
  readonly callIceServers = signal<IceServerConfig[]>([{ urls: 'stun:stun.l.google.com:19302' }]);

  constructor(private navigationService: NavigationService) {}

  ngOnInit(): void {
    // Navigation service is automatically initialized through dependency injection

    // Initialize font loading detection in browser only
    if (isPlatformBrowser(this.platformId)) {
      captureReferralAttribution(new URLSearchParams(window.location.search).get('ref'));
      FontLoader.init();

      // Add organization structured data for SEO
      this.seoService.addOrganizationStructuredData();

      this.openAuthModalWhenSessionMissing();
      this.bindGlobalCallAlerts();
      this.callPush.init();
      this.loadCallIceServers();
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
