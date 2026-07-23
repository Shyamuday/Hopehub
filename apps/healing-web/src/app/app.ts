import { Component, signal, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter, take } from 'rxjs';
import { HeaderComponent, FooterComponent } from './layout';
import {
  BreadcrumbComponent,
  GlobalLoadingComponent,
  QuickAccessComponent,
  AuthModalComponent,
  AnnouncementBannerComponent,
  ScrollToTopComponent,
} from './shared/components';
import { NavigationService, SEOService } from './core/services';
import { AuthModalService } from './core/services/auth-modal.service';
import { AuthService } from './core/services/auth.service';
import { FontLoader } from './core/utils/font-loader.util';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    BreadcrumbComponent,
    GlobalLoadingComponent,
    QuickAccessComponent,
    AuthModalComponent,
    AnnouncementBannerComponent,
    ScrollToTopComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('hope-hub-website');
  protected readonly announcementItems = [
    'Daily 9 PM Telegram voice circle with Hope Hub experts',
    'Request support for breakup, anxiety, career stress, mood, and relationships',
    'Provider is matched after your request is reviewed',
  ];

  private seoService = inject(SEOService);
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private authModalService = inject(AuthModalService);

  constructor(private navigationService: NavigationService) {}

  ngOnInit(): void {
    // Navigation service is automatically initialized through dependency injection

    // Initialize font loading detection in browser only
    if (isPlatformBrowser(this.platformId)) {
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

        window.setTimeout(() => {
          if (!this.authService.getToken() && !this.authModalService.getCurrentModal()) {
            this.authModalService.openLogin();
          }
        }, 20000);
      });
  }
}
