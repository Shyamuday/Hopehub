import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { NotificationBellHostComponent, ProfileAvatarDisplayComponent } from '@hopehub/platform-ui';
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
import { navItemsForUser, navItemsForWorkspace } from '../../core/admin-navigation';
import {
  ADMIN_PERMISSIONS,
  staffHasAllPermissions,
  type AdminFocusedWorkspace,
} from '../../core/admin-permissions';
import { AdminWorkspaceService } from '../../core/services/admin-workspace.service';

const MOBILE_NAV_PRIORITIES = [
  [ROUTE_PATHS.DASHBOARD],
  [
    ROUTE_PATHS.CONSULTATIONS,
    ROUTE_PATHS.CHAT_INBOX,
    ROUTE_PATHS.COUNSELLOR_APPLICATIONS,
    ROUTE_PATHS.SAFETY_FLAGS,
    ROUTE_PATHS.SCAN,
  ],
  [ROUTE_PATHS.DOCTORS, ROUTE_PATHS.CONSUMERS, ROUTE_PATHS.HR],
] as const;

@Component({
  selector: 'app-admin-shell',
  imports: [
    RouterOutlet,
    RouterLink,
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
  readonly workspace = inject(AdminWorkspaceService);

  readonly menuOpen = signal(false);
  readonly workspaceOptions = this.workspace.workspaceOptions;
  readonly selectedWorkspace = this.workspace.selectedWorkspace;
  readonly selectedWorkspaceOption = this.workspace.selectedWorkspaceOption;
  readonly focusMode = computed(() => this.mobileLayout.pageFocus());
  readonly filteredNavItems = computed(() =>
    navItemsForWorkspace(
      navItemsForUser(NAV_ITEMS, this.auth.user()),
      this.selectedWorkspace(),
      this.auth.user(),
    ),
  );
  readonly accountPath = adminNavPath(ROUTE_PATHS.ACCOUNT);
  readonly apiBase = environment.apiUrl;
  readonly authTokenKey = AUTH_TOKEN_KEY;
  readonly bellConfig = computed(() => ({
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications',
    inboxPath: staffHasAllPermissions(this.auth.user(), ADMIN_PERMISSIONS.CONTACT_MAIL_WRITE)
      ? adminNavPath(ROUTE_PATHS.NOTIFICATIONS_INBOX)
      : undefined,
  }));

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

  readonly bottomNavItems = computed(() => this.buildMobileNav(this.filteredNavItems()));
  readonly hasOverflowNav = computed(() =>
    this.filteredNavItems().some(
      (item) => !this.bottomNavItems().some((bottomItem) => bottomItem.path === item.path),
    ),
  );

  constructor() {
    this.workspace.syncFromUrl(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.workspace.syncFromUrl(event.urlAfterRedirects);
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

  selectWorkspace(workspace: AdminFocusedWorkspace) {
    this.workspace.selectWorkspace(workspace);
  }

  selectWorkspaceFromEvent(event: Event) {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    if (value === 'homeopathy' || value === 'hope-hub') {
      this.selectWorkspace(value);
    }
  }

  navIcon(item: AdminNavItem) {
    const segment = this.pathSegment(item.path);
    if (segment === ROUTE_PATHS.DASHBOARD) return '⌂';
    if (MOBILE_NAV_PRIORITIES[1].includes(segment as never)) return '✓';
    if (MOBILE_NAV_PRIORITIES[2].includes(segment as never)) return '◎';
    return '•';
  }

  navShortLabel(item: AdminNavItem) {
    const segment = this.pathSegment(item.path);
    if (segment === ROUTE_PATHS.DASHBOARD) return 'Home';
    if (MOBILE_NAV_PRIORITIES[1].includes(segment as never)) return 'Work';
    if (MOBILE_NAV_PRIORITIES[2].includes(segment as never)) return 'People';
    return item.label
      .replace(/^\p{Extended_Pictographic}\s*/u, '')
      .trim()
      .split(/\s+/)[0];
  }

  private buildMobileNav(items: readonly AdminNavItem[]): AdminNavItem[] {
    return MOBILE_NAV_PRIORITIES.flatMap((segments) => {
      const match = segments
        .map((segment) => items.find((item) => this.pathSegment(item.path) === segment))
        .find((item): item is AdminNavItem => Boolean(item));
      return match ? [match] : [];
    });
  }

  private pathSegment(path: string): string {
    return path.split('/').filter(Boolean).pop() ?? '';
  }
}
