import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { StoreApiService } from '../../services/store-api.service';
import { StoreAuthService } from '../../services/store-auth.service';
import { DashboardStats, MedicineWithStock, StockMovement } from '../../models';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './dashboard.component.html',
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
