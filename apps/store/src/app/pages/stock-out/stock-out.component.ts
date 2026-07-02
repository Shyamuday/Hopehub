import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreApiService } from '../../services/store-api.service';
import { MedicineWithStock } from '../../models';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { PAGE_SIZES } from '../../core/constants/pagination.constants';

type RemoveType = 'SALE_OUT' | 'ADJUSTMENT_OUT' | 'EXPIRED_REMOVAL';

@Component({
  selector: 'app-stock-out',
  imports: [FormsModule],
  templateUrl: './stock-out.component.html',
  styleUrl: './stock-out.component.scss'
})
export class StockOutComponent {
  private api = inject(StoreApiService);
  router = inject(Router);

  readonly routePaths = ROUTE_PATHS;

  searchQuery = '';
  searchResults = signal<MedicineWithStock[]>([]);
  selectedMedicine = signal<MedicineWithStock | null>(null);
  searching = signal(false);
  removeType = signal<RemoveType>('SALE_OUT');
  qty = 1;
  note = '';
  loading = signal(false);
  error = signal('');
  success = signal('');

  private timer: ReturnType<typeof setTimeout> | null = null;

  onSearch(): void {
    if (this.timer) clearTimeout(this.timer);
    if (!this.searchQuery.trim()) { this.searchResults.set([]); return; }
    this.searching.set(true);
    this.timer = setTimeout(() => {
      this.api.getMedicines({ q: this.searchQuery, pageSize: PAGE_SIZES.STOCK_LOOKUP }).subscribe({
        next: (r) => { this.searchResults.set(r.medicines); this.searching.set(false); },
        error: () => this.searching.set(false)
      });
    }, 300);
  }

  select(m: MedicineWithStock): void { this.selectedMedicine.set(m); this.searchResults.set([]); this.searchQuery = ''; this.qty = 1; }

  clear(): void { this.selectedMedicine.set(null); this.searchResults.set([]); this.searchQuery = ''; }

  notePlaceholder(): string {
    const map: Record<RemoveType, string> = {
      SALE_OUT: 'Customer name or prescription #',
      ADJUSTMENT_OUT: 'Reason for adjustment',
      EXPIRED_REMOVAL: 'Batch number or disposal details'
    };
    return map[this.removeType()];
  }

  submit(): void {
    const med = this.selectedMedicine();
    if (!med || !this.qty) return;
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.api.removeStock({
      stockId: med.stockId,
      qty: this.qty,
      note: this.note || undefined
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(`Removed ${this.qty} bottles of ${med.name} ${med.potency}`);
        this.clear();
        this.note = '';
        this.qty = 1;
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to remove stock');
      }
    });
  }
}
