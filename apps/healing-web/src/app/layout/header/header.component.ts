import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationService, NavigationState } from '../../core/services/navigation.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { User } from '../../core/models/auth.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterModule],
  template: `
    <header class="bg-white shadow-sm border-b border-gray-200">
      <nav
        class="container mx-auto px-4 sm:px-6 lg:px-8"
        role="navigation"
        aria-label="Main navigation"
      >
        <div class="flex justify-between items-center h-16">
          <!-- Logo and Brand -->
          <div class="flex items-center">
            <a
              routerLink="/"
              class="flex items-center space-x-2"
              (click)="closeMobileMenu()"
              aria-label="Healing Hub - Go to homepage"
            >
              <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span class="text-white font-bold text-sm">HH</span>
              </div>
              <span class="text-xl font-bold text-gray-900">Healing Hub</span>
            </a>
          </div>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center space-x-8">
            <a
              routerLink="/"
              routerLinkActive="text-primary-600 border-b-2 border-primary-600"
              [routerLinkActiveOptions]="{ exact: true }"
              class="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
              [attr.aria-current]="isCurrentRoute('/') ? 'page' : null"
            >
              Home
            </a>
            <a
              routerLink="/services"
              routerLinkActive="text-primary-600 border-b-2 border-primary-600"
              class="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
              [attr.aria-current]="isCurrentRoute('/services') ? 'page' : null"
            >
              Services
            </a>

            <!-- Mental Health Tools Dropdown -->
            <div class="relative group">
              <button
                class="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200 flex items-center"
              >
                Mental Health Tools
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
                class="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
              >
                <div class="py-1">
                  <a
                    routerLink="/assessments"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                  >
                    Mental Health Assessments
                  </a>
                  <a
                    routerLink="/exercises"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                  >
                    Wellness Exercises
                  </a>
                  <a
                    routerLink="/lifestyle-tips"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                  >
                    Lifestyle Tips
                  </a>
                  <a
                    routerLink="/articles"
                    class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                  >
                    Educational Articles
                  </a>
                </div>
              </div>
            </div>

            <a
              routerLink="/community"
              routerLinkActive="text-primary-600 border-b-2 border-primary-600"
              class="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
              [attr.aria-current]="isCurrentRoute('/community') ? 'page' : null"
            >
              Community
            </a>
            <a
              routerLink="/contact"
              routerLinkActive="text-primary-600 border-b-2 border-primary-600"
              class="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
              [attr.aria-current]="isCurrentRoute('/contact') ? 'page' : null"
            >
              Contact
            </a>
            <a
              routerLink="/donate"
              routerLinkActive="bg-green-600"
              class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 inline-flex items-center gap-1"
            >
              💚 Support Us
            </a>

            <!-- Authentication Section -->
            <div class="flex items-center space-x-4">
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
                        routerLink="/dashboard"
                        class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600"
                      >
                        Dashboard
                      </a>
                      <a
                        routerLink="/profile"
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
                  <button
                    (click)="openLogin()"
                    class="text-gray-700 hover:text-primary-600 px-3 py-2 text-sm font-medium transition-colors duration-200"
                  >
                    Sign In
                  </button>
                  <button
                    (click)="openRegister()"
                    class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  >
                    Get Started
                  </button>
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
              class="text-gray-700 hover:text-primary-600 focus:outline-none focus:text-primary-600 focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 rounded-md p-1"
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
          <div
            class="md:hidden border-t border-gray-200 pt-4 pb-4"
            role="menu"
            aria-label="Mobile navigation menu"
          >
            <div class="flex flex-col space-y-2">
              <a
                routerLink="/"
                (click)="navigateAndClose('/')"
                routerLinkActive="text-primary-600 bg-primary-50"
                [routerLinkActiveOptions]="{ exact: true }"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                [attr.aria-current]="isCurrentRoute('/') ? 'page' : null"
                role="menuitem"
              >
                Home
              </a>
              <a
                routerLink="/services"
                (click)="navigateAndClose('/services')"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                [attr.aria-current]="isCurrentRoute('/services') ? 'page' : null"
                role="menuitem"
              >
                Services
              </a>

              <!-- Mental Health Tools Section -->
              <div class="px-3 py-2">
                <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Mental Health Tools
                </div>
              </div>
              <a
                routerLink="/assessments"
                (click)="navigateAndClose('/assessments')"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-6 py-2 rounded-md text-base font-medium transition-colors duration-200"
                role="menuitem"
              >
                Mental Health Assessments
              </a>
              <a
                routerLink="/exercises"
                (click)="navigateAndClose('/exercises')"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-6 py-2 rounded-md text-base font-medium transition-colors duration-200"
                role="menuitem"
              >
                Wellness Exercises
              </a>
              <a
                routerLink="/lifestyle-tips"
                (click)="navigateAndClose('/lifestyle-tips')"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-6 py-2 rounded-md text-base font-medium transition-colors duration-200"
                role="menuitem"
              >
                Lifestyle Tips
              </a>
              <a
                routerLink="/articles"
                (click)="navigateAndClose('/articles')"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-6 py-2 rounded-md text-base font-medium transition-colors duration-200"
                role="menuitem"
              >
                Educational Articles
              </a>

              <a
                routerLink="/community"
                (click)="navigateAndClose('/community')"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                [attr.aria-current]="isCurrentRoute('/community') ? 'page' : null"
                role="menuitem"
              >
                Community
              </a>
              <a
                routerLink="/contact"
                (click)="navigateAndClose('/contact')"
                routerLinkActive="text-primary-600 bg-primary-50"
                class="text-gray-700 hover:text-primary-600 hover:bg-gray-50 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
                [attr.aria-current]="isCurrentRoute('/contact') ? 'page' : null"
                role="menuitem"
              >
                Contact
              </a>
              <a
                routerLink="/donate"
                (click)="navigateAndClose('/donate')"
                class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-base font-semibold transition-colors duration-200 inline-flex items-center gap-1 mt-1"
                role="menuitem"
              >
                💚 Support Us
              </a>
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
  styles: [],
})
export class HeaderComponent implements OnInit {
  mobileMenuOpen = signal(false);
  navigationState = signal<NavigationState | null>(null);
  user = signal<User | null>(null);

  private navigationService = inject(NavigationService);
  private authService = inject(AuthService);
  private authModalService = inject(AuthModalService);

  constructor() {
    this.navigationService.navigationState$
      .pipe(takeUntilDestroyed())
      .subscribe((state: NavigationState) => {
        this.navigationState.set(state);

        // Close mobile menu when navigation completes
        if (!state.isNavigating && this.mobileMenuOpen()) {
          // Small delay to allow for smooth transition
          setTimeout(() => {
            this.mobileMenuOpen.set(false);
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

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((value: boolean) => !value);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  navigateAndClose(route: string): void {
    this.navigationService.navigateTo(route);
    this.closeMobileMenu();
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
