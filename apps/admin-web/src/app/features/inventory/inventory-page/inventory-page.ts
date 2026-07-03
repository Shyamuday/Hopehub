import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';

@Component({
  selector: 'app-inventory-page',
  imports: [FormsModule],
  templateUrl: './inventory-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './inventory-page.scss'
})
export class InventoryPage implements OnInit {
  private api = inject(AdminApi);

  overview = signal<any[]>([]);
  stocks = signal<any[]>([]);
  selectedStoreId = signal('');
  selectedStore = signal<any>(null);
  loading = signal(true);
  stockLoading = signal(false);
  error = signal('');
  q = '';
  statusFilter = '';

  ngOnInit(): void {
    void this.loadOverview();
  }

  async loadOverview() {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.api.getInventoryOverview();
      this.overview.set(response.stores);
      if (!this.selectedStoreId() && response.stores.length) {
        this.selectStore(response.stores[0].id);
      }
    } catch {
      this.error.set('Could not load inventory overview.');
    } finally {
      this.loading.set(false);
    }
  }

  selectStore(storeId: string) {
    this.selectedStoreId.set(storeId);
    void this.loadStock();
  }

  async loadStock(page = 1) {
    const storeId = this.selectedStoreId();
    if (!storeId) return;
    this.stockLoading.set(true);
    try {
      const response = await this.api.getStoreStock(storeId, {
        q: this.q,
        status: this.statusFilter,
        page
      });
      this.stocks.set(response.stocks);
      this.selectedStore.set(response.store);
    } catch {
      this.error.set('Could not load store stock.');
    } finally {
      this.stockLoading.set(false);
    }
  }
}
