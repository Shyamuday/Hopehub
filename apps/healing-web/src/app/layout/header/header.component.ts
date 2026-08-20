import { Component, OnDestroy, OnInit, signal, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationService, NavigationState } from '../../core/services/navigation.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { NotificationService } from '../../core/services/notification.service';
import { User } from '../../core/models/auth.model';
import { APP_CONSTANTS } from '../../core/constants/app.constants';
import { CONSUMER_UX_COPY } from '../../core/constants/consumer-ux-copy.constants';
import { CONSUMER_ROUTES } from '../../core/constants/consumer-routes.constants';
import { ViewportOverlayService } from '../../core/services/viewport-overlay.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule],
  template: `
    <header class="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <nav
        class="container mx-auto px-4 sm:px-6 lg:px-8"
        role="navigation"
        aria-label="Main navigation"
      >
        <div class="flex h-[4.5rem] items-center justify-between">
          <!-- Logo and Brand -->
          <div class="flex items-center">
            <a
              [routerLink]="ROUTES.links.home"
              class="flex items-center"
              (click)="closeMobileMenu()"
              aria-label="Hope Hub - Go to homepage"
            >
              <img
                [src]="APP_CONSTANTS.BRAND.LOGO_PATH"
                alt="Hope Hub"
                class="h-12 w-12 rounded-2xl object-cover"
                width="48"
                height="48"
              />
            </a>
          </div>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center space-x-3 lg:space-x-4">
            <a
              [routerLink]="ROUTES.links.home"
              [fragment]="ROUTES.fragments.liveConnect"
              class="text-gray-700 hover:text-primary-600 px-2 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap"
            >
              {{ UX.cta.talkNow }}
            </a>
            <a
              [routerLink]="ROUTES.links.support"
              routerLinkActive="text-primary-600 border-b-2 border-primary-600"
              class="text-gray-700 hover:text-primary-600 px-2 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap"
              [attr.aria-current]="isCurrentRoute(ROUTES.paths.support) ? 'page' : null"
            >
              Find support
            </a>
            <a
              [routerLink]="ROUTES.links.assessments"
              routerLinkActive="text-primary-600 border-b-2 border-primary-600"
              class="text-gray-700 hover:text-primary-600 px-2 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap"
              [attr.aria-current]="isCurrentRoute(ROUTES.paths.assessments) ? 'page' : null"
            >
              Assessments
            </a>
            <a
              [routerLink]="ROUTES.links.community"
              routerLinkActive="text-primary-600 border-b-2 border-primary-600"
              class="text-gray-700 hover:text-primary-600 px-2 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap"
              [attr.aria-current]="isCurrentRoute(ROUTES.paths.community) ? 'page' : null"
            >
              Community
            </a>
            <div class="relative group">
              <button
                type="button"
                class="flex items-center px-2 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:text-primary-600 whitespace-nowrap"
                aria-haspopup="menu"
              >
                Explore
                <svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                class="invisible absolute left-0 z-50 mt-2 w-48 rounded-md border border-gray-200 bg-white py-1 opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100"
                role="menu"
              >
                <a
                  [routerLink]="ROUTES.links.services"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Services</a
                >
                <a
                  [routerLink]="ROUTES.links.careTeam"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Care team</a
                >
                <a
                  [routerLink]="ROUTES.links.exercises"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Exercises</a
                >
                <a
                  [routerLink]="ROUTES.links.lifestyleTips"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Lifestyle tips</a
                >
                <a
                  [routerLink]="ROUTES.links.articles"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Articles</a
                >
                <a
                  [routerLink]="ROUTES.links.packages"
                  routerLinkActive="text-primary-600 bg-primary-50"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Packages</a
                >
                <a
                  [routerLink]="ROUTES.links.events"
                  routerLinkActive="text-primary-600 bg-primary-50"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Events</a
                >
                <a
                  [routerLink]="ROUTES.links.resources"
                  routerLinkActive="text-primary-600 bg-primary-50"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Recorded sessions</a
                >
                <a
                  [routerLink]="ROUTES.links.organization"
                  routerLinkActive="text-primary-600 bg-primary-50"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Organisation</a
                >
                <a
                  [routerLink]="ROUTES.links.feedback"
                  routerLinkActive="text-primary-600 bg-primary-50"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Share feedback</a
                >
                <a
                  [routerLink]="ROUTES.links.donate"
                  routerLinkActive="text-primary-600 bg-primary-50"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Support us</a
                >
                <a
                  [routerLink]="ROUTES.links.careers"
                  routerLinkActive="text-primary-600 bg-primary-50"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary-600"
                  role="menuitem"
                  >Careers</a
                >
              </div>
            </div>
            <!-- Authentication Section -->
            <div class="flex items-center space-x-2">
              <a
                [routerLink]="ROUTES.links.bookSupport"
                class="btn-outline btn-sm whitespace-nowrap"
                >{{ UX.cta.bookSupport }}</a
              >

              <!-- Authenticated User -->
              @if (user()) {
                <div class="relative group">
                  <button
                    class="flex items-center space-x-2 text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                  >
                    <div
                      class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center"
                    >
                      <span class="text-primary-600 font-medium text-sm">
                        {{ getUserInitials(user()!) }}
                      </span>
                    </div>
                    <span>{{ user()!.name || 'User' }}</span>
                    <svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <div
                    class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
                  >
                    <div class="py-1">
                      <a
                        [routerLink]="ROUTES.links.dashboard"
                        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                      >
                        My Consultations
                      </a>
                      <a
                        [routerLink]="ROUTES.links.profile"
                        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                      >
                        Profile Settings
                      </a>
                      <div class="border-t border-gray-100"></div>
                      <button
                        (click)="logout()"
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              }

              <!-- Unauthenticated User -->
              @if (!user()) {
                <div class="flex items-center space-x-2">
                  <button (click)="openRegister()" class="btn-primary btn-sm">Sign up</button>
                </div>
              }
            </div>
          </div>

          <!-- Navigation Loading Indicator -->
          @if (navigationState()?.isNavigating) {
            <div class="hidden md:flex items-center">
              <div
                class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"
                aria-label="Loading"
              ></div>
            </div>
          }

          <!-- Mobile menu button -->
          <div class="md:hidden">
            <button
              (click)="toggleMobileMenu()"
              class="mobile-menu-toggle text-gray-700 hover:text-primary-600 focus:outline-none focus:text-primary-600 focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 rounded-md p-1"
              [attr.aria-expanded]="mobileMenuOpen()"
              aria-label="Toggle mobile menu"
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                @if (!mobileMenuOpen()) {
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                } @else {
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                }
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile Navigation -->
        @if (mobileMenuOpen()) {
          <button
            type="button"
            class="mobile-nav-backdrop md:hidden"
            aria-label="Close mobile navigation"
            (click)="closeMobileMenu()"
          ></button>
          <div class="mobile-nav-panel md:hidden" role="menu" aria-label="Mobile navigation menu">
            <div class="flex flex-col space-y-2">
              <a
                [routerLink]="ROUTES.links.support"
                (click)="closeMobileMenu()"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                [attr.aria-current]="isCurrentRoute(ROUTES.paths.support) ? 'page' : null"
                role="menuitem"
              >
                Find support
              </a>
              <a
                [routerLink]="ROUTES.links.assessments"
                (click)="closeMobileMenu()"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                role="menuitem"
              >
                Assessments
              </a>
              <a
                [routerLink]="ROUTES.links.community"
                (click)="closeMobileMenu()"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                [attr.aria-current]="isCurrentRoute(ROUTES.paths.community) ? 'page' : null"
                role="menuitem"
              >
                Community
              </a>
              <a
                [routerLink]="ROUTES.links.telegram"
                (click)="closeMobileMenu()"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                [attr.aria-current]="isCurrentRoute(ROUTES.paths.telegram) ? 'page' : null"
                role="menuitem"
              >
                Telegram
              </a>
              <a
                [routerLink]="ROUTES.links.about"
                (click)="closeMobileMenu()"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                [attr.aria-current]="isCurrentRoute(ROUTES.paths.about) ? 'page' : null"
                role="menuitem"
              >
                About
              </a>
              <details class="mobile-nav-section border-t border-gray-200 pt-3 mt-2">
                <summary>Explore</summary>
                <div class="mobile-nav-section__links">
                  <a
                    [routerLink]="ROUTES.links.services"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Services
                  </a>
                  <a
                    [routerLink]="ROUTES.links.careTeam"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Care team
                  </a>
                  <a
                    [routerLink]="ROUTES.links.exercises"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Exercises
                  </a>
                  <a
                    [routerLink]="ROUTES.links.lifestyleTips"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Lifestyle tips
                  </a>
                  <a
                    [routerLink]="ROUTES.links.articles"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Articles
                  </a>
                  <a
                    [routerLink]="ROUTES.links.packages"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Packages
                  </a>
                  <a
                    [routerLink]="ROUTES.links.events"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Events
                  </a>
                  <a
                    [routerLink]="ROUTES.links.resources"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Recorded sessions
                  </a>
                  <a
                    [routerLink]="ROUTES.links.organization"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Organisation
                  </a>
                  <a
                    [routerLink]="ROUTES.links.feedback"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Share feedback
                  </a>
                  <a
                    [routerLink]="ROUTES.links.donate"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Support us
                  </a>
                  <a
                    [routerLink]="ROUTES.links.careers"
                    (click)="closeMobileMenu()"
                    routerLinkActive="text-primary-600 bg-primary-50"
                    class="block rounded-md px-3 py-2 text-base font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-50 hover:text-primary-600"
                    role="menuitem"
                  >
                    Careers
                  </a>
                </div>
              </details>

              <a
                [routerLink]="ROUTES.links.bookSupport"
                (click)="closeMobileMenu()"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="btn-outline btn-sm justify-start text-base"
                role="menuitem"
              >
                Book session
              </a>

              @if (user()) {
                <div class="border-t border-gray-200 mt-2 pt-2"></div>
                <a
                  [routerLink]="ROUTES.links.dashboard"
                  (click)="closeMobileMenu()"
                  routerLinkActive="text-primary-600 bg-primary-50"
                  class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-semibold transition-colors duration-200"
                  role="menuitem"
                >
                  My Consultations
                </a>
                <a
                  [routerLink]="ROUTES.links.profile"
                  (click)="closeMobileMenu()"
                  routerLinkActive="text-primary-600 bg-primary-50"
                  class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-semibold transition-colors duration-200"
                  role="menuitem"
                >
                  Profile Settings
                </a>
                <button
                  (click)="logout()"
                  class="text-left text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                  role="menuitem"
                >
                  Sign Out
                </button>
              } @else {
                <div class="border-t border-gray-200 mt-2 pt-2"></div>
                <button
                  (click)="openRegister()"
                  class="btn-primary btn-sm justify-start text-base"
                  role="menuitem"
                >
                  Sign up
                </button>
              }
            </div>

            <!-- Mobile Navigation Loading Indicator -->
            @if (navigationState()?.isNavigating) {
              <div class="flex items-center justify-center mt-4">
                <div
                  class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"
                  aria-label="Loading"
                ></div>
                <span class="ml-2 text-sm text-gray-600">Loading...</span>
              </div>
            }
          </div>
        }

        <!-- Navigation Error Display -->
        @if (navigationState()?.navigationError) {
          <div
            class="bg-red-50 border border-red-200 rounded-md p-3 mt-4"
            role="alert"
            aria-live="polite"
          >
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-red-800">{{ navigationState()?.navigationError }}</p>
                <button
                  (click)="clearNavigationError()"
                  class="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        }
      </nav>
    </header>
  `,
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  readonly APP_CONSTANTS = APP_CONSTANTS;
  readonly UX = CONSUMER_UX_COPY;
  readonly ROUTES = CONSUMER_ROUTES;
  mobileMenuOpen = signal(false);
  navigationState = signal<NavigationState | null>(null);
  user = signal<User | null>(null);

  private navigationService = inject(NavigationService);
  private authService = inject(AuthService);
  private authModalService = inject(AuthModalService);
  private notificationService = inject(NotificationService);
  private readonly overlay = inject(ViewportOverlayService);
  private readonly overlayOwner = 'mobile-navigation';

  constructor() {
    this.navigationService.navigationState$
      .pipe(takeUntilDestroyed())
      .subscribe((state: NavigationState) => {
        this.navigationState.set(state);

        // Close mobile menu when navigation completes
        if (!state.isNavigating && this.mobileMenuOpen()) {
          // Small delay to allow for smooth transition
          setTimeout(() => {
            this.closeMobileMenu();
          }, 100);
        }
      });

    // Subscribe to authentication state
    this.authService.user$.pipe(takeUntilDestroyed()).subscribe((user: User | null) => {
      this.user.set(user);
    });
  }

  ngOnInit(): void {
    // Component initialization if needed
  }

  ngOnDestroy(): void {
    this.overlay.release(this.overlayOwner);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((value: boolean) => !value);
    if (this.mobileMenuOpen()) this.overlay.acquire(this.overlayOwner);
    else this.overlay.release(this.overlayOwner);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
    this.overlay.release(this.overlayOwner);
  }

  isCurrentRoute(route: string): boolean {
    return this.navigationService.isCurrentRoute(route, route === '/');
  }

  clearNavigationError(): void {
    this.navigationService.clearNavigationError();
  }

  getUserInitials(user: User): string {
    if (user.name) {
      const names = user.name.split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return user.email?.[0].toUpperCase() || 'U';
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch (error) {
      this.notificationService.error('Could not sign you out. Please try again.');
      console.error('Logout error:', error);
    }
  }

  openLogin(): void {
    this.authModalService.openLogin();
    this.closeMobileMenu();
  }

  openRegister(): void {
    this.authModalService.openRegister();
    this.closeMobileMenu();
  }
}
