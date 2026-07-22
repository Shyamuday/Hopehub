import { CommonModule, DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  effect,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
  Output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationBellHostComponent } from '@hopehub/platform-ui';
import { PUBLIC_SITE_BRAND } from './core/constants/public-site-content.constants';
import {
  PUBLIC_HEADER_NAV_GROUPS,
  PUBLIC_HEADER_QUICK_LINKS,
} from './core/constants/public-nav.constants';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { environment } from '../environments/environment';
import { AUTH_TOKEN_KEY } from './core/constants/auth.constants';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AuthService } from './auth/auth.service';
import { User } from './models';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, NotificationBellHostComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent implements OnDestroy {
  @Input() subtitle = 'Online care';
  @Input() user: User | null | undefined;
  @Input() whatsappLink = '';
  @Output() logout = new EventEmitter<void>();

  private readonly auth = inject(AuthService);
  readonly effectiveUser = computed(() => this.user ?? this.auth.user());

  readonly brand = PUBLIC_SITE_BRAND;
  readonly guestNavGroups = PUBLIC_HEADER_NAV_GROUPS;
  readonly desktopPrimaryNavLinks = PUBLIC_HEADER_QUICK_LINKS.filter((link) =>
    [
      'Services',
      'Treatments',
      'Talk to our expert now',
      'Our Experts',
      'Blog',
      'About us',
      'Contact',
    ].includes(link.label),
  );
  readonly desktopMoreNavLinks = PUBLIC_HEADER_QUICK_LINKS.filter(
    (link) => !this.desktopPrimaryNavLinks.some((primary) => primary.path === link.path),
  );
  readonly accountPaths = {
    hub: `/${ROUTE_PATHS.PATIENT_ACCOUNT}`,
    profile: `/${ROUTE_PATHS.PATIENT_ACCOUNT_PROFILE}`,
    addresses: `/${ROUTE_PATHS.PATIENT_ACCOUNT_ADDRESSES}`,
    refer: `/${ROUTE_PATHS.PATIENT_ACCOUNT_REFER}`,
    rewards: `/${ROUTE_PATHS.PATIENT_ACCOUNT_REWARDS}`,
    consultations: `/${ROUTE_PATHS.PATIENT_ACCOUNT_CONSULTATIONS}`,
    orders: `/${ROUTE_PATHS.PATIENT_ACCOUNT_ORDERS}`,
    labResults: `/${ROUTE_PATHS.PATIENT_ACCOUNT_LAB_RESULTS}`,
    card: `/${ROUTE_PATHS.PATIENT_ACCOUNT_CARD}`,
    permissions: `/${ROUTE_PATHS.PATIENT_ACCOUNT_PERMISSIONS}`,
    dashboard: `/${ROUTE_PATHS.PATIENT_DASHBOARD}`,
  };

  readonly menuOpen = signal(false);
  readonly accountMenuOpen = signal(false);
  readonly desktopMenuOpen = signal<string | null>(null);
  readonly bellConfig = {
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications',
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
    if (this.desktopMenuOpen()) {
      this.closeDesktopMenu();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.account-menu-wrap')) {
      this.closeAccountMenu();
    }
    if (!target?.closest('.desktop-nav-group')) {
      this.closeDesktopMenu();
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

  toggleDesktopMenu(groupId: string, event: Event): void {
    event.stopPropagation();
    this.desktopMenuOpen.update((open) => (open === groupId ? null : groupId));
    this.closeAccountMenu();
  }

  openDesktopMenu(groupId: string): void {
    this.desktopMenuOpen.set(groupId);
  }

  closeDesktopMenu(): void {
    this.desktopMenuOpen.set(null);
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
