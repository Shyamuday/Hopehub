import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { StoreApiService } from '../../../services/store-api.service';
import { Medicine, MedicineWithStock } from '../../../models/store';
import { PAGE_SIZES } from '../../../core/constants/store/pagination.constants';
import {
  CUSTOM_POTENCY_VALUE,
  MEDICINE_CATEGORIES,
  MEDICINE_POTENCIES
} from '@hopehub/store-ui';

function emptyMedicineForm() {
  return {
    name: '', shortName: '', alternateName: '', potency: '', customPotency: '',
    category: '', manufacturer: '', minStockLevel: 10, description: ''
  };
}

@Component({
  selector: 'app-medicines-admin',
  imports: [FormField, RouterLink],
  templateUrl: './medicines-admin.component.html',
  styleUrl: './medicines-admin.component.scss'
})
export class MedicinesAdminComponent implements OnInit {
  private api = inject(StoreApiService);

  medicines = signal<MedicineWithStock[]>([]);
  loading = signal(true);
  page = signal(1);
  totalPages = signal(1);

  readonly filterModel = signal({ searchQuery: '', potencyFilter: '' });
  readonly filterForm = form(this.filterModel);

  showModal = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  saveError = signal('');

  potencies = MEDICINE_POTENCIES;
  categories = MEDICINE_CATEGORIES;
  customPotencyValue = CUSTOM_POTENCY_VALUE;

  readonly medicineFormModel = signal(emptyMedicineForm());
  readonly medicineForm = form(this.medicineFormModel);

  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    const filter = this.filterModel();
    this.api.getMedicines({ q: filter.searchQuery, potency: filter.potencyFilter, page: this.page(), pageSize: PAGE_SIZES.MEDICINES_ADMIN }).subscribe({
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
    this.medicineFormModel.set(emptyMedicineForm());
    this.saveError.set('');
    this.showModal.set(true);
  }

  openEdit(m: Medicine): void {
    this.editingId.set(m.id);
    const isKnownPotency = (MEDICINE_POTENCIES as readonly string[]).includes(m.potency);
    this.medicineFormModel.set({
      name: m.name,
      shortName: m.shortName ?? '',
      alternateName: m.alternateName ?? '',
      potency: isKnownPotency ? m.potency : CUSTOM_POTENCY_VALUE,
      customPotency: isKnownPotency ? '' : m.potency,
      category: m.category ?? '',
      manufacturer: m.manufacturer ?? '',
      minStockLevel: m.minStockLevel,
      description: m.description ?? ''
    });
    this.saveError.set('');
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  isFormValid(): boolean {
    const form = this.medicineFormModel();
    return !!(form.name.trim() && (form.potency && form.potency !== CUSTOM_POTENCY_VALUE || form.customPotency.trim()));
  }

  getPotency(): string {
    const form = this.medicineFormModel();
    return form.potency === CUSTOM_POTENCY_VALUE ? form.customPotency : form.potency;
  }

  save(): void {
    if (!this.isFormValid()) return;
    this.saving.set(true);
    this.saveError.set('');
    const form = this.medicineFormModel();

    const payload = {
      name: form.name.trim(),
      shortName: form.shortName || undefined,
      alternateName: form.alternateName || undefined,
      potency: this.getPotency(),
      category: form.category || undefined,
      manufacturer: form.manufacturer || undefined,
      minStockLevel: form.minStockLevel,
      description: form.description || undefined
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
