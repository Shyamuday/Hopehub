import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, effect, EventEmitter, HostListener, inject, Input, OnDestroy, Output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationBellHostComponent } from '@vitalis/platform-ui';
import { PUBLIC_SITE_BRAND } from './core/constants/public-site-content.constants';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { environment } from '../environments/environment';
import { AUTH_TOKEN_KEY } from './core/constants/auth.constants';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { User } from './models';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, NotificationBellHostComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent implements OnDestroy {
  @Input() subtitle = 'Digital clinic';
  @Input() user: User | null | undefined;
  @Input() whatsappLink = '';
  @Output() logout = new EventEmitter<void>();

  readonly brand = PUBLIC_SITE_BRAND;
  readonly accountPaths = {
    hub: `/${ROUTE_PATHS.PATIENT_ACCOUNT}`,
    profile: `/${ROUTE_PATHS.PATIENT_ACCOUNT_PROFILE}`,
    addresses: `/${ROUTE_PATHS.PATIENT_ACCOUNT_ADDRESSES}`,
    dashboard: `/${ROUTE_PATHS.PATIENT_DASHBOARD}`,
  };

  readonly menuOpen = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly bellConfig = {
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications'
  };

  private readonly document = inject(DOCUMENT);

  constructor(private readonly overlayService: AppOverlayService) {
    effect(() => {
      const open = this.menuOpen();
      this.document.body.classList.toggle('header-menu-no-scroll', open);
      this.document.documentElement.classList.toggle('header-menu-no-scroll', open);
    });
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
    if (this.accountMenuOpen()) {
      this.closeAccountMenu();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.account-menu-wrap')) {
      this.closeAccountMenu();
    }
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    this.closeAccountMenu();
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleAccountMenu(event: Event): void {
    event.stopPropagation();
    this.accountMenuOpen.update((open) => !open);
  }

  closeAccountMenu(): void {
    this.accountMenuOpen.set(false);
  }

  openAuthOverlay(event: Event) {
    event.preventDefault();
    this.closeMenu();
    this.overlayService.open(AuthFormOverlayComponent, {
      width: '480px',
      panelClass: 'app-overlay-panel',
    });
  }
}
