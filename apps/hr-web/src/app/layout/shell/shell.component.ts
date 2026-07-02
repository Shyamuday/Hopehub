import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { HrAuthService } from '../../services/hr-auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <!-- Sidebar (desktop) -->
      <aside class="sidebar" [class.open]="sidebarOpen()">
        <div class="sidebar-header">
          <div class="logo">
            <span class="logo-icon">🏥</span>
            <span class="logo-text">HR Portal</span>
          </div>
          <button class="sidebar-close" (click)="sidebarOpen.set(false)">✕</button>
        </div>

        <nav class="sidebar-nav">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              class="nav-item"
              (click)="sidebarOpen.set(false)"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-avatar">{{ userInitial() }}</div>
            <div class="user-details">
              <div class="user-name">{{ auth.currentUser()?.name }}</div>
              <div class="user-role">HR</div>
            </div>
          </div>
          <button class="logout-btn" (click)="auth.logout()" title="Logout">⬡</button>
        </div>
      </aside>

      <!-- Overlay -->
      @if (sidebarOpen()) {
        <div class="overlay" (click)="sidebarOpen.set(false)"></div>
      }

      <!-- Main content -->
      <div class="main">
        <!-- Top bar -->
        <header class="topbar">
          <button class="menu-btn" (click)="sidebarOpen.set(true)">☰</button>
          <div class="topbar-title">{{ pageTitle() }}</div>
          <div class="topbar-right">
            <div class="topbar-user">
              <div class="topbar-avatar">{{ userInitial() }}</div>
              <span class="topbar-name">{{ auth.currentUser()?.name }}</span>
            </div>
            <button class="topbar-logout" (click)="auth.logout()" title="Logout">
              <span>⏻</span>
            </button>
          </div>
        </header>

        <!-- Page content -->
        <main class="content">
          <router-outlet />
        </main>

        <!-- Mobile bottom nav -->
        <nav class="bottom-nav">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              class="bottom-nav-item"
            >
              <span class="bottom-nav-icon">{{ item.icon }}</span>
              <span class="bottom-nav-label">{{ item.label }}</span>
            </a>
          }
        </nav>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-primary);
    }

    /* Sidebar */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      z-index: 100;
      transition: transform var(--transition);
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 16px;
      border-bottom: 1px solid var(--border);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .logo-icon { font-size: 24px; }

    .logo-text {
      font-size: 16px;
      font-weight: 700;
      color: var(--accent);
      letter-spacing: 0.5px;
    }

    .sidebar-close { display: none; color: var(--text-secondary); font-size: 16px; }

    .sidebar-nav {
      flex: 1;
      padding: 12px 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      transition: all var(--transition);
      font-size: 14px;
    }

    .nav-item:hover {
      background: var(--accent-glow);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: var(--accent-glow);
      color: var(--accent);
      font-weight: 600;
    }

    .nav-icon { font-size: 18px; width: 24px; text-align: center; }
    .nav-label { flex: 1; }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--accent-dark);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }

    .user-details { min-width: 0; }

    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role { font-size: 11px; color: var(--text-muted); }

    .logout-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: var(--bg-input);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all var(--transition);
      flex-shrink: 0;
    }

    .logout-btn:hover {
      background: var(--red-bg);
      color: var(--red);
    }

    /* Overlay */
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 99;
      display: none;
    }

    /* Main */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }

    /* Topbar */
    .topbar {
      height: var(--topbar-height);
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 16px;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .menu-btn {
      display: none;
      color: var(--text-secondary);
      font-size: 20px;
      padding: 6px;
      border-radius: var(--radius-sm);
      transition: all var(--transition);
    }

    .menu-btn:hover {
      background: var(--bg-input);
      color: var(--text-primary);
    }

    .topbar-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      flex: 1;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .topbar-user {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .topbar-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--accent-dark);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
    }

    .topbar-name {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .topbar-logout {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: var(--bg-input);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all var(--transition);
    }

    .topbar-logout:hover {
      background: var(--red-bg);
      color: var(--red);
    }

    /* Content */
    .content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    /* Bottom nav */
    .bottom-nav {
      display: none;
      height: 60px;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      flex-direction: row;
      align-items: center;
      justify-content: space-around;
      padding: 0 8px;
      flex-shrink: 0;
    }

    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 6px 12px;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      transition: all var(--transition);
      font-size: 11px;
      min-width: 0;
    }

    .bottom-nav-item.active {
      color: var(--accent);
    }

    .bottom-nav-icon { font-size: 20px; }
    .bottom-nav-label { font-size: 10px; white-space: nowrap; }

    /* Responsive */
    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        transform: translateX(-100%);
      }

      .sidebar.open {
        transform: translateX(0);
      }

      .overlay { display: block; }

      .sidebar-close { display: block; }

      .menu-btn { display: flex; align-items: center; }

      .topbar-name { display: none; }

      .content { padding: 16px; padding-bottom: 76px; }

      .bottom-nav { display: flex; }
    }
  `]
})
export class ShellComponent {
  auth = inject(HrAuthService);
  sidebarOpen = signal(false);

  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/employees', label: 'Employees', icon: '👥' },
    { path: '/doctors', label: 'Doctors', icon: '🩺' },
    { path: '/store-staff', label: 'Store Staff', icon: '🧑‍💼' },
    { path: '/stores', label: 'Stores', icon: '🏪' },
    { path: '/leaves', label: 'Leaves', icon: '📋' },
    { path: '/payroll', label: 'Payroll', icon: '💰' }
  ];

  userInitial() {
    const name = this.auth.currentUser()?.name ?? 'H';
    return name.charAt(0).toUpperCase();
  }

  pageTitle() {
    return 'HR Portal';
  }
}
