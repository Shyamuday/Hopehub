import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { StoreApiService } from '../../services/store-api.service';
import { MedicineWithStock, StockBatch } from '../../models';

@Component({
  selector: 'app-alerts',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page-content">
      <div class="page-header">
        <h1>🔔 Alerts</h1>
        <p>Stock and expiry warnings</p>
      </div>

      <!-- Tabs -->
      <div class="tabs" style="margin-bottom: 20px;">
        <button class="tab" [class.active]="tab() === 'low'" (click)="tab.set('low')">
          🔴 Low Stock
          @if (lowStock().length > 0) { <span class="tab-count">{{ lowStock().length }}</span> }
        </button>
        <button class="tab" [class.active]="tab() === 'expiring'" (click)="tab.set('expiring')">
          📅 Expiring
          @if (expiring().length > 0) { <span class="tab-count yellow-count">{{ expiring().length }}</span> }
        </button>
      </div>

      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:40px"><div class="spinner"></div></div>
      }

      <!-- Low Stock Tab -->
      @if (tab() === 'low' && !loading()) {
        @if (lowStock().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <h3>All good!</h3>
            <p>No medicines with low stock</p>
          </div>
        } @else {
          <div class="alerts-list">
            @for (med of lowStock(); track med.id) {
              <div class="alert-card red-card">
                <div class="alert-indicator red-indicator"></div>
                <div class="alert-body">
                  <div class="alert-top">
                    <div class="alert-name">{{ med.name }}</div>
                    <div class="alert-qty red-text">{{ med.currentQty }} left</div>
                  </div>
                  <div class="alert-meta">
                    <span class="badge" [class]="getPotencyClass(med.potency)">{{ med.potency }}</span>
                    @if (med.rack) {
                      <span class="location-tag">📍 {{ med.rack.locationString }}</span>
                    }
                    <span class="min-tag">Min: {{ med.minStockLevel }}</span>
                  </div>
                  <div class="alert-actions">
                    <a class="btn btn-sm btn-primary" [routerLink]="['/stock-in']" [queryParams]="{medicineId: med.id}">
                      + Add Stock
                    </a>
                    <a class="btn btn-sm btn-secondary" [routerLink]="['/medicines', med.id]">
                      View
                    </a>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }

      <!-- Expiring Tab -->
      @if (tab() === 'expiring' && !loading()) {
        <div class="expiry-filter">
          <span class="filter-lbl">Show expiring in:</span>
          @for (d of expiryDays; track d) {
            <button class="days-chip" [class.active]="daysFilter() === d" (click)="setDays(d)">
              {{ d }}d
            </button>
          }
        </div>

        @if (expiring().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <h3>No expiring soon</h3>
            <p>No batches expiring within {{ daysFilter() }} days</p>
          </div>
        } @else {
          <div class="alerts-list">
            @for (batch of expiring(); track batch.id) {
              <div class="alert-card" [class]="getExpiryCardClass(batch)">
                <div class="alert-indicator" [class]="getExpiryIndicatorClass(batch)"></div>
                <div class="alert-body">
                  <div class="alert-top">
                    <div class="alert-name">{{ batch.batchNumber }}</div>
                    <div class="expiry-countdown" [class]="getExpiryTextClass(batch)">
                      @if (batch.isExpired) { Expired }
                      @else { {{ batch.daysToExpiry }}d left }
                    </div>
                  </div>
                  <div class="alert-meta">
                    <span class="expiry-date">Exp: {{ batch.expiryDate | date:'dd MMM yyyy' }}</span>
                    <span class="batch-qty">{{ batch.qty }} units</span>
                    @if (batch.manufacturer) {
                      <span class="mfr-tag">{{ batch.manufacturer }}</span>
                    }
                  </div>
                  <div class="expiry-bar-wrap">
                    <div class="expiry-bar" [class]="getExpiryBarClass(batch)" [style.width]="getExpiryBarWidth(batch) + '%'"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styleUrl: './alerts.component.scss'
})
export class AlertsComponent implements OnInit {
  private api = inject(StoreApiService);

  tab = signal<'low' | 'expiring'>('low');
  lowStock = signal<MedicineWithStock[]>([]);
  expiring = signal<StockBatch[]>([]);
  loading = signal(false);
  daysFilter = signal(30);

  expiryDays = [7, 14, 30, 60, 90];

  ngOnInit(): void {
    this.loadLowStock();
    this.loadExpiring();
  }

  loadLowStock(): void {
    this.loading.set(true);
    this.api.getLowStockAlerts().subscribe({
      next: (res) => { this.lowStock.set(res.medicines); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadExpiring(): void {
    this.api.getExpiringAlerts(this.daysFilter()).subscribe({
      next: (res) => this.expiring.set(res.batches)
    });
  }

  setDays(d: number): void {
    this.daysFilter.set(d);
    this.loadExpiring();
  }

  getPotencyClass(potency: string): string {
    const p = potency?.toLowerCase() ?? '';
    if (p.includes('30c')) return 'badge potency-30c';
    if (p.includes('200c')) return 'badge potency-200c';
    if (p.includes('1m')) return 'badge potency-1m';
    if (p.includes('q')) return 'badge potency-q';
    return 'badge potency-other';
  }

  getExpiryCardClass(batch: StockBatch): string {
    if (batch.isExpired || batch.daysToExpiry <= 7) return 'red-card';
    if (batch.daysToExpiry <= 30) return 'orange-card';
    return 'yellow-card';
  }

  getExpiryIndicatorClass(batch: StockBatch): string {
    if (batch.isExpired || batch.daysToExpiry <= 7) return 'red-indicator';
    if (batch.daysToExpiry <= 30) return 'orange-indicator';
    return 'yellow-indicator';
  }

  getExpiryTextClass(batch: StockBatch): string {
    if (batch.isExpired || batch.daysToExpiry <= 7) return 'red-text';
    if (batch.daysToExpiry <= 30) return 'orange-text';
    return 'yellow-text';
  }

  getExpiryBarClass(batch: StockBatch): string {
    if (batch.isExpired || batch.daysToExpiry <= 7) return 'bar-red';
    if (batch.daysToExpiry <= 30) return 'bar-orange';
    return 'bar-yellow';
  }

  getExpiryBarWidth(batch: StockBatch): number {
    if (batch.isExpired) return 100;
    const days = batch.daysToExpiry;
    const total = this.daysFilter();
    return Math.max(5, Math.min(100, ((total - days) / total) * 100));
  }
}
