import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import {
  RoleTaskGuideComponent,
  NotificationBellHostComponent,
  ProfileAvatarDisplayComponent,
} from '@hopehub/platform-ui';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';
import { AdminAuth } from '../../core/services/admin-auth';
import { AdminMobileLayoutService } from '../../core/services/admin-mobile-layout.service';
import { AdminNavTabsComponent } from '../admin-nav-tabs/admin-nav-tabs.component';
import {
  NAV_ITEMS,
  ROUTE_PATHS,
  adminNavPath,
  type AdminNavItem,
} from '../../core/constants/app-routes.constants';
import { navItemsForUser } from '../../core/admin-navigation';

const MOBILE_BOTTOM_NAV_LIMIT = 4;

const NAV_SHORT_LABELS: Record<string, string> = {
  Dashboard: 'Home',
  Providers: 'Providers',
  Consumers: 'Users',
  'Scan patient': 'Scan',
  Consultations: 'Appts',
  Diseases: 'Disease',
  'Clinical Records': 'Records',
};

@Component({
  selector: 'app-admin-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RoleTaskGuideComponent,
    NotificationBellHostComponent,
    AdminNavTabsComponent,
    ProfileAvatarDisplayComponent,
  ],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  readonly auth = inject(AdminAuth);
  private readonly router = inject(Router);
  private readonly mobileLayout = inject(AdminMobileLayoutService);

  readonly menuOpen = signal(false);
  readonly focusMode = computed(() => this.mobileLayout.pageFocus());
  readonly filteredNavItems = computed(() => navItemsForUser(NAV_ITEMS, this.auth.user()));
  readonly accountPath = adminNavPath(ROUTE_PATHS.ACCOUNT);
  readonly apiBase = environment.apiUrl;
  readonly authTokenKey = AUTH_TOKEN_KEY;
  readonly bellConfig = {
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications',
    inboxPath: adminNavPath(ROUTE_PATHS.NOTIFICATIONS_INBOX),
  };

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects.split('?')[0]),
      startWith(this.router.url.split('?')[0]),
    ),
    { initialValue: this.router.url.split('?')[0] },
  );

  readonly currentPageLabel = computed(() => {
    const path = this.currentPath();
    const item = this.filteredNavItems().find(
      (entry) => path === entry.path || path.startsWith(`${entry.path}/`),
    );
    return item?.label ?? '';
  });

  readonly bottomNavItems = computed(() => this.splitMobileNav(this.filteredNavItems()).bottom);
  readonly hasOverflowNav = computed(
    () => this.splitMobileNav(this.filteredNavItems()).overflow > 0,
  );

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeMenu();
        this.mobileLayout.clearPageFocus();
      });
  }

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl(`/${ROUTE_PATHS.LOGIN}`);
  }

  openMenu() {
    this.menuOpen.set(true);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  navIcon(item: AdminNavItem) {
    const emoji = item.label.match(/^\p{Extended_Pictographic}/u);
    return emoji ? emoji[0] : '•';
  }

  navShortLabel(item: AdminNavItem) {
    const plain = item.label.replace(/^\p{Extended_Pictographic}\s*/u, '').trim();
    return (
      NAV_SHORT_LABELS[plain] || NAV_SHORT_LABELS[item.label] || plain.split(/\s+/)[0].slice(0, 6)
    );
  }

  private splitMobileNav(items: readonly AdminNavItem[]) {
    const bottom = items.slice(0, MOBILE_BOTTOM_NAV_LIMIT);
    return { bottom, overflow: Math.max(0, items.length - bottom.length) };
  }
}
