import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';

@Component({
  selector: 'app-admin-users-page',
  imports: [FormsModule],
  templateUrl: './admin-users-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './admin-users-page.scss'
})
export class AdminUsersPage implements OnInit {
  private api = inject(AdminApi);

  admins = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  modal = signal(false);
  error = signal('');
  toast = signal('');
  form = { name: '', email: '', password: '', mobile: '' };

  ngOnInit(): void { void this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const response = await this.api.getAdmins();
      this.admins.set(response.admins);
    } catch {
      this.error.set('Could not load admin users.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate() {
    this.form = { name: '', email: '', password: '', mobile: '' };
    this.error.set('');
    this.modal.set(true);
  }

  closeModal() { this.modal.set(false); }

  async create() {
    if (!this.form.name || !this.form.email || !this.form.password) {
      this.error.set('Name, email, and password are required.');
      return;
    }
    this.saving.set(true);
    try {
      await this.api.createAdmin({
        name: this.form.name,
        email: this.form.email,
        password: this.form.password,
        mobile: this.form.mobile || undefined
      });
      this.modal.set(false);
      this.showToast('Admin user created.');
      await this.load();
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Could not create admin.');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleStatus(admin: any) {
    try {
      await this.api.setAdminStatus(admin.id, !admin.isActive);
      this.admins.update(list => list.map(row => row.id === admin.id ? { ...row, isActive: !admin.isActive } : row));
      this.showToast(`${admin.name} ${admin.isActive ? 'deactivated' : 'activated'}.`);
    } catch (e: any) {
      this.showToast(e?.error?.message || 'Could not update status.');
    }
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
