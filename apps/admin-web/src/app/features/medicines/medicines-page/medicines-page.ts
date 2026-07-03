import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';

@Component({
  selector: 'app-medicines-page',
  imports: [FormsModule],
  templateUrl: './medicines-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './medicines-page.scss'
})
export class MedicinesPage implements OnInit {
  private api = inject(AdminApi);

  medicines = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  modal = signal<'create' | 'edit' | null>(null);
  selected = signal<any>(null);
  error = signal('');
  toast = signal('');
  q = '';
  form = {
    name: '',
    potency: '30C',
    shortName: '',
    manufacturer: '',
    category: '',
    minStockLevel: 10,
    isActive: true
  };

  ngOnInit(): void { void this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const response = await this.api.listMedicines({ q: this.q, includeInactive: true });
      this.medicines.set(response.medicines);
    } catch {
      this.error.set('Could not load medicines.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.form = { name: '', potency: '30C', shortName: '', manufacturer: '', category: '', minStockLevel: 10, isActive: true };
    this.error.set('');
    this.modal.set('create');
  }

  openEdit(medicine: any) {
    this.selected.set(medicine);
    this.form = {
      name: medicine.name,
      potency: medicine.potency,
      shortName: medicine.shortName || '',
      manufacturer: medicine.manufacturer || '',
      category: medicine.category || '',
      minStockLevel: medicine.minStockLevel ?? 10,
      isActive: medicine.isActive !== false
    };
    this.error.set('');
    this.modal.set('edit');
  }

  closeModal() { this.modal.set(null); }

  async save() {
    if (!this.form.name || !this.form.potency) {
      this.error.set('Name and potency are required.');
      return;
    }
    this.saving.set(true);
    try {
      if (this.modal() === 'create') {
        await this.api.createMedicine(this.form);
        this.showToast('Medicine created.');
      } else {
        await this.api.updateMedicine(this.selected()!.id, this.form);
        this.showToast('Medicine updated.');
      }
      this.modal.set(null);
      await this.load();
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Save failed.');
    } finally {
      this.saving.set(false);
    }
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
