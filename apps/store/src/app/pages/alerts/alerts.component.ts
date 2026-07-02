import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { StoreApiService } from '../../services/store-api.service';
import { MedicineWithStock, StockBatch } from '../../models';

@Component({
  selector: 'app-alerts',
  imports: [RouterLink, DatePipe],
  templateUrl: './alerts.component.html',
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
