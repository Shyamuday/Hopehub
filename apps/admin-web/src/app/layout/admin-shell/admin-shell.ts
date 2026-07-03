import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RoleTaskGuideComponent, NotificationBellHostComponent } from '@vitalis/platform-ui';
import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY } from '../../core/constants/auth.constants';
import { AdminAuth } from '../../core/services/admin-auth';
import { NAV_ITEMS, ROUTE_PATHS } from '../../core/constants/app-routes.constants';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, RoleTaskGuideComponent, NotificationBellHostComponent],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss'
})
export class AdminShell {
  readonly navItems = NAV_ITEMS;
  readonly bellConfig = {
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications'
  };
  constructor(
    private readonly auth: AdminAuth,
    private readonly router: Router
  ) {}

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl(`/${ROUTE_PATHS.LOGIN}`);
  }
}
