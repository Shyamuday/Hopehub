import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StoreApiService } from '../../services/store-api.service';
import { Medicine, MedicineWithStock } from '../../models';
import { PAGE_SIZES } from '../../core/constants/pagination.constants';
import {
  CUSTOM_POTENCY_VALUE,
  MEDICINE_CATEGORIES,
  MEDICINE_POTENCIES
} from '../../shared/constants/medicine-form.constants';

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
                  <option [value]="customPotencyValue">Custom...</option>
                </select>
                @if (form.potency === customPotencyValue) {
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
  styleUrl: './medicines-admin.component.scss'
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

  potencies = MEDICINE_POTENCIES;
  categories = MEDICINE_CATEGORIES;
  customPotencyValue = CUSTOM_POTENCY_VALUE;

  form = {
    name: '', shortName: '', alternateName: '', potency: '', customPotency: '',
    category: '', manufacturer: '', minStockLevel: 10, description: ''
  };

  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getMedicines({ q: this.searchQuery, potency: this.potencyFilter, page: this.page(), pageSize: PAGE_SIZES.MEDICINES_ADMIN }).subscribe({
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
    const isKnownPotency = (MEDICINE_POTENCIES as readonly string[]).includes(m.potency);
    this.form = { name: m.name, shortName: m.shortName ?? '', alternateName: m.alternateName ?? '', potency: isKnownPotency ? m.potency : CUSTOM_POTENCY_VALUE, customPotency: isKnownPotency ? '' : m.potency, category: m.category ?? '', manufacturer: m.manufacturer ?? '', minStockLevel: m.minStockLevel, description: m.description ?? '' };
    this.saveError.set('');
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  isFormValid(): boolean {
    return !!(this.form.name.trim() && (this.form.potency && this.form.potency !== CUSTOM_POTENCY_VALUE || this.form.customPotency.trim()));
  }

  getPotency(): string { return this.form.potency === CUSTOM_POTENCY_VALUE ? this.form.customPotency : this.form.potency; }

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
