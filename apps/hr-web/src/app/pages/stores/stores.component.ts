import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HrApiService } from '../../services/hr-api.service';
import { StoreInfo } from '../../models';
import { TOAST_DURATION_MS } from '../../core/constants/timing.constants';

@Component({
  selector: 'app-stores',
  imports: [FormsModule],
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

  storeForm = { name: '', code: '', address: '', phone: '' };
  managerForm = { name: '', email: '', password: '', designation: 'Store Manager', joiningDate: '' };
  staffForm = { name: '', staffCode: '', pin: '', designation: 'Store Assistant', phone: '', joiningDate: '' };

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
    this.storeForm = { name: '', code: '', address: '', phone: '' };
    this.error.set('');
    this.modal.set('store');
  }

  openCreateManager(store: StoreInfo): void {
    this.selectedStore.set(store);
    this.managerForm = { name: '', email: '', password: '', designation: 'Store Manager', joiningDate: '' };
    this.error.set('');
    this.modal.set('manager');
  }

  openCreateStaff(store: StoreInfo): void {
    this.selectedStore.set(store);
    this.staffForm = { name: '', staffCode: '', pin: '', designation: 'Store Assistant', phone: '', joiningDate: '' };
    this.error.set('');
    this.modal.set('staff');
  }

  closeModal(): void { this.modal.set(null); this.error.set(''); }

  saveStore(): void {
    if (!this.storeForm.name || !this.storeForm.code) { this.error.set('Name and code are required'); return; }
    this.saving.set(true);
    this.error.set('');
    this.api.createStore(this.storeForm).subscribe({
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
    if (!this.managerForm.name || !this.managerForm.email || !this.managerForm.password) {
      this.error.set('Name, email and password are required'); return;
    }
    if (this.managerForm.password.length < 6) { this.error.set('Password must be at least 6 characters'); return; }
    this.saving.set(true);
    this.error.set('');
    this.api.createManager(this.selectedStore()!.id, this.managerForm).subscribe({
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
    if (!this.staffForm.name || !this.staffForm.staffCode || !this.staffForm.pin) {
      this.error.set('Name, staff code and PIN are required'); return;
    }
    if (this.staffForm.pin.length < 4) { this.error.set('PIN must be at least 4 digits'); return; }
    this.saving.set(true);
    this.error.set('');
    this.api.createStoreStaff(this.selectedStore()!.id, this.staffForm).subscribe({
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
