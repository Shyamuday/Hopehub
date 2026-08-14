import { Component, signal, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
import { NavigationService, SEOService } from './core/services';
import { AuthModalService } from './core/services/auth-modal.service';
import { AuthService } from './core/services/auth.service';
import { FontLoader } from './core/utils/font-loader.util';
import { captureReferralAttribution } from './core/utils/referral-attribution.util';

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
    }
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
