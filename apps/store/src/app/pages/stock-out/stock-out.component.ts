import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StoreApiService } from '../../services/store-api.service';
import { MedicineWithStock } from '../../models';

type RemoveType = 'SALE_OUT' | 'ADJUSTMENT_OUT' | 'EXPIRED_REMOVAL';

@Component({
  selector: 'app-stock-out',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <button class="back-btn" (click)="router.navigate(['/dashboard'])">← Back</button>
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
  styles: [`
    .page {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
      color: white;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 24px;

      .page-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .page-sub { font-size: 14px; color: #64748b; margin: 0; }
    }

    .back-btn {
      padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
      background: transparent; color: #94a3b8; cursor: pointer; font-size: 14px;
      white-space: nowrap; margin-top: 4px; transition: all 0.2s;
      &:hover { background: rgba(255,255,255,0.06); color: white; }
    }

    .form-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-section { .section-label { font-size: 13px; font-weight: 700; color: #0891b2; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; } }

    .search-row { position: relative; .input { width: 100%; } }

    .spinner-sm {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      width: 18px; height: 18px; border: 2px solid rgba(8,145,178,0.2);
      border-top-color: #0891b2; border-radius: 50%; animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .search-dropdown {
      margin-top: 6px; background: #132238; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px; overflow: hidden;
    }

    .search-result {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      width: 100%; padding: 12px 16px; border: none; background: transparent;
      color: white; cursor: pointer; text-align: left; transition: all 0.15s;
      border-bottom: 1px solid rgba(255,255,255,0.05);

      &:last-child { border-bottom: none; }
      &:hover:not(:disabled) { background: rgba(8,145,178,0.1); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }

      .result-info { display: flex; align-items: center; gap: 8px; flex: 1; }
      .result-name { font-size: 14px; font-weight: 600; }
      .result-potency { padding: 2px 8px; border-radius: 6px; background: rgba(8,145,178,0.15); color: #06b6d4; font-size: 12px; font-weight: 600; }
      .result-stock { font-size: 12px; color: #64748b; white-space: nowrap; &.zero { color: #f87171; } }
    }

    .selected-card {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(8,145,178,0.08); border: 1px solid rgba(8,145,178,0.25);
      border-radius: 14px; padding: 14px 16px;

      .sel-name { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
      .sel-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .potency-badge { padding: 2px 8px; border-radius: 6px; background: rgba(8,145,178,0.15); color: #06b6d4; font-size: 12px; font-weight: 600; }
      .stock-avail { font-size: 12px; color: #4ade80; }
      .loc { font-size: 12px; color: #64748b; }
    }

    .clear-btn {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
      background: transparent; color: #64748b; cursor: pointer; font-size: 14px; flex-shrink: 0;
      &:hover { background: rgba(239,68,68,0.1); color: #f87171; }
    }

    .type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

    .type-btn {
      padding: 14px 10px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.04); color: #64748b; cursor: pointer; display: flex;
      flex-direction: column; align-items: center; gap: 6px; transition: all 0.2s;

      .type-icon { font-size: 22px; }
      .type-label { font-size: 12px; font-weight: 600; }

      &.active { background: rgba(8,145,178,0.12); border-color: #0891b2; color: #06b6d4; }
      &.danger.active { background: rgba(239,68,68,0.1); border-color: #ef4444; color: #f87171; }
    }

    .form-group { display: flex; flex-direction: column; gap: 6px; label { font-size: 13px; font-weight: 600; color: #94a3b8; } }

    .input {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 12px 14px; color: white; font-size: 14px;
      width: 100%; box-sizing: border-box; transition: all 0.2s;
      &::placeholder { color: #475569; }
      &:focus { outline: none; border-color: #0891b2; background: rgba(8,145,178,0.05); }
    }

    .qty-row { display: flex; align-items: center; gap: 10px; }
    .qty-btn {
      width: 44px; height: 44px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.06); color: white; font-size: 20px; cursor: pointer; flex-shrink: 0;
      transition: all 0.15s; &:hover { background: rgba(8,145,178,0.15); }
    }
    .qty-input { flex: 1; text-align: center; font-size: 18px; font-weight: 700; }
    .qty-hint { font-size: 12px; color: #475569; margin: 4px 0 0; }

    .confirm-bar {
      background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15);
      border-radius: 14px; padding: 16px; display: flex; align-items: center;
      justify-content: space-between; gap: 12px;
    }

    .confirm-info { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .confirm-label { font-size: 14px; color: #94a3b8; }
    .confirm-qty { font-size: 20px; font-weight: 800; color: #f87171; }
    .confirm-name { font-size: 14px; font-weight: 700; color: white; }

    .btn-remove {
      padding: 12px 20px; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #ef4444, #dc2626); color: white;
      font-size: 14px; font-weight: 700; cursor: pointer; display: flex;
      align-items: center; gap: 6px; white-space: nowrap; flex-shrink: 0;
      transition: all 0.2s;
      &:hover:not(:disabled) { box-shadow: 0 4px 16px rgba(239,68,68,0.4); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .btn-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }

    .error-msg { padding: 12px 16px; border-radius: 12px; font-size: 14px; text-align: center; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; }
    .success-msg { padding: 12px 16px; border-radius: 12px; font-size: 14px; text-align: center; background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.2); color: #4ade80; }
  `]
})
export class StockOutComponent {
  private api = inject(StoreApiService);
  router = inject(Router);

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
      this.api.getMedicines({ q: this.searchQuery, pageSize: 10 }).subscribe({
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
