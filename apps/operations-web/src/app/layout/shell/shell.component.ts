import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import {
  RoleTaskGuideComponent,
  NotificationBellHostComponent,
  ProfileAvatarDisplayComponent
} from '@vitalis/platform-ui';
import type { PlatformNavItem } from '@vitalis/platform-nav';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { PlatformAuthService } from '../../services/platform-auth.service';
import { OperationsMobileLayoutService } from '../../services/operations-mobile-layout.service';
import { OperationsNavTabsComponent } from '../operations-nav-tabs/operations-nav-tabs.component';

const MOBILE_BOTTOM_NAV_LIMIT = 4;

const NAV_SHORT_LABELS: Record<string, string> = {
  'Walk-in': 'Walk-in',
  Queue: 'Queue',
  'Visitor leads': 'Leads',
  'Website leads': 'Leads',
  'Scan patient': 'Scan',
  'Store counter': 'Store',
  Dispense: 'Rx',
  'HR dashboard': 'Home',
  'Patient search': 'Search',
  Consultations: 'Appts',
  'Clinic hub': 'Clinic',
  'Admin console': 'Admin',
  'Store manager': 'Mgr',
  'WH transfers': 'Xfer',
  'Store transfers': 'Xfer'
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    RoleTaskGuideComponent,
    NotificationBellHostComponent,
    ProfileAvatarDisplayComponent,
    OperationsNavTabsComponent
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent implements OnInit, OnDestroy {
  auth = inject(PlatformAuthService);
  private readonly router = inject(Router);
  private readonly mobileLayout = inject(OperationsMobileLayoutService);

  menuOpen = signal(false);
  readonly accountPath = `/${ROUTE_PATHS.ACCOUNT}`;
  readonly authTokenKey = AUTH_TOKEN_KEY;
  readonly apiBase = environment.apiUrl;

  private navSubscription?: { unsubscribe: () => void };

  readonly bellConfig = computed(() => ({
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: this.auth.isStoreSession() ? '/store/notifications' : '/notifications',
    inboxPath: `/${ROUTE_PATHS.NOTIFICATIONS_INBOX}`
  }));

  readonly navItemsList = computed(() => this.auth.navItems());

  readonly bottomNavItems = computed(() => this.splitMobileNav(this.navItemsList()).bottom);
  readonly hasOverflowNav = computed(() => this.splitMobileNav(this.navItemsList()).overflow > 0);

  readonly currentPath = signal(this.router.url.split('?')[0]);

  readonly currentPageLabel = computed(() => {
    const path = this.currentPath();
    const item = this.navItemsList().find(
      (entry) => path === entry.path || path.startsWith(`${entry.path}/`)
    );
    return item?.label ?? 'Operations';
  });

  readonly routeFocus = computed(() => {
    const path = this.currentPath();
    return (
      /\/(store|store-manager)\/medicines\/[^/]+/.test(path) ||
      /\/scan\/patient\//.test(path) ||
      (path.includes('/walk-in') && path !== `/${ROUTE_PATHS.WALK_IN}`)
    );
  });

  readonly focusMode = computed(() => this.mobileLayout.pageFocus() || this.routeFocus());

  ngOnInit(): void {
    if (this.auth.isLoggedIn() && !this.auth.capabilities().length) {
      this.auth.fetchMe().subscribe();
    }

    this.navSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentPath.set(event.urlAfterRedirects.split('?')[0]);
        this.closeMenu();
        this.mobileLayout.clearPageFocus();
      });
  }

  ngOnDestroy(): void {
    this.navSubscription?.unsubscribe();
  }

  userInitial() {
    const name = this.auth.currentUser()?.name ?? 'U';
    return name.charAt(0).toUpperCase();
  }

  profileImageUrl(): string | null {
    const staff = this.auth.storeStaff();
    if (staff?.profileImageUrl) return staff.profileImageUrl;
    return this.auth.currentUser()?.profileImageUrl ?? null;
  }

  displayName(): string {
    return this.auth.storeStaff()?.name ?? this.auth.currentUser()?.name ?? 'User';
  }

  pageTitle() {
    return this.currentPageLabel();
  }

  roleLabel() {
    return (this.auth.currentUser()?.role ?? 'Staff').replace(/_/g, ' ');
  }

  guideVariant(): string | null {
    const caps = this.auth.capabilities();
    if (caps.includes('store_manager.portal')) return 'store-manager';
    if (caps.includes('store_counter.portal')) return 'store-counter';
    if (
      caps.some((c) =>
        [
          'supplier.portal',
          'delivery.ops',
          'diagnostic.portal',
          'corporate_wellness.portal',
          'insurance.portal'
        ].includes(c)
      )
    ) {
      return 'partner';
    }
    return null;
  }

  openMenu() {
    this.menuOpen.set(true);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  navShortLabel(item: PlatformNavItem) {
    return NAV_SHORT_LABELS[item.label] || item.label.split(/\s+/)[0].slice(0, 8);
  }

  private splitMobileNav(items: PlatformNavItem[]) {
    const bottom = items.slice(0, MOBILE_BOTTOM_NAV_LIMIT);
    return { bottom, overflow: Math.max(0, items.length - bottom.length) };
  }
}
