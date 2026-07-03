import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NAV_ITEMS } from '../../../../admin-web/src/app/core/constants/app-routes.constants';
import { RoleTaskGuideComponent } from '../shared/role-task-guide/role-task-guide.component';
import { NotificationBellHost } from '../shared/notification-bell-host/notification-bell-host';
import { PlatformAuthService } from '../services/platform-auth.service';
import { ADMIN_ROUTE_CAPABILITIES } from './admin.guards';

@Component({
  selector: 'app-admin-embed-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, RoleTaskGuideComponent, NotificationBellHost],
  templateUrl: './admin-embed-shell.component.html',
  styleUrl: './admin-embed-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class AdminEmbedShellComponent implements OnInit {
  private auth = inject(PlatformAuthService);
  private router = inject(Router);

  ngOnInit(): void {
    (globalThis as { __ADMIN_ROUTE_BASE__?: string }).__ADMIN_ROUTE_BASE__ = 'admin';
  }

  navItems() {
    const caps = new Set(this.auth.capabilities());
    return NAV_ITEMS.filter((item: { path: string; label: string }) => {
      const segment = item.path.split('/').filter(Boolean).pop() ?? '';
      const required = ADMIN_ROUTE_CAPABILITIES[segment];
      return !required || caps.has(required);
    });
  }

  logout() {
    this.auth.logout();
  }

  backToOps() {
    void this.router.navigate([`/${this.auth.defaultRoute()}`]);
  }
}
