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
  templateUrl: './medicines-admin.component.html',
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
