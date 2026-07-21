import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { RoleTaskGuideComponent, NotificationBellHostComponent } from '@hopehub/platform-ui';
import { environment } from '../../environments/environment';
import { AUTH_TOKEN_KEY } from '../core/constants/auth.constants';
import {
  NAV_ITEMS,
  ROUTE_PATHS,
  adminNavPath
} from '@hopehub/admin-console/core/constants/app-routes.constants';
import { AdminNavTabsComponent } from '@hopehub/admin-console/layout/admin-nav-tabs/admin-nav-tabs.component';
import { AdminAuth } from '@hopehub/admin-console/core/services/admin-auth';
import { PlatformAuthService } from '../services/platform-auth.service';
import { OperationsMobileLayoutService } from '../services/operations-mobile-layout.service';
import { AdminMobileLayoutService } from '@hopehub/admin-console/core/services/admin-mobile-layout.service';
import { ADMIN_ROUTE_CAPABILITIES } from './admin.guards';

@Component({
  selector: 'app-admin-embed-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RoleTaskGuideComponent,
    NotificationBellHostComponent,
    AdminNavTabsComponent
  ],
  templateUrl: './admin-embed-shell.component.html',
  styleUrl: './admin-embed-shell.component.scss'
})
export class AdminEmbedShellComponent implements OnInit, OnDestroy {
  private auth = inject(PlatformAuthService);
  private adminAuth = inject(AdminAuth);
  private router = inject(Router);
  private readonly mobileLayout = inject(OperationsMobileLayoutService);
  private readonly adminMobileLayout = inject(AdminMobileLayoutService);

  readonly menuOpen = signal(false);
  readonly focusMode = computed(
    () => this.mobileLayout.pageFocus() || this.adminMobileLayout.pageFocus()
  );

  private navSubscription?: { unsubscribe: () => void };

  readonly bellConfig = computed(() => ({
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications',
    inboxPath: adminNavPath(ROUTE_PATHS.NOTIFICATIONS_INBOX)
  }));

  readonly accountPath = adminNavPath(ROUTE_PATHS.ACCOUNT);

  ngOnInit(): void {
    (globalThis as { __ADMIN_ROUTE_BASE__?: string }).__ADMIN_ROUTE_BASE__ = 'admin';
    void this.adminAuth.refreshSession();

    this.navSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeMenu();
        this.mobileLayout.clearPageFocus();
        this.adminMobileLayout.clearPageFocus();
      });
  }

  ngOnDestroy(): void {
    this.navSubscription?.unsubscribe();
    this.mobileLayout.clearPageFocus();
    this.adminMobileLayout.clearPageFocus();
  }

  readonly filteredNavItems = computed(() => {
    const caps = new Set(this.auth.capabilities());
    return NAV_ITEMS.filter((item: { path: string; label: string }) => {
      const segment = item.path.split('/').filter(Boolean).pop() ?? '';
      const required = ADMIN_ROUTE_CAPABILITIES[segment];
      return !required || caps.has(required);
    });
  });

  openMenu() {
    this.menuOpen.set(true);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  logout() {
    this.auth.logout();
  }

  backToOps() {
    void this.router.navigate([`/${this.auth.defaultRoute()}`]);
  }
}
