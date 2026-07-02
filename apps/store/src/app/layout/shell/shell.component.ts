import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
          <a class="sidebar-link" routerLink="/dashboard" routerLinkActive="active">
            <span class="link-icon">🏠</span>
            <span>Dashboard</span>
          </a>
          <a class="sidebar-link" routerLink="/search" routerLinkActive="active">
            <span class="link-icon">🔍</span>
            <span>Search</span>
          </a>
          <a class="sidebar-link" routerLink="/stock-in" routerLinkActive="active">
            <span class="link-icon">📦</span>
            <span>Stock In</span>
          </a>
          <a class="sidebar-link" routerLink="/stock-out" routerLinkActive="active">
            <span class="link-icon">📤</span>
            <span>Stock Out</span>
          </a>
          <a class="sidebar-link" routerLink="/alerts" routerLinkActive="active">
            <span class="link-icon">🔔</span>
            <span>Alerts</span>
          </a>
          <a class="sidebar-link" routerLink="/rack-map" routerLinkActive="active">
            <span class="link-icon">🗺️</span>
            <span>Rack Map</span>
          </a>
          @if (auth.isManager()) {
            <a class="sidebar-link" routerLink="/medicines" routerLinkActive="active">
              <span class="link-icon">💊</span>
              <span>Medicines</span>
            </a>
            <a class="sidebar-link" routerLink="/staff-activity" routerLinkActive="active">
              <span class="link-icon">👥</span>
              <span>Staff Activity</span>
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
        <a class="nav-item" routerLink="/search" routerLinkActive="nav-active">
          <span class="nav-icon">🔍</span>
          <span class="nav-label">Search</span>
        </a>
        <a class="nav-item" routerLink="/dashboard" routerLinkActive="nav-active">
          <span class="nav-icon">🏠</span>
          <span class="nav-label">Home</span>
        </a>
        <a class="nav-item nav-add" routerLink="/stock-in" routerLinkActive="nav-active">
          <span class="nav-icon-plus">＋</span>
        </a>
        <a class="nav-item" routerLink="/alerts" routerLinkActive="nav-active">
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
              <a class="more-link" routerLink="/rack-map" (click)="showMore.set(false)">
                <span>🗺️</span> Rack Map
              </a>
              <a class="more-link" routerLink="/stock-out" (click)="showMore.set(false)">
                <span>📤</span> Stock Out
              </a>
              @if (auth.isManager()) {
                <a class="more-link" routerLink="/medicines" (click)="showMore.set(false)">
                  <span>💊</span> Medicines Admin
                </a>
              }
              <a class="more-link" routerLink="/movements" (click)="showMore.set(false)">
                <span>📋</span> Movement History
              </a>
              @if (auth.isManager()) {
                <a class="more-link" routerLink="/staff-activity" (click)="showMore.set(false)">
                  <span>👥</span> Staff Activity
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
  styles: [`
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
    }

    /* ===== SIDEBAR (desktop) ===== */
    .sidebar {
      width: 220px;
      background: linear-gradient(180deg, #0a1628 0%, #091428 100%);
      border-right: 1px solid rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      padding: 20px 12px;
      flex-shrink: 0;

      @media (max-width: 767px) { display: none; }
    }

    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      margin-bottom: 16px;
    }

    .brand-icon-sm { font-size: 28px; }

    .brand-name {
      font-size: 15px;
      font-weight: 800;
      color: white;
    }

    .brand-role {
      font-size: 12px;
      color: #64748b;
    }

    .sidebar-links {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .sidebar-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 12px;
      border-radius: 10px;
      color: #64748b;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;

      .link-icon { font-size: 18px; }

      &:hover { background: rgba(255,255,255,0.06); color: #94a3b8; }
      &.active { background: rgba(8,145,178,0.15); color: #06b6d4; }
    }

    .sidebar-logout {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 11px 12px;
      border-radius: 10px;
      background: none;
      border: 1px solid rgba(239,68,68,0.2);
      color: #f87171;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      width: 100%;

      &:hover { background: rgba(239,68,68,0.08); }
    }

    /* ===== MAIN CONTENT ===== */
    .main-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      min-width: 0;
      background: #0a1628;

      @media (max-width: 767px) {
        padding-bottom: var(--bottom-nav-height);
      }
    }

    /* ===== BOTTOM NAV (mobile) ===== */
    .bottom-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: var(--bottom-nav-height);
      background: rgba(9,18,36,0.98);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-top: 1px solid rgba(255,255,255,0.08);
      flex-direction: row;
      align-items: center;
      z-index: 100;
      padding: 0 4px;

      @media (max-width: 767px) { display: flex; }
    }

    .nav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 8px 4px;
      color: #475569;
      text-decoration: none;
      border: none;
      background: none;
      cursor: pointer;
      transition: all 0.2s;
      border-radius: 10px;
      min-height: 52px;

      &.nav-active, &.nav-active .nav-icon, &.nav-active .nav-label {
        color: #0891b2;
      }
    }

    .nav-icon { font-size: 22px; }
    .nav-label { font-size: 10px; font-weight: 500; }

    .nav-add {
      flex: none;
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #0891b2, #0e7490);
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(8,145,178,0.5);
      color: white !important;
      margin: 0 4px;
    }

    .nav-icon-plus {
      font-size: 28px;
      font-weight: 300;
      line-height: 1;
      color: white;
    }

    /* ===== MORE MENU ===== */
    .more-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 200;
      animation: fadeIn 0.2s ease;
    }

    .more-menu {
      position: absolute;
      bottom: var(--bottom-nav-height);
      left: 0;
      right: 0;
      background: #132238;
      border-radius: 24px 24px 0 0;
      padding: 20px;
      border: 1px solid rgba(255,255,255,0.08);
      animation: slideUp 0.25s ease;
    }

    .more-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .more-user {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .more-avatar {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0891b2, #0e7490);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 700;
    }

    .more-name {
      font-size: 15px;
      font-weight: 700;
      color: white;
    }

    .more-role {
      font-size: 12px;
      color: #64748b;
    }

    .more-links {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin: 8px 0;
    }

    .more-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 12px;
      border-radius: 12px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 15px;
      font-weight: 500;
      transition: all 0.2s;

      span:first-child { font-size: 20px; }

      &:hover { background: rgba(255,255,255,0.06); color: white; }
    }

    .more-logout {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 12px;
      border-radius: 12px;
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2);
      color: #f87171;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;

      span { font-size: 20px; }

      &:hover { background: rgba(239,68,68,0.14); }
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class ShellComponent {
  auth = inject(StoreAuthService);
  private router = inject(Router);

  showMore = signal(false);

  firstLetter(): string {
    return this.auth.staff()?.name?.charAt(0)?.toUpperCase() ?? 'S';
  }

  toggleMore(): void {
    this.showMore.update(v => !v);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
