import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { HrApiService } from '../../services/hr-api.service';
import { StoreInfo } from '../../models';
import { TOAST_DURATION_MS } from '../../core/constants/timing.constants';

function emptyStoreForm() {
  return { name: '', code: '', address: '', phone: '' };
}

function emptyManagerForm() {
  return { name: '', email: '', password: '', designation: 'Store Manager', joiningDate: '' };
}

function emptyStaffForm() {
  return {
    name: '',
    staffCode: '',
    email: '',
    password: '',
    designation: 'Store Assistant',
    phone: '',
    joiningDate: ''
  };
}

@Component({
  selector: 'app-stores',
  imports: [FormField],
  templateUrl: './stores.component.html',
  styleUrl: './stores.component.scss'
})
export class StoresComponent implements OnInit {
  private api = inject(HrApiService);

  stores = signal<StoreInfo[]>([]);
  loading = signal(true);
  saving = signal(false);
  modal = signal<'store' | 'manager' | 'staff' | null>(null);
  selectedStore = signal<StoreInfo | null>(null);
  error = signal('');
  toast = signal('');

  readonly storeFormModel = signal(emptyStoreForm());
  readonly storeForm = form(this.storeFormModel);
  readonly managerFormModel = signal(emptyManagerForm());
  readonly managerForm = form(this.managerFormModel);
  readonly staffFormModel = signal(emptyStaffForm());
  readonly staffForm = form(this.staffFormModel);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getStores().subscribe({
      next: (r) => { this.stores.set(r.stores); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  managerCount(store: StoreInfo): number {
    return (store.staff ?? []).length;
  }

  openCreateStore(): void {
    this.storeFormModel.set(emptyStoreForm());
    this.error.set('');
    this.modal.set('store');
  }

  openCreateManager(store: StoreInfo): void {
    this.selectedStore.set(store);
    this.managerFormModel.set(emptyManagerForm());
    this.error.set('');
    this.modal.set('manager');
  }

  openCreateStaff(store: StoreInfo): void {
    this.selectedStore.set(store);
    this.staffFormModel.set(emptyStaffForm());
    this.error.set('');
    this.modal.set('staff');
  }

  closeModal(): void { this.modal.set(null); this.error.set(''); }

  saveStore(): void {
    const f = this.storeFormModel();
    if (!f.name || !f.code) { this.error.set('Name and code are required'); return; }
    this.saving.set(true);
    this.error.set('');
    this.api.createStore(f).subscribe({
      next: (r) => {
        this.stores.update(list => [...list, { ...r.store, _count: { staff: 0 }, staff: [] }]);
        this.saving.set(false);
        this.modal.set(null);
        this.showToast(`Store "${r.store.name}" created`);
      },
      error: (e) => { this.error.set(e?.error?.error ?? 'Failed to create store'); this.saving.set(false); }
    });
  }

  saveManager(): void {
    const f = this.managerFormModel();
    if (!f.name || !f.email || !f.password) {
      this.error.set('Name, email and password are required'); return;
    }
    if (f.password.length < 6) { this.error.set('Password must be at least 6 characters'); return; }
    this.saving.set(true);
    this.error.set('');
    this.api.createManager(this.selectedStore()!.id, f).subscribe({
      next: (r) => {
        this.load();
        this.saving.set(false);
        this.modal.set(null);
        this.showToast(`Manager "${r.staff.name}" created`);
      },
      error: (e) => { this.error.set(e?.error?.error ?? 'Failed to create manager'); this.saving.set(false); }
    });
  }

  saveStaff(): void {
    const f = this.staffFormModel();
    if (!f.name || !f.staffCode || !f.email || !f.password) {
      this.error.set('Name, staff code, email, and password are required'); return;
    }
    if (f.password.length < 8) { this.error.set('Password must be at least 8 characters'); return; }
    this.saving.set(true);
    this.error.set('');
    this.api.createStoreStaff(this.selectedStore()!.id, f).subscribe({
      next: (r) => {
        this.load();
        this.saving.set(false);
        this.modal.set(null);
        this.showToast(`Staff "${r.staff.name}" added to ${this.selectedStore()?.name}`);
      },
      error: (e) => { this.error.set(e?.error?.error ?? 'Failed to create staff'); this.saving.set(false); }
    });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
