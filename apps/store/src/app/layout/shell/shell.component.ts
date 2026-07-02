import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NAV_ITEMS, ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { StoreAuthService } from '../../services/store-auth.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <!-- Desktop sidebar -->
      <nav class="sidebar">
        <div class="sidebar-brand">
          <span class="brand-icon-sm">🌿</span>
          <div>
            <div class="brand-name">Vitalis Store</div>
            <div class="brand-role">{{ auth.staff()?.name }}</div>
          </div>
        </div>

        <div class="sidebar-links">
          @for (item of sidebarNavItems(); track item.path) {
            <a class="sidebar-link" [routerLink]="item.path" routerLinkActive="active">
              <span class="link-icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </div>

        <button class="sidebar-logout" (click)="logout()">
          <span>🚪</span> Logout
        </button>
      </nav>

      <!-- Main content area -->
      <main class="main-content">
        <router-outlet />
      </main>

      <!-- Mobile bottom nav -->
      <nav class="bottom-nav">
        <a class="nav-item" [routerLink]="['/', routePaths.SEARCH]" routerLinkActive="nav-active">
          <span class="nav-icon">🔍</span>
          <span class="nav-label">Search</span>
        </a>
        <a class="nav-item" [routerLink]="['/', routePaths.DASHBOARD]" routerLinkActive="nav-active">
          <span class="nav-icon">🏠</span>
          <span class="nav-label">Home</span>
        </a>
        <a class="nav-item nav-add" [routerLink]="['/', routePaths.STOCK_IN]" routerLinkActive="nav-active">
          <span class="nav-icon-plus">＋</span>
        </a>
        <a class="nav-item" [routerLink]="['/', routePaths.ALERTS]" routerLinkActive="nav-active">
          <span class="nav-icon">🔔</span>
          <span class="nav-label">Alerts</span>
        </a>
        <button class="nav-item" (click)="toggleMore()">
          <span class="nav-icon">☰</span>
          <span class="nav-label">More</span>
        </button>
      </nav>

      <!-- More menu drawer -->
      @if (showMore()) {
        <div class="more-overlay" (click)="showMore.set(false)">
          <div class="more-menu" (click)="$event.stopPropagation()">
            <div class="more-header">
              <div class="more-user">
                <div class="more-avatar">{{ firstLetter() }}</div>
                <div>
                  <div class="more-name">{{ auth.staff()?.name }}</div>
                  <div class="more-role">{{ auth.staff()?.role }}</div>
                </div>
              </div>
              <button class="btn-icon" (click)="showMore.set(false)">✕</button>
            </div>
            <div class="divider"></div>
            <nav class="more-links">
              <a class="more-link" [routerLink]="['/', routePaths.RACK_MAP]" (click)="showMore.set(false)">
                <span>🗺️</span> Rack Map
              </a>
              <a class="more-link" [routerLink]="['/', routePaths.STOCK_OUT]" (click)="showMore.set(false)">
                <span>📤</span> Stock Out
              </a>
              @if (auth.isManager()) {
                <a class="more-link" [routerLink]="['/', routePaths.MEDICINES]" (click)="showMore.set(false)">
                  <span>💊</span> Medicines Admin
                </a>
              }
              <a class="more-link" [routerLink]="['/', routePaths.MOVEMENTS]" (click)="showMore.set(false)">
                <span>📋</span> Movement History
              </a>
              @if (auth.isManager()) {
                <a class="more-link" [routerLink]="['/', routePaths.STAFF_ACTIVITY]" (click)="showMore.set(false)">
                  <span>👥</span> Staff Activity
                </a>
                <a class="more-link" [routerLink]="['/', routePaths.STAFF_HR]" (click)="showMore.set(false)">
                  <span>🪪</span> HR Records
                </a>
              }
            </nav>
            <div class="divider"></div>
            <button class="more-logout" (click)="logout()">
              <span>🚪</span> Logout
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  auth = inject(StoreAuthService);
  private router = inject(Router);

  readonly routePaths = ROUTE_PATHS;
  private readonly managerOnlyPaths = new Set([
    `/${ROUTE_PATHS.MEDICINES}`,
    `/${ROUTE_PATHS.STAFF_ACTIVITY}`,
    `/${ROUTE_PATHS.STAFF_HR}`
  ]);

  showMore = signal(false);

  sidebarNavItems(): typeof NAV_ITEMS[number][] {
    return NAV_ITEMS.filter(item =>
      !this.managerOnlyPaths.has(item.path) || this.auth.isManager()
    );
  }

  firstLetter(): string {
    return this.auth.staff()?.name?.charAt(0)?.toUpperCase() ?? 'S';
  }

  toggleMore(): void {
    this.showMore.update(v => !v);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/', ROUTE_PATHS.LOGIN]);
  }
}
