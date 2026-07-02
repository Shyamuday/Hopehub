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
  styleUrl: './dashboard.component.scss'
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
