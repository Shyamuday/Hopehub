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
  template: `
    <div class="page">
      <div class="page-header">
        <button class="back-btn" (click)="router.navigate(['/', routePaths.DASHBOARD])">← Back</button>
        <div>
          <h1 class="page-title">📤 Remove Stock</h1>
          <p class="page-sub">Dispense, adjust, or remove expired medicine</p>
        </div>
      </div>

      <div class="form-card">
        <!-- Search -->
        <div class="form-section">
          <div class="section-label">Select Medicine</div>
          <div class="search-row">
            <input
              class="input"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearch()"
              placeholder="Search medicine..."
              autocomplete="off"
            />
            @if (searching()) { <div class="spinner-sm"></div> }
          </div>

          @if (searchResults().length && !selectedMedicine()) {
            <div class="search-dropdown">
              @for (m of searchResults(); track m.stockId) {
                <button class="search-result" (click)="select(m)" [disabled]="m.currentQty === 0">
                  <div class="result-info">
                    <span class="result-name">{{ m.name }}</span>
                    <span class="result-potency">{{ m.potency }}</span>
                  </div>
                  <span class="result-stock" [class.zero]="m.currentQty === 0">
                    {{ m.currentQty === 0 ? 'Out of stock' : m.currentQty + ' available' }}
                  </span>
                </button>
              }
            </div>
          }

          @if (selectedMedicine()) {
            <div class="selected-card">
              <div class="selected-info">
                <div class="sel-name">{{ selectedMedicine()!.name }}</div>
                <div class="sel-meta">
                  <span class="potency-badge">{{ selectedMedicine()!.potency }}</span>
                  <span class="stock-avail">{{ selectedMedicine()!.currentQty }} available</span>
                  @if (selectedMedicine()!.rack) {
                    <span class="loc">📍 {{ selectedMedicine()!.rack!.locationString }}</span>
                  }
                </div>
              </div>
              <button class="clear-btn" (click)="clear()">✕</button>
            </div>
          }
        </div>

        @if (selectedMedicine()) {
          <!-- Type -->
          <div class="form-section">
            <div class="section-label">Removal Type</div>
            <div class="type-grid">
              <button class="type-btn" [class.active]="removeType() === 'SALE_OUT'" (click)="removeType.set('SALE_OUT')">
                <span class="type-icon">🛒</span>
                <span class="type-label">Sold</span>
              </button>
              <button class="type-btn" [class.active]="removeType() === 'ADJUSTMENT_OUT'" (click)="removeType.set('ADJUSTMENT_OUT')">
                <span class="type-icon">✏️</span>
                <span class="type-label">Adjustment</span>
              </button>
              <button class="type-btn danger" [class.active]="removeType() === 'EXPIRED_REMOVAL'" (click)="removeType.set('EXPIRED_REMOVAL')">
                <span class="type-icon">🗑️</span>
                <span class="type-label">Expired</span>
              </button>
            </div>
          </div>

          <!-- Qty & Note -->
          <div class="form-section">
            <div class="form-group">
              <label>Quantity to Remove *</label>
              <div class="qty-row">
                <button class="qty-btn" (click)="qty > 1 ? qty = qty - 1 : null">−</button>
                <input class="input qty-input" type="number" [(ngModel)]="qty" min="1" [max]="selectedMedicine()!.currentQty" />
                <button class="qty-btn" (click)="qty < selectedMedicine()!.currentQty ? qty = qty + 1 : null">+</button>
              </div>
              <p class="qty-hint">Max: {{ selectedMedicine()!.currentQty }} bottles</p>
            </div>
            <div class="form-group" style="margin-top: 14px;">
              <label>Note</label>
              <input class="input" [(ngModel)]="note" [placeholder]="notePlaceholder()" />
            </div>
          </div>

          <!-- Confirm bar -->
          <div class="confirm-bar">
            <div class="confirm-info">
              <span class="confirm-label">Removing</span>
              <span class="confirm-qty">{{ qty }}</span>
              <span class="confirm-label">bottles of</span>
              <span class="confirm-name">{{ selectedMedicine()!.name }} {{ selectedMedicine()!.potency }}</span>
            </div>
            <button class="btn-remove" [disabled]="!qty || qty > selectedMedicine()!.currentQty || loading()" (click)="submit()">
              @if (loading()) {
                <span class="btn-spinner"></span>
              } @else {
                Remove
              }
            </button>
          </div>

          @if (error()) { <div class="error-msg">⚠️ {{ error() }}</div> }
          @if (success()) { <div class="success-msg">✅ {{ success() }}</div> }
        }
      </div>
    </div>
  `,
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
