import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_LONG_MS } from '../../../core/constants/timing.constants';
import { HR_USER_DEFAULTS } from '../constants/hr-user-form.constants';

@Component({
  selector: 'app-hr-users',
  imports: [FormsModule],
  templateUrl: './hr-users.html',
  styleUrl: './hr-users.scss'
})
export class HrUsersComponent implements OnInit {
  private api = inject(AdminApi);

  readonly hrUserDefaults = HR_USER_DEFAULTS;

  hrUsers = signal<any[]>([]);
  allStores = signal<any[]>([]);
  assignedStoreIds = signal<Set<string>>(new Set());
  loading = signal(true);
  saving = signal(false);
  modal = signal<'create' | 'assign' | null>(null);
  selectedHr = signal<any>(null);
  error = signal('');
  toast = signal('');

  createForm = {
    name: '',
    email: '',
    password: '',
    designation: HR_USER_DEFAULTS.DESIGNATION,
    department: HR_USER_DEFAULTS.DEPARTMENT
  };

  ngOnInit(): void { this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const r = await this.api.getHrUsers();
      // Load store access for each HR user
      const hrWithAccess = await Promise.all(
        (r.hrUsers as any[]).map(async (u: any) => {
          try {
            const a = await this.api.getHrUserStores(u.id);
            return { ...u, storeAccess: a.assigned };
          } catch { return { ...u, storeAccess: [] }; }
        })
      );
      this.hrUsers.set(hrWithAccess);
    } finally { this.loading.set(false); }
  }

  openCreate(): void {
    this.createForm = {
      name: '',
      email: '',
      password: '',
      designation: HR_USER_DEFAULTS.DESIGNATION,
      department: HR_USER_DEFAULTS.DEPARTMENT
    };
    this.error.set('');
    this.modal.set('create');
  }

  async openAssign(u: any) {
    this.selectedHr.set(u);
    const r = await this.api.getHrUserStores(u.id);
    this.allStores.set(r.all);
    this.assignedStoreIds.set(new Set((r.assigned as any[]).map((s: any) => s.id)));
    this.modal.set('assign');
  }

  closeModal(): void { this.modal.set(null); this.error.set(''); }

  async createHr() {
    if (!this.createForm.name || !this.createForm.email || !this.createForm.password) {
      this.error.set('Name, email and password are required'); return;
    }
    this.saving.set(true);
    try {
      await this.api.createHrUser(this.createForm);
      this.modal.set(null);
      this.showToast(`HR Manager "${this.createForm.name}" created`);
      this.load();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Failed to create HR user');
    } finally { this.saving.set(false); }
  }

  async grantAccess(storeId: string) {
    const hr = this.selectedHr();
    if (!hr) return;
    await this.api.grantHrStoreAccess(hr.id, storeId);
    this.assignedStoreIds.update(set => new Set([...set, storeId]));
    // Update local list
    const store = this.allStores().find(s => s.id === storeId);
    this.hrUsers.update(list => list.map(u =>
      u.id === hr.id ? { ...u, storeAccess: [...(u.storeAccess ?? []), store] } : u
    ));
    this.showToast(`Access granted`);
  }

  async revokeAccess(hr: any, storeId: string) {
    await this.api.revokeHrStoreAccess(hr.id, storeId);
    this.assignedStoreIds.update(set => { const s = new Set(set); s.delete(storeId); return s; });
    this.hrUsers.update(list => list.map(u =>
      u.id === hr.id ? { ...u, storeAccess: (u.storeAccess ?? []).filter((s: any) => s.id !== storeId) } : u
    ));
    this.showToast(`Access revoked`);
  }

  async grantAll() {
    const hr = this.selectedHr();
    if (!hr) return;
    await this.api.grantAllStores(hr.id);
    const all = this.allStores();
    this.assignedStoreIds.set(new Set(all.map(s => s.id)));
    this.hrUsers.update(list => list.map(u => u.id === hr.id ? { ...u, storeAccess: all } : u));
    this.showToast(`All stores granted`);
  }

  async toggleStatus(u: any) {
    await this.api.setHrUserStatus(u.id, !u.isActive);
    this.hrUsers.update(list => list.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
    this.showToast(u.isActive ? 'User deactivated' : 'User activated');
  }

  isAssigned(storeId: string): boolean { return this.assignedStoreIds().has(storeId); }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_LONG_MS);
  }
}
