import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';

@Component({
  selector: 'app-suppliers-page',
  imports: [FormsModule],
  templateUrl: './suppliers-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './suppliers-page.scss'
})
export class SuppliersPage implements OnInit {
  private api = inject(AdminApi);

  suppliers = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  modal = signal<'create' | 'edit' | null>(null);
  selected = signal<any>(null);
  error = signal('');
  toast = signal('');
  form = { code: '', name: '', email: '', phone: '', address: '', gstin: '', isActive: true };

  ngOnInit(): void { void this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const response = await this.api.listSuppliers(true);
      this.suppliers.set(response.suppliers);
    } catch {
      this.error.set('Could not load suppliers.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.form = { code: '', name: '', email: '', phone: '', address: '', gstin: '', isActive: true };
    this.error.set('');
    this.modal.set('create');
  }

  openEdit(supplier: any) {
    this.selected.set(supplier);
    this.form = {
      code: supplier.code,
      name: supplier.name,
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      gstin: supplier.gstin || '',
      isActive: supplier.isActive !== false
    };
    this.error.set('');
    this.modal.set('edit');
  }

  closeModal() { this.modal.set(null); }

  async save() {
    if (!this.form.name || (!this.form.code && this.modal() === 'create')) {
      this.error.set('Code and name are required.');
      return;
    }
    this.saving.set(true);
    try {
      if (this.modal() === 'create') {
        await this.api.createSupplier(this.form);
        this.showToast('Supplier created.');
      } else {
        await this.api.updateSupplier(this.selected()!.id, {
          name: this.form.name,
          email: this.form.email,
          phone: this.form.phone,
          address: this.form.address,
          gstin: this.form.gstin,
          isActive: this.form.isActive
        });
        this.showToast('Supplier updated.');
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
