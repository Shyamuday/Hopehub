import { CommonModule, DOCUMENT } from '@angular/common';
import {
  Component,
  effect,
  EventEmitter,
  HostListener,
  inject,
  Input,
  type OnDestroy,
  Output,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  type AuthenticatedHeaderNavItem,
  DEFAULT_GUEST_HEADER_NAV,
  DEFAULT_HEADER_BRAND,
  DEFAULT_USER_HEADER_NAV,
  type GuestHeaderNavItem
} from './app-header.nav-data';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { type User } from './interfaces';
import { LanguageSwitcherComponent } from './i18n/language-switcher.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, TranslatePipe, LanguageSwitcherComponent],
  template: `
    <header
      class="app-header"
      [class.app-header--guest]="!user"
      [class.menu-open]="menuOpen()">
      <a class="brand" [routerLink]="homePath" (click)="closeMenu()">
        <span class="brand-mark">{{ brandMark }}</span>
        <span>
          <strong>{{ brandTitle }}</strong>
          <small>{{ subtitle }}</small>
        </span>
      </a>

      @if (user) {
        <div class="user-chip">
          <app-language-switcher />
          @for (link of userNavEffective; track link.id) {
            <a
              [routerLink]="link.routerLink"
              [class]="link.linkClass || 'user-chip-nav'"
              >{{ link.labelKey | translate }}</a
            >
          }
          <span>{{ user.name }}</span>
          <strong>{{ user.role }}</strong>
          <button class="secondary" type="button" (click)="logout.emit()">{{ 'common.logout' | translate }}</button>
        </div>
      } @else {
        <button
          type="button"
          class="header-menu-toggle"
          (click)="toggleMenu()"
          [attr.aria-expanded]="menuOpen()"
          aria-controls="header-primary-nav"
          aria-label="Open or close menu">
          @if (menuOpen()) {
            <svg class="header-menu-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                d="M6 6l12 12M18 6L6 18" />
            </svg>
          } @else {
            <svg class="header-menu-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                d="M5 7h14M5 12h14M5 17h14" />
            </svg>
          }
        </button>

        <div
          class="header-nav-backdrop"
          role="presentation"
          tabindex="-1"
          (click)="closeMenu()"
          [attr.aria-hidden]="true"></div>

        <nav id="header-primary-nav" class="header-actions header-nav-sheet" aria-label="Primary navigation">
          <app-language-switcher />
          @for (item of guestNavEffective; track item.id) {
            @switch (item.type) {
              @case ('route') {
                <a [routerLink]="item.routerLink" (click)="closeMenu()" [class]="item.linkClass || ''">{{
                  item.labelKey | translate
                }}</a>
              }
              @case ('auth') {
                <a
                  href="/login"
                  [class]="item.linkClass || ''"
                  (click)="openAuthOverlay($event, item.authMode)"
                  >{{ item.labelKey | translate }}</a
                >
              }
              @case ('whatsapp') {
                <a
                  class="icon-link"
                  [href]="whatsappLink"
                  target="_blank"
                  rel="noopener"
                  [attr.aria-label]="item.ariaLabelKey | translate"
                  (click)="closeMenu()">
                  <svg class="wa-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M19.05 4.91A9.82 9.82 0 0 0 12.07 2C6.64 2 2.2 6.41 2.2 11.85c0 1.74.45 3.43 1.31 4.93L2 22l5.38-1.41a9.9 9.9 0 0 0 4.69 1.2h.01c5.43 0 9.87-4.41 9.87-9.85a9.75 9.75 0 0 0-2.9-7.03zm-6.98 15.2h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.19.84.85-3.12-.2-.32a8.1 8.1 0 0 1-1.24-4.33c0-4.48 3.68-8.12 8.21-8.12 2.19 0 4.24.85 5.8 2.4a8.04 8.04 0 0 1 2.4 5.73c0 4.48-3.69 8.12-8.15 8.12zm4.45-6.07c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.17a7.1 7.1 0 0 1-1.33-1.65c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.68 2.57 4.08 3.6.57.25 1.02.4 1.37.52.58.18 1.1.15 1.52.09.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" />
                  </svg>
                </a>
              }
            }
          }
        </nav>
      }
    </header>
  `
})
export class AppHeaderComponent implements OnDestroy {
  @Input() subtitle = 'Digital clinic';

  /** Overrides {@link DEFAULT_HEADER_BRAND.title} when set. */
  @Input() brandTitle = DEFAULT_HEADER_BRAND.title;

  /** Letter or short mark in the brand tile. */
  @Input() brandMark = DEFAULT_HEADER_BRAND.mark;

  /** Router path for the brand link (default home). */
  @Input() homePath = DEFAULT_HEADER_BRAND.homePath;

  @Input() user: User | null | undefined;
  @Input() whatsappLink = '';

  /**
   * When `undefined`, {@link DEFAULT_GUEST_HEADER_NAV} is used.
   * Pass a new array to customize visitor navigation (e.g. from CMS later).
   */
  @Input() guestNavItems: GuestHeaderNavItem[] | undefined;

  /**
   * When `undefined`, {@link DEFAULT_USER_HEADER_NAV} is used (role-filtered).
   * Pass a new array to add or replace signed-in chip links.
   */
  @Input() userNavItems: AuthenticatedHeaderNavItem[] | undefined;

  @Output() logout = new EventEmitter<void>();

  readonly menuOpen = signal(false);

  private readonly document = inject(DOCUMENT);

  constructor(private readonly overlayService: AppOverlayService) {
    effect(() => {
      const open = this.menuOpen();
      this.document.body.classList.toggle('header-menu-no-scroll', open);
      this.document.documentElement.classList.toggle('header-menu-no-scroll', open);
    });
  }

  get guestNavEffective(): GuestHeaderNavItem[] {
    return this.guestNavItems === undefined ? DEFAULT_GUEST_HEADER_NAV : this.guestNavItems;
  }

  get userNavEffective(): AuthenticatedHeaderNavItem[] {
    const items = this.userNavItems === undefined ? DEFAULT_USER_HEADER_NAV : this.userNavItems;
    const u = this.user;
    if (!u) {
      return [];
    }
    return items.filter((link) => !link.roles?.length || link.roles.includes(u.role));
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('header-menu-no-scroll');
    this.document.documentElement.classList.remove('header-menu-no-scroll');
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this.menuOpen()) {
      this.closeMenu();
    }
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  openAuthOverlay(event: Event, mode: 'patient' | 'staff' = 'patient') {
    event.preventDefault();
    this.closeMenu();
    this.overlayService.open(AuthFormOverlayComponent, {
      data: { mode },
      width: '480px',
      panelClass: 'app-overlay-panel'
    });
  }
}
