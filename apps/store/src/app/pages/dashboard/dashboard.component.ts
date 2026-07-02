import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { StoreApiService } from '../../services/store-api.service';
import { StoreAuthService } from '../../services/store-auth.service';
import { DashboardStats, MedicineWithStock, StockMovement } from '../../models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe],
  template: `
    <div class="page-content">
      <!-- Header -->
      <div class="dash-header">
        <div>
          <h1>Good {{ greeting() }},</h1>
          <p>{{ auth.staff()?.name ?? 'Staff' }} · {{ auth.staff()?.storeName ?? 'Store' }}</p>
        </div>
        <div class="header-badge">{{ auth.staff()?.role === 'MANAGER' ? '👔' : '🧑‍💼' }}</div>
      </div>

      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:40px">
          <div class="spinner"></div>
        </div>
      }

      @if (stats(); as s) {
        <!-- Stats grid -->
        <div class="stats-grid" style="margin-bottom: 20px;">
          <div class="stat-card">
            <div class="stat-icon">💊</div>
            <div class="stat-value teal">{{ s.totalMedicines | number }}</div>
            <div class="stat-label">Total Medicines</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-value green">₹{{ formatValue(s.totalStockValue) }}</div>
            <div class="stat-label">Stock Value</div>
          </div>
          <div class="stat-card" [class.warn]="s.lowStockCount > 0">
            <div class="stat-icon">⚠️</div>
            <div class="stat-value" [class.red]="s.lowStockCount > 0" [class.green]="s.lowStockCount === 0">
              {{ s.lowStockCount }}
            </div>
            <div class="stat-label">Low Stock</div>
          </div>
          <div class="stat-card" [class.warn]="s.expiringCount > 0">
            <div class="stat-icon">📅</div>
            <div class="stat-value" [class.yellow]="s.expiringCount > 0" [class.green]="s.expiringCount === 0">
              {{ s.expiringCount }}
            </div>
            <div class="stat-label">Expiring Soon</div>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="quick-actions">
          <a class="quick-btn" routerLink="/stock-in">
            <span class="qb-icon">📦</span>
            <span>Add Stock</span>
          </a>
          <a class="quick-btn" routerLink="/stock-out">
            <span class="qb-icon">📤</span>
            <span>Remove</span>
          </a>
          <a class="quick-btn" routerLink="/search">
            <span class="qb-icon">🔍</span>
            <span>Search</span>
          </a>
          <a class="quick-btn" routerLink="/rack-map">
            <span class="qb-icon">🗺️</span>
            <span>Rack Map</span>
          </a>
        </div>

        <!-- Alerts banner -->
        @if (s.lowStockCount > 0 || s.expiringCount > 0) {
          <a class="alerts-banner" routerLink="/alerts">
            <div class="alerts-content">
              <span class="alerts-icon">🔔</span>
              <div>
                <div class="alerts-title">Attention Required</div>
                <div class="alerts-sub">
                  @if (s.lowStockCount > 0) { <span class="alert-pill red">{{ s.lowStockCount }} low stock</span> }
                  @if (s.expiringCount > 0) { <span class="alert-pill yellow">{{ s.expiringCount }} expiring</span> }
                </div>
              </div>
            </div>
            <span class="chevron">›</span>
          </a>
        }

        <!-- Low stock medicines -->
        @if (s.topLowStock.length > 0) {
          <div class="section">
            <div class="section-header">
              <h2>⚠️ Low Stock</h2>
              <a routerLink="/alerts" class="see-all">See all</a>
            </div>
            <div class="list">
              @for (med of s.topLowStock; track med.id) {
                <a class="medicine-item" [routerLink]="['/medicines', med.id]">
                  <div class="med-status-dot" [class]="getStatusClass(med)"></div>
                  <div class="med-info">
                    <div class="med-name">{{ med.name }}</div>
                    <div class="med-sub">
                      <span class="badge" [class]="getPotencyClass(med.potency)">{{ med.potency }}</span>
                      @if (med.rack) { <span style="color: #64748b; font-size:12px">· {{ med.rack.locationString }}</span> }
                    </div>
                  </div>
                  <div class="med-qty" [class.red]="med.currentQty === 0" [class.yellow]="med.currentQty > 0">
                    {{ med.currentQty }}
                    <div style="font-size:11px;color:#64748b">units</div>
                  </div>
                </a>
              }
            </div>
          </div>
        }

        <!-- Recent movements -->
        @if (s.recentMovements.length > 0) {
          <div class="section">
            <div class="section-header">
              <h2>📋 Recent Activity</h2>
              <a routerLink="/movements" class="see-all">See all</a>
            </div>
            <div class="list">
              @for (m of s.recentMovements.slice(0, 5); track m.id) {
                <div class="movement-item">
                  <div class="move-type-icon" [class]="getMoveClass(m.type)">
                    {{ getMoveIcon(m.type) }}
                  </div>
                  <div class="med-info">
                    <div class="med-name">{{ m.medicineName }}</div>
                    <div class="med-sub" style="font-size:12px;color:#64748b">
                      {{ m.type.replace('_', ' ') }} · {{ m.createdAt | date:'MMM d, h:mm a' }}
                    </div>
                  </div>
                  <div class="move-qty" [class.green]="isInbound(m.type)" [class.red]="!isInbound(m.type)">
                    {{ isInbound(m.type) ? '+' : '-' }}{{ m.qty }}
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }

      @if (error()) {
        <div class="error-card">
          <p>{{ error() }}</p>
          <button class="btn btn-secondary btn-sm" (click)="load()">Retry</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-content { padding: 20px 16px; padding-bottom: 88px; overflow-y: auto; height: 100%; }

    .dash-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;

      h1 { font-size: 22px; font-weight: 800; }
      p { font-size: 13px; color: #64748b; margin-top: 2px; }
    }

    .header-badge { font-size: 32px; }

    .teal { color: #06b6d4; }
    .green { color: #10b981; }
    .red { color: #ef4444; }
    .yellow { color: #f59e0b; }

    .stat-card.warn { border-color: rgba(245,158,11,0.2); }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 20px;
    }

    .quick-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 14px 8px;
      background: rgba(255,255,255,0.05);
      border-radius: 14px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.07);
      transition: all 0.2s;

      &:hover { background: rgba(8,145,178,0.1); color: #06b6d4; }
      .qb-icon { font-size: 22px; }
    }

    .alerts-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.25);
      border-radius: 16px;
      padding: 14px 16px;
      text-decoration: none;
      margin-bottom: 20px;
      transition: all 0.2s;

      &:hover { background: rgba(245,158,11,0.12); }
    }

    .alerts-content { display: flex; align-items: center; gap: 12px; }
    .alerts-icon { font-size: 24px; }
    .alerts-title { font-size: 14px; font-weight: 700; color: white; margin-bottom: 4px; }
    .alerts-sub { display: flex; gap: 6px; flex-wrap: wrap; }
    .alert-pill {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 20px;
      &.red { background: rgba(239,68,68,0.15); color: #f87171; }
      &.yellow { background: rgba(245,158,11,0.15); color: #fcd34d; }
    }
    .chevron { font-size: 22px; color: #94a3b8; }

    .section { margin-bottom: 20px; }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      h2 { font-size: 16px; font-weight: 700; }
    }
    .see-all { font-size: 13px; color: #0891b2; text-decoration: none; }
    .list { display: flex; flex-direction: column; gap: 8px; }

    .med-status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      &.status-green { background: #10b981; }
      &.status-yellow { background: #f59e0b; }
      &.status-red { background: #ef4444; }
    }

    .movement-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.05);
    }

    .move-type-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
      &.in { background: rgba(16,185,129,0.12); }
      &.out { background: rgba(239,68,68,0.12); }
    }

    .move-qty { font-size: 15px; font-weight: 700; }

    .error-card {
      background: rgba(239,68,68,0.08);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      p { color: #f87171; margin-bottom: 12px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(StoreApiService);
  auth = inject(StoreAuthService);

  stats = signal<DashboardStats | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getDashboard().subscribe({
      next: (data) => { this.stats.set(data); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to load dashboard');
      }
    });
  }

  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  formatValue(v: number): string {
    if (v >= 100000) return (v / 100000).toFixed(1) + 'L';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    return v.toFixed(0);
  }

  getStatusClass(med: MedicineWithStock): string {
    if (med.status === 'OUT_OF_STOCK') return 'status-red';
    if (med.status === 'LOW_STOCK') return 'status-yellow';
    return 'status-green';
  }

  getPotencyClass(potency: string): string {
    const p = potency?.toLowerCase() ?? '';
    if (p.includes('30c')) return 'badge potency-30c';
    if (p.includes('200c')) return 'badge potency-200c';
    if (p.includes('1m') || p.includes('10m') || p.includes('50m')) return 'badge potency-1m';
    if (p.includes('q') || p.includes('mother')) return 'badge potency-q';
    return 'badge potency-other';
  }

  getMoveIcon(type: string): string {
    const icons: Record<string, string> = {
      PURCHASE_IN: '📦', ADJUSTMENT_IN: '➕', TRANSFER_IN: '↙️',
      SALE_OUT: '🛒', ADJUSTMENT_OUT: '➖', TRANSFER_OUT: '↗️', EXPIRED_REMOVAL: '🗑️'
    };
    return icons[type] ?? '•';
  }

  getMoveClass(type: string): string {
    return this.isInbound(type) ? 'in' : 'out';
  }

  isInbound(type: string): boolean {
    return type.endsWith('_IN');
  }
}
