import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RoleTaskGuideComponent, NotificationBellHostComponent } from '@vitalis/platform-ui';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';
import { AdminAuth } from '../../core/services/admin-auth';
import { AdminNavTabsComponent } from '../admin-nav-tabs/admin-nav-tabs.component';
import { NAV_ITEMS, ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { navItemsForUser } from '../../core/admin-navigation';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RoleTaskGuideComponent, NotificationBellHostComponent, AdminNavTabsComponent],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss'
})
export class AdminShell {
  private readonly auth = inject(AdminAuth);
  private readonly router = inject(Router);

  readonly filteredNavItems = computed(() => navItemsForUser(NAV_ITEMS, this.auth.user()));
  readonly bellConfig = {
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications'
  };

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl(`/${ROUTE_PATHS.LOGIN}`);
  }
}
