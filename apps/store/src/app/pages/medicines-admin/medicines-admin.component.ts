import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreApiService } from '../../services/store-api.service';
import { Medicine, MedicineWithStock } from '../../models';

const POTENCIES = ['Q', '3X', '6X', '12X', '6C', '12C', '30C', '200C', '1M', '10M', 'CM', 'LM1'];
const CATEGORIES = ['Plant', 'Mineral', 'Animal', 'Nosode', 'Sarcode', 'Biotherapic', 'Imponderabilia'];

@Component({
  selector: 'app-medicines-admin',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">💊 Medicines</h1>
          <p class="page-sub">Manage your medicine master list</p>
        </div>
        <button class="btn-add" (click)="openModal()">+ Add Medicine</button>
      </div>

      <!-- Search & Filter -->
      <div class="filter-row">
        <input class="input search-input" [(ngModel)]="searchQuery" (ngModelChange)="onSearch()" placeholder="Search medicines..." />
        <select class="input select-sm" [(ngModel)]="potencyFilter" (ngModelChange)="onSearch()">
          <option value="">All Potencies</option>
          @for (p of potencies; track p) { <option [value]="p">{{ p }}</option> }
        </select>
      </div>

      @if (loading()) {
        <div class="loading-state"><div class="spinner-big"></div></div>
      } @else if (medicines().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">💊</div>
          <h3>No medicines found</h3>
          <p>{{ searchQuery ? 'Try a different search term' : 'Add your first medicine to get started' }}</p>
        </div>
      } @else {
        <div class="medicine-table">
          <div class="table-header">
            <span>Medicine</span>
            <span>Potency</span>
            <span>Stock</span>
            <span>Location</span>
            <span>Actions</span>
          </div>
          @for (m of medicines(); track m.id) {
            <div class="table-row" [class.inactive]="!m.isActive">
              <div class="med-cell">
                <div class="med-name">{{ m.name }}</div>
                @if (m.manufacturer) { <div class="med-mfr">{{ m.manufacturer }}</div> }
              </div>
              <div class="td">
                <span class="potency-badge">{{ m.potency }}</span>
              </div>
              <div class="td">
                <span class="stock-num" [class.low]="m.status === 'LOW_STOCK'" [class.zero]="m.status === 'OUT_OF_STOCK'">
                  {{ m.currentQty }}
                </span>
              </div>
              <div class="td">
                @if (m.rack) {
                  <span class="loc-badge">📍 {{ m.rack.locationString }}</span>
                } @else {
                  <span class="no-loc">—</span>
                }
              </div>
              <div class="td actions">
                <a [routerLink]="['/medicine', m.id]" class="btn-sm btn-view">View</a>
                <button class="btn-sm btn-edit" (click)="openEdit(m)">Edit</button>
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination">
            <button [disabled]="page() === 1" (click)="changePage(page() - 1)">←</button>
            <span>{{ page() }} / {{ totalPages() }}</span>
            <button [disabled]="page() === totalPages()" (click)="changePage(page() + 1)">→</button>
          </div>
        }
      }
    </div>

    <!-- Add/Edit Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingId() ? 'Edit Medicine' : 'Add Medicine' }}</h2>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group span2">
                <label>Medicine Name *</label>
                <input class="input" [(ngModel)]="form.name" placeholder="e.g. Arsenicum Album" />
              </div>
              <div class="form-group">
                <label>Short Name</label>
                <input class="input" [(ngModel)]="form.shortName" placeholder="e.g. Ars Alb" />
              </div>
              <div class="form-group">
                <label>Alternate Name</label>
                <input class="input" [(ngModel)]="form.alternateName" placeholder="Other names" />
              </div>
              <div class="form-group">
                <label>Potency *</label>
                <select class="input" [(ngModel)]="form.potency">
                  <option value="">Select potency</option>
                  @for (p of potencies; track p) { <option [value]="p">{{ p }}</option> }
                  <option value="custom">Custom...</option>
                </select>
                @if (form.potency === 'custom') {
                  <input class="input" style="margin-top: 8px;" [(ngModel)]="form.customPotency" placeholder="Enter custom potency" />
                }
              </div>
              <div class="form-group">
                <label>Category</label>
                <select class="input" [(ngModel)]="form.category">
                  <option value="">Select category</option>
                  @for (c of categories; track c) { <option [value]="c">{{ c }}</option> }
                </select>
              </div>
              <div class="form-group">
                <label>Manufacturer</label>
                <input class="input" [(ngModel)]="form.manufacturer" placeholder="e.g. SBL, Reckeweg" />
              </div>
              <div class="form-group">
                <label>Min Stock Level</label>
                <input class="input" type="number" [(ngModel)]="form.minStockLevel" min="0" placeholder="10" />
              </div>
              <div class="form-group span2">
                <label>Description</label>
                <input class="input" [(ngModel)]="form.description" placeholder="Optional notes about this medicine" />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-cancel" (click)="closeModal()">Cancel</button>
            <button class="btn-save" [disabled]="!isFormValid() || saving()" (click)="save()">
              @if (saving()) { <span class="btn-spinner"></span> } @else { {{ editingId() ? 'Save Changes' : 'Add Medicine' }} }
            </button>
          </div>

          @if (saveError()) { <div class="save-error">⚠️ {{ saveError() }}</div> }
        </div>
      </div>
    }
  `,
  styles: [`
    .page {
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
      color: white;
    }

    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 20px;

      .page-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
      .page-sub { font-size: 14px; color: #64748b; margin: 0; }
    }

    .btn-add {
      padding: 10px 20px; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #0891b2, #0e7490);
      color: white; font-size: 14px; font-weight: 700; cursor: pointer;
      white-space: nowrap; transition: all 0.2s;
      &:hover { box-shadow: 0 4px 16px rgba(8,145,178,0.4); }
    }

    .filter-row {
      display: flex; gap: 12px; margin-bottom: 16px;
      .search-input { flex: 1; }
      .select-sm { width: 160px; flex-shrink: 0; }
    }

    .input {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 12px 14px; color: white; font-size: 14px;
      width: 100%; box-sizing: border-box; transition: all 0.2s;
      &::placeholder { color: #475569; }
      &:focus { outline: none; border-color: #0891b2; }
      option { background: #132238; color: white; }
    }

    .loading-state { text-align: center; padding: 60px 20px; }
    .spinner-big { width: 40px; height: 40px; border: 3px solid rgba(8,145,178,0.2); border-top-color: #0891b2; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      text-align: center; padding: 60px 20px;
      .empty-icon { font-size: 48px; margin-bottom: 16px; }
      h3 { color: white; font-size: 18px; margin: 0 0 8px; }
      p { color: #64748b; font-size: 14px; margin: 0; }
    }

    .medicine-table { border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.07); }

    .table-header {
      display: grid; grid-template-columns: 2fr 100px 80px 120px 140px;
      background: rgba(255,255,255,0.04); padding: 12px 16px;
      font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;

      @media (max-width: 640px) { display: none; }
    }

    .table-row {
      display: grid; grid-template-columns: 2fr 100px 80px 120px 140px;
      padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.05);
      align-items: center; transition: all 0.15s;

      &:hover { background: rgba(255,255,255,0.03); }
      &.inactive { opacity: 0.5; }

      @media (max-width: 640px) {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto;
        gap: 8px;
      }
    }

    .med-cell { .med-name { font-size: 14px; font-weight: 700; color: white; margin-bottom: 2px; } .med-mfr { font-size: 12px; color: #64748b; } }
    .td { font-size: 14px; }
    .potency-badge { padding: 3px 10px; border-radius: 8px; background: rgba(8,145,178,0.15); color: #06b6d4; font-size: 12px; font-weight: 700; }
    .stock-num { font-size: 15px; font-weight: 800; color: #4ade80; &.low { color: #f97316; } &.zero { color: #f87171; } }
    .loc-badge { font-size: 12px; color: #94a3b8; }
    .no-loc { color: #475569; }
    .actions { display: flex; gap: 6px; }
    .btn-sm { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer; text-decoration: none; transition: all 0.15s; border: 1px solid transparent; }
    .btn-view { background: rgba(8,145,178,0.1); color: #06b6d4; border-color: rgba(8,145,178,0.2); &:hover { background: rgba(8,145,178,0.2); } }
    .btn-edit { background: rgba(234,179,8,0.1); color: #facc15; border-color: rgba(234,179,8,0.2); &:hover { background: rgba(234,179,8,0.2); } }

    .pagination { display: flex; align-items: center; gap: 12px; justify-content: center; margin-top: 20px; font-size: 14px; color: #64748b; button { padding: 8px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #94a3b8; cursor: pointer; &:disabled { opacity: 0.4; cursor: not-allowed; } &:hover:not(:disabled) { background: rgba(255,255,255,0.06); } } }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal {
      background: #0f1f35; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px; width: 100%; max-width: 560px;
      max-height: 90vh; overflow-y: auto; animation: slideUp 0.25s ease;
    }

    @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 0; h2 { font-size: 18px; font-weight: 800; color: white; margin: 0; } }
    .close-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #64748b; cursor: pointer; &:hover { color: white; } }

    .modal-body { padding: 20px 24px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; label { font-size: 13px; font-weight: 600; color: #94a3b8; } &.span2 { grid-column: span 2; } }

    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 0 24px 20px; }
    .btn-cancel { padding: 12px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #94a3b8; cursor: pointer; font-size: 14px; &:hover { background: rgba(255,255,255,0.06); } }
    .btn-save { padding: 12px 24px; border-radius: 12px; border: none; background: linear-gradient(135deg, #0891b2, #0e7490); color: white; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; &:disabled { opacity: 0.5; cursor: not-allowed; } }
    .btn-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
    .save-error { margin: 0 24px 16px; padding: 10px 14px; border-radius: 10px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #f87171; font-size: 13px; }
  `]
})
export class MedicinesAdminComponent implements OnInit {
  private api = inject(StoreApiService);

  medicines = signal<MedicineWithStock[]>([]);
  loading = signal(true);
  searchQuery = '';
  potencyFilter = '';
  page = signal(1);
  totalPages = signal(1);

  showModal = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  saveError = signal('');

  potencies = POTENCIES;
  categories = CATEGORIES;

  form = {
    name: '', shortName: '', alternateName: '', potency: '', customPotency: '',
    category: '', manufacturer: '', minStockLevel: 10, description: ''
  };

  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getMedicines({ q: this.searchQuery, potency: this.potencyFilter, page: this.page(), pageSize: 20 }).subscribe({
      next: (res) => {
        this.medicines.set(res.medicines);
        this.totalPages.set(res.pagination.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.page.set(1); this.load(); }, 300);
  }

  changePage(p: number): void { this.page.set(p); this.load(); }

  openModal(): void {
    this.editingId.set(null);
    this.form = { name: '', shortName: '', alternateName: '', potency: '', customPotency: '', category: '', manufacturer: '', minStockLevel: 10, description: '' };
    this.saveError.set('');
    this.showModal.set(true);
  }

  openEdit(m: Medicine): void {
    this.editingId.set(m.id);
    this.form = { name: m.name, shortName: m.shortName ?? '', alternateName: m.alternateName ?? '', potency: POTENCIES.includes(m.potency) ? m.potency : 'custom', customPotency: POTENCIES.includes(m.potency) ? '' : m.potency, category: m.category ?? '', manufacturer: m.manufacturer ?? '', minStockLevel: m.minStockLevel, description: m.description ?? '' };
    this.saveError.set('');
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  isFormValid(): boolean {
    return !!(this.form.name.trim() && (this.form.potency && this.form.potency !== 'custom' || this.form.customPotency.trim()));
  }

  getPotency(): string { return this.form.potency === 'custom' ? this.form.customPotency : this.form.potency; }

  save(): void {
    if (!this.isFormValid()) return;
    this.saving.set(true);
    this.saveError.set('');

    const payload = {
      name: this.form.name.trim(),
      shortName: this.form.shortName || undefined,
      alternateName: this.form.alternateName || undefined,
      potency: this.getPotency(),
      category: this.form.category || undefined,
      manufacturer: this.form.manufacturer || undefined,
      minStockLevel: this.form.minStockLevel,
      description: this.form.description || undefined
    };

    const req = this.editingId()
      ? this.api.updateMedicine(this.editingId()!, payload)
      : this.api.createMedicine(payload);

    req.subscribe({
      next: () => { this.saving.set(false); this.closeModal(); this.load(); },
      error: (err) => { this.saving.set(false); this.saveError.set(err.error?.message || 'Failed to save'); }
    });
  }
}
