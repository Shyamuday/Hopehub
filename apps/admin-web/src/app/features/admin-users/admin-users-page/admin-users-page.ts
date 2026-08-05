import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../../core/services/admin-api';
import { TOAST_DURATION_MS } from '../../../core/constants/timing.constants';

function emptyAdminForm() {
  return { name: '', email: '', password: '', mobile: '' };
}

@Component({
  selector: 'app-admin-users-page',
  imports: [FormField, FormsModule, DatePipe],
  templateUrl: './admin-users-page.html',
  styleUrl: './admin-users-page.scss',
})
export class AdminUsersPage implements OnInit {
  private api = inject(AdminApi);

  users = signal<any[]>([]);
  admins = signal<any[]>([]);
  roles = signal<string[]>([]);
  roleCounts = signal<Array<{ role: string; count: number }>>([]);
  pagination = signal({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  loading = signal(true);
  usersLoading = signal(true);
  saving = signal(false);
  userUpdating = signal('');
  modal = signal(false);
  error = signal('');
  usersError = signal('');
  toast = signal('');
  search = signal('');
  selectedRole = signal('');
  selectedStatus = signal('');
  sortBy = signal('createdAt');
  sortDirection = signal('desc');
  readonly totalUsers = computed(() => this.pagination().total);

  readonly draftModel = signal(emptyAdminForm());
  readonly draftForm = form(this.draftModel);

  ngOnInit(): void {
    void Promise.all([this.loadUsers(), this.load()]);
  }

  async loadUsers(page = this.pagination().page) {
    this.usersLoading.set(true);
    this.usersError.set('');
    try {
      const response = await this.api.getUsers({
        q: this.search().trim(),
        role: this.selectedRole(),
        status: this.selectedStatus(),
        page,
        pageSize: this.pagination().pageSize,
        sortBy: this.sortBy(),
        sortDirection: this.sortDirection(),
      });
      this.users.set(response.users);
      this.roles.set(response.filters.roles);
      this.roleCounts.set(response.summary.roleCounts);
      this.pagination.set(response.pagination);
    } catch {
      this.usersError.set('Could not load all users.');
    } finally {
      this.usersLoading.set(false);
    }
  }

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

  applyFilters() {
    void this.loadUsers(1);
  }

  resetFilters() {
    this.search.set('');
    this.selectedRole.set('');
    this.selectedStatus.set('');
    this.sortBy.set('createdAt');
    this.sortDirection.set('desc');
    void this.loadUsers(1);
  }

  goToPage(direction: -1 | 1) {
    const nextPage = this.pagination().page + direction;
    if (nextPage < 1 || nextPage > this.pagination().totalPages) return;
    void this.loadUsers(nextPage);
  }

  roleCount(role: string) {
    return this.roleCounts().find((row) => row.role === role)?.count ?? 0;
  }

  openCreate() {
    this.draftModel.set(emptyAdminForm());
    this.error.set('');
    this.modal.set(true);
  }

  closeModal() {
    this.modal.set(false);
  }

  async create() {
    const form = this.draftModel();
    if (!form.name || !form.email || !form.password) {
      this.error.set('Name, email, and password are required.');
      return;
    }
    this.saving.set(true);
    try {
      await this.api.createAdmin({
        name: form.name,
        email: form.email,
        password: form.password,
        mobile: form.mobile || undefined,
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
      this.admins.update((list) =>
        list.map((row) => (row.id === admin.id ? { ...row, isActive: !admin.isActive } : row)),
      );
      this.users.update((list) =>
        list.map((row) => (row.id === admin.id ? { ...row, isActive: !admin.isActive } : row)),
      );
      this.showToast(`${admin.name} ${admin.isActive ? 'deactivated' : 'activated'}.`);
    } catch (e: any) {
      this.showToast(e?.error?.message || 'Could not update status.');
    }
  }

  async changeUserRole(user: any, role: string) {
    if (!role || role === user.role) return;
    const previousRole = user.role;
    this.userUpdating.set(user.id);
    this.users.update((list) => list.map((row) => (row.id === user.id ? { ...row, role } : row)));
    try {
      const response = await this.api.setUserRole(user.id, role);
      this.users.update((list) =>
        list.map((row) => (row.id === user.id ? { ...row, ...response.user } : row)),
      );
      await this.load();
      await this.loadUsers(this.pagination().page);
      this.showToast(`${user.name} role updated to ${role}.`);
    } catch (e: any) {
      this.users.update((list) =>
        list.map((row) => (row.id === user.id ? { ...row, role: previousRole } : row)),
      );
      this.showToast(e?.error?.message || 'Could not update user role.');
    } finally {
      this.userUpdating.set('');
    }
  }

  async toggleUserStatus(user: any) {
    const nextStatus = !user.isActive;
    this.userUpdating.set(user.id);
    try {
      const response = await this.api.setUserStatus(user.id, nextStatus);
      this.users.update((list) =>
        list.map((row) => (row.id === user.id ? { ...row, ...response.user } : row)),
      );
      if (response.user.role === 'ADMIN') await this.load();
      this.showToast(`${user.name} ${nextStatus ? 'activated' : 'deactivated'}.`);
    } catch (e: any) {
      this.showToast(e?.error?.message || 'Could not update user status.');
    } finally {
      this.userUpdating.set('');
    }
  }

  private showToast(msg: string) {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
