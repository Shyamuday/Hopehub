import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RoleTaskGuideComponent } from '../../shared/role-task-guide/role-task-guide.component';
import { NotificationBellHost } from '../../shared/notification-bell-host/notification-bell-host';
import { AdminAuth } from '../../core/services/admin-auth';
import { NAV_ITEMS, ROUTE_PATHS } from '../../core/constants/app-routes.constants';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, RoleTaskGuideComponent, NotificationBellHost],
  templateUrl: './admin-shell.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './admin-shell.scss'
})
export class AdminShell {
  readonly navItems = NAV_ITEMS;
  constructor(
    private readonly auth: AdminAuth,
    private readonly router: Router
  ) {}

  logout() {
    this.auth.logout();
    void this.router.navigateByUrl(`/${ROUTE_PATHS.LOGIN}`);
  }
}
