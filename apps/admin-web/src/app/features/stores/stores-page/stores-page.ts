import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import {
  STORE_APP_PORT,
  STORE_FORM_DEFAULTS,
  STORE_MODAL_TYPES,
  STORE_STATUS_COLORS,
  STORE_VALIDATION,
  type StoreModalType
} from '../constants/store-form.constants';

@Component({
  selector: 'app-stores-page',
  imports: [FormsModule],
  templateUrl: './stores-page.html',
  styleUrl: './stores-page.scss'
})
export class StoresPage implements OnInit {
  private api = inject(AdminApi);

  readonly storeAppPort = STORE_APP_PORT;
  readonly storeStatusColors = STORE_STATUS_COLORS;

  stores = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  modal = signal<StoreModalType | null>(null);
  selectedStore = signal<any>(null);
  err = signal('');
  toast = signal('');

  storeForm = { name:'', code:'', address:'', phone:'' };
  mgrForm = { name:'', email:'', password:'', designation: STORE_FORM_DEFAULTS.MANAGER_DESIGNATION, joiningDate:'' };
  staffForm = { name:'', staffCode:'', pin:'', designation: STORE_FORM_DEFAULTS.STAFF_DESIGNATION, phone:'', joiningDate:'' };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getAdminStores()
      .then(r => { this.stores.set(r.stores); this.loading.set(false); })
      .catch(() => this.loading.set(false));
  }

  openModal(m: StoreModalType): void { this.err.set(''); this.modal.set(m); }
  openManagerModal(s: any): void {
    this.selectedStore.set(s);
    this.mgrForm = { name:'', email:'', password:'', designation: STORE_FORM_DEFAULTS.MANAGER_DESIGNATION, joiningDate:'' };
    this.err.set('');
    this.modal.set(STORE_MODAL_TYPES.MANAGER);
  }
  openStaffModal(s: any): void {
    this.selectedStore.set(s);
    this.staffForm = { name:'', staffCode:'', pin:'', designation: STORE_FORM_DEFAULTS.STAFF_DESIGNATION, phone:'', joiningDate:'' };
    this.err.set('');
    this.modal.set(STORE_MODAL_TYPES.STAFF);
  }
  closeModal(): void { this.modal.set(null); this.err.set(''); }

  async saveStore(): Promise<void> {
    if (!this.storeForm.name || !this.storeForm.code) { this.err.set('Name and code required'); return; }
    this.saving.set(true);
    try {
      const r = await this.api.createAdminStore(this.storeForm);
      this.stores.update(list => [...list, { ...r.store, _count:{ staff:0 }, staff:[] }]);
      this.modal.set(null);
      this.showToast(`Store "${r.store.name}" created`);
    } catch (e: any) { this.err.set(e?.error?.error ?? 'Failed'); }
    finally { this.saving.set(false); }
  }

  async saveManager(): Promise<void> {
    if (!this.mgrForm.name || !this.mgrForm.email || !this.mgrForm.password) { this.err.set('Name, email and password required'); return; }
    if (this.mgrForm.password.length < STORE_VALIDATION.PASSWORD_MIN_LENGTH) { this.err.set('Password must be 6+ characters'); return; }
    this.saving.set(true);
    try {
      await this.api.createAdminManager(this.selectedStore()!.id, this.mgrForm);
      this.modal.set(null);
      this.showToast(`Manager "${this.mgrForm.name}" added`);
      this.load();
    } catch (e: any) { this.err.set(e?.error?.error ?? 'Failed'); }
    finally { this.saving.set(false); }
  }

  async saveStaff(): Promise<void> {
    if (!this.staffForm.name || !this.staffForm.staffCode || !this.staffForm.pin) { this.err.set('Name, code and PIN required'); return; }
    if (this.staffForm.pin.length < STORE_VALIDATION.PIN_MIN_LENGTH) { this.err.set('PIN must be 4+ digits'); return; }
    this.saving.set(true);
    try {
      await this.api.createAdminStoreStaff(this.selectedStore()!.id, this.staffForm);
      this.modal.set(null);
      this.showToast(`Staff "${this.staffForm.name}" added`);
      this.load();
    } catch (e: any) { this.err.set(e?.error?.error ?? 'Failed'); }
    finally { this.saving.set(false); }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
