import { Component, computed, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { RoleTaskGuideComponent, NotificationBellHostComponent } from '@vitalis/platform-ui';
import { environment } from '../../environments/environment';
import { AUTH_TOKEN_KEY } from '../core/constants/auth.constants';
import { NAV_ITEMS } from '@vitalis/admin-console/core/constants/app-routes.constants';
import { AdminNavTabsComponent } from '@vitalis/admin-console/layout/admin-nav-tabs/admin-nav-tabs.component';
import { PlatformAuthService } from '../services/platform-auth.service';
import { ADMIN_ROUTE_CAPABILITIES } from './admin.guards';

@Component({
  selector: 'app-admin-embed-shell',
  standalone: true,
  imports: [RouterOutlet, RoleTaskGuideComponent, NotificationBellHostComponent, AdminNavTabsComponent],
  templateUrl: './admin-embed-shell.component.html',
  styleUrl: './admin-embed-shell.component.scss'
})
export class AdminEmbedShellComponent implements OnInit {
  private auth = inject(PlatformAuthService);
  private router = inject(Router);

  readonly bellConfig = computed(() => ({
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications'
  }));

  ngOnInit(): void {
    (globalThis as { __ADMIN_ROUTE_BASE__?: string }).__ADMIN_ROUTE_BASE__ = 'admin';
  }

  readonly filteredNavItems = computed(() => {
    const caps = new Set(this.auth.capabilities());
    return NAV_ITEMS.filter((item: { path: string; label: string }) => {
      const segment = item.path.split('/').filter(Boolean).pop() ?? '';
      const required = ADMIN_ROUTE_CAPABILITIES[segment];
      return !required || caps.has(required);
    });
  });

  logout() {
    this.auth.logout();
  }

  backToOps() {
    void this.router.navigate([`/${this.auth.defaultRoute()}`]);
  }
}
