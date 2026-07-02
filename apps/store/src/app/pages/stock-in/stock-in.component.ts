import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreApiService } from '../../services/store-api.service';
import { MedicineWithStock, StoreRack } from '../../models';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { PAGE_SIZES } from '../../core/constants/pagination.constants';

@Component({
  selector: 'app-stock-in',
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <button class="back-btn" (click)="goBack()">← Back</button>
        <div>
          <h1 class="page-title">📦 Receive Stock</h1>
          <p class="page-sub">Add new medicine stock with batch details</p>
        </div>
      </div>

      <div class="form-card">
        <!-- Step 1: Select Medicine -->
        <div class="form-section">
          <div class="section-label">Step 1 — Select Medicine</div>
          <div class="search-row">
            <input
              class="input"
              type="text"
              [(ngModel)]="medicineSearch"
              (ngModelChange)="onSearchChange()"
              placeholder="Search medicine name or potency..."
              autocomplete="off"
            />
            @if (searching()) {
              <div class="spinner-sm"></div>
            }
          </div>

          @if (searchResults().length > 0 && !selectedMedicine()) {
            <div class="search-dropdown">
              @for (m of searchResults(); track m.stockId) {
                <button class="search-result" (click)="selectMedicine(m)">
                  <span class="result-name">{{ m.name }}</span>
                  <span class="result-potency">{{ m.potency }}</span>
                  <span class="result-stock" [class.low]="m.status !== 'ACTIVE'">
                    Stock: {{ m.currentQty }}
                  </span>
                </button>
              }
            </div>
          }

          @if (selectedMedicine()) {
            <div class="selected-medicine">
              <div class="selected-info">
                <div class="selected-name">{{ selectedMedicine()!.name }}</div>
                <div class="selected-meta">
                  <span class="potency-badge">{{ selectedMedicine()!.potency }}</span>
                  @if (selectedMedicine()!.manufacturer) {
                    <span class="mfr">{{ selectedMedicine()!.manufacturer }}</span>
                  }
                  <span class="stock-chip" [class.low]="selectedMedicine()!.status !== 'ACTIVE'">
                    Current: {{ selectedMedicine()!.currentQty }}
                  </span>
                </div>
              </div>
              <button class="clear-btn" (click)="clearMedicine()">✕</button>
            </div>
          }
        </div>

        @if (selectedMedicine()) {
          <!-- Step 2: Batch Details -->
          <div class="form-section">
            <div class="section-label">Step 2 — Batch Details</div>
            <div class="form-grid">
              <div class="form-group">
                <label>Batch Number *</label>
                <input class="input" [(ngModel)]="form.batchNumber" placeholder="e.g. BCH-2024-001" />
              </div>
              <div class="form-group">
                <label>Manufacturer</label>
                <input class="input" [(ngModel)]="form.manufacturer" placeholder="e.g. SBL, Reckeweg" />
              </div>
              <div class="form-group">
                <label>Quantity *</label>
                <input class="input" type="number" [(ngModel)]="form.qty" min="1" placeholder="100" />
              </div>
              <div class="form-group">
                <label>Expiry Date *</label>
                <input class="input" type="date" [(ngModel)]="form.expiryDate" [min]="today" />
              </div>
              <div class="form-group">
                <label>Purchase Price (₹/bottle) *</label>
                <input class="input" type="number" [(ngModel)]="form.purchasePriceRs" min="0" placeholder="0.00" step="0.01" />
              </div>
              <div class="form-group">
                <label>Selling Price (₹/bottle) *</label>
                <input class="input" type="number" [(ngModel)]="form.sellingPriceRs" min="0" placeholder="0.00" step="0.01" />
              </div>
            </div>
          </div>

          <!-- Step 3: Location -->
          <div class="form-section">
            <div class="section-label">Step 3 — Location (Optional)</div>
            <div class="form-group">
              <label>Rack Location</label>
              <select class="input" [(ngModel)]="form.rackId">
                <option value="">— No rack assigned —</option>
                @for (r of racks(); track r.id) {
                  <option [value]="r.id">{{ r.locationString }}{{ r.label ? ' · ' + r.label : '' }}</option>
                }
              </select>
            </div>
            <div class="form-group" style="margin-top: 14px;">
              <label>Note</label>
              <input class="input" [(ngModel)]="form.note" placeholder="Purchase from supplier, etc." />
            </div>
          </div>

          <!-- Summary -->
          @if (form.qty && form.purchasePriceRs && form.sellingPriceRs) {
            <div class="summary-card">
              <div class="summary-row">
                <span>Total Purchase Value</span>
                <span class="summary-val">₹{{ (form.qty * form.purchasePriceRs).toFixed(2) }}</span>
              </div>
              <div class="summary-row">
                <span>Total Selling Value</span>
                <span class="summary-val highlight">₹{{ (form.qty * form.sellingPriceRs).toFixed(2) }}</span>
              </div>
              <div class="summary-row">
                <span>Margin</span>
                <span class="summary-val" [class.positive]="form.sellingPriceRs > form.purchasePriceRs">
                  {{ marginPercent().toFixed(1) }}%
                </span>
              </div>
            </div>
          }

          <!-- Submit -->
          <button class="btn-submit" [disabled]="!isValid() || loading()" (click)="submit()">
            @if (loading()) {
              <span class="btn-spinner"></span> Adding Stock...
            } @else {
              ✅ Add Stock ({{ form.qty || 0 }} bottles)
            }
          </button>

          @if (error()) {
            <div class="error-msg">⚠️ {{ error() }}</div>
          }
          @if (success()) {
            <div class="success-msg">✅ {{ success() }}</div>
          }
        }
      </div>
    </div>
  `,
  styleUrl: './stock-in.component.scss'
})
export class StockInComponent implements OnInit {
  private api = inject(StoreApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  medicineSearch = '';
  searchResults = signal<MedicineWithStock[]>([]);
  selectedMedicine = signal<MedicineWithStock | null>(null);
  searching = signal(false);
  racks = signal<StoreRack[]>([]);
  loading = signal(false);
  error = signal('');
  success = signal('');

  today = new Date().toISOString().split('T')[0];

  form = {
    batchNumber: '',
    manufacturer: '',
    qty: 0,
    expiryDate: '',
    purchasePriceRs: 0,
    sellingPriceRs: 0,
    rackId: '',
    note: ''
  };

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.api.getRacks().subscribe({ next: (r) => this.racks.set(r.racks) });

    const preselect = this.route.snapshot.queryParamMap.get('medicineId');
    if (preselect) {
      this.api.getMedicine(preselect).subscribe({
        next: (res) => {
          if (res.medicine) this.selectedMedicine.set(res.medicine);
        }
      });
    }
  }

  onSearchChange(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    if (!this.medicineSearch.trim()) {
      this.searchResults.set([]);
      return;
    }
    this.searching.set(true);
    this.searchTimer = setTimeout(() => {
      this.api.getMedicines({ q: this.medicineSearch, pageSize: PAGE_SIZES.STOCK_LOOKUP }).subscribe({
        next: (res) => {
          this.searchResults.set(res.medicines);
          this.searching.set(false);
        },
        error: () => this.searching.set(false)
      });
    }, 300);
  }

  selectMedicine(m: MedicineWithStock): void {
    this.selectedMedicine.set(m);
    this.searchResults.set([]);
    this.medicineSearch = '';
  }

  clearMedicine(): void {
    this.selectedMedicine.set(null);
    this.searchResults.set([]);
    this.medicineSearch = '';
  }

  isValid(): boolean {
    return !!(this.selectedMedicine() && this.form.batchNumber && this.form.qty > 0 &&
      this.form.expiryDate && this.form.purchasePriceRs >= 0 && this.form.sellingPriceRs >= 0);
  }

  marginPercent(): number {
    if (!this.form.purchasePriceRs) return 0;
    return ((this.form.sellingPriceRs - this.form.purchasePriceRs) / this.form.purchasePriceRs) * 100;
  }

  submit(): void {
    if (!this.isValid()) return;
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    const med = this.selectedMedicine()!;
    this.api.addStock({
      medicineId: med.id,
      qty: this.form.qty,
      batchNumber: this.form.batchNumber,
      expiryDate: this.form.expiryDate,
      purchasePricePerUnit: Math.round(this.form.purchasePriceRs * 100),
      sellingPricePerUnit: Math.round(this.form.sellingPriceRs * 100),
      rackId: this.form.rackId || undefined,
      note: this.form.note || undefined
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(`Successfully added ${this.form.qty} bottles of ${med.name} ${med.potency}`);
        this.clearMedicine();
        this.form = { batchNumber: '', manufacturer: '', qty: 0, expiryDate: '', purchasePriceRs: 0, sellingPriceRs: 0, rackId: '', note: '' };
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Failed to add stock');
      }
    });
  }

  goBack(): void { this.router.navigate(['/', ROUTE_PATHS.DASHBOARD]); }
}
