import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ADMIN_PERMISSIONS,
  PERMISSION_GROUPS,
  staffHasAllPermissions
} from '../../../core/admin-permissions';
import { AdminAuth } from '../../../core/services/admin-auth';
import { AdminApi } from '../../../core/services/admin-api';

type StaffRow = {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  isActive?: boolean;
  staffProfile: { isSuperAdmin: boolean; permissionCodes: string[] } | null;
};

type PresetRow = {
  id: string;
  label: string;
  summary: string;
  cluster: string;
  permissionCodes: string[];
};

type PermissionOption = { code: string; label: string };

@Component({
  selector: 'app-staff-page',
  imports: [FormsModule],
  templateUrl: './staff-page.html',
  styleUrl: './staff-page.scss'
})
export class StaffPage {
  private readonly api = inject(AdminApi);
  readonly auth = inject(AdminAuth);

  staff = signal<StaffRow[]>([]);
  presets = signal<PresetRow[]>([]);
  permissionOptions = signal<PermissionOption[]>([]);
  clusters = signal<Record<string, string>>({});
  governance = signal<Record<string, string>>({});
  loading = signal(true);
  loadError = signal('');

  editingId = signal('');
  draftSuper = signal(false);
  draftCodes = signal<Set<string>>(new Set());
  selectedPresetId = signal('');
  saveError = signal('');
  saving = signal(false);

  readonly permissionGroups = PERMISSION_GROUPS;

  constructor() {
    void this.load();
  }

  canWrite() {
    return staffHasAllPermissions(this.auth.user(), ADMIN_PERMISSIONS.STAFF_WRITE);
  }

  async load() {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const [presetRes, staffRes] = await Promise.all([
        this.api.getPermissionPresets(),
        this.api.getStaff()
      ]);
      this.presets.set(presetRes.presets || []);
      this.clusters.set(presetRes.clusters || {});
      this.governance.set(presetRes.governance || {});
      this.permissionOptions.set(presetRes.permissions || []);
      this.staff.set(staffRes.staff || []);
    } catch {
      this.loadError.set(
        'Could not load staff. You need admin.staff.read (admin or HR with permission).'
      );
    } finally {
      this.loading.set(false);
    }
  }

  clusterLabel(key: string) {
    return this.clusters()[key] || key;
  }

  labelForCode(code: string) {
    return this.permissionOptions().find((p) => p.code === code)?.label ?? code;
  }

  startEdit(row: StaffRow) {
    if (!this.canWrite()) return;
    this.editingId.set(row.id);
    const sp = row.staffProfile;
    this.draftSuper.set(sp?.isSuperAdmin ?? false);
    this.draftCodes.set(new Set(sp?.permissionCodes ?? []));
    this.selectedPresetId.set('');
    this.saveError.set('');
  }

  cancelEdit() {
    this.editingId.set('');
    this.draftSuper.set(false);
    this.draftCodes.set(new Set());
    this.selectedPresetId.set('');
    this.saveError.set('');
  }

  toggleCode(code: string, checked: boolean) {
    this.draftCodes.update((set) => {
      const next = new Set(set);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  isCodeChecked(code: string) {
    return this.draftCodes().has(code);
  }

  applyPreset() {
    const id = this.selectedPresetId();
    if (!id) return;
    const preset = this.presets().find((p) => p.id === id);
    if (!preset) return;
    this.draftCodes.set(new Set(preset.permissionCodes));
  }

  async save() {
    const id = this.editingId();
    if (!id || !this.canWrite()) return;
    this.saving.set(true);
    this.saveError.set('');
    try {
      await this.api.updateStaff(id, {
        isSuperAdmin: this.draftSuper(),
        permissionCodes: [...this.draftCodes()].sort()
      });
      await this.load();
      this.cancelEdit();
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'error' in e
          ? (e as { error?: { message?: string } }).error?.message
          : undefined;
      this.saveError.set(msg || 'Could not save permissions.');
    } finally {
      this.saving.set(false);
    }
  }

  formatCodes(row: StaffRow) {
    const sp = row.staffProfile;
    if (!sp) return '— (legacy full access until profile saved)';
    if (sp.isSuperAdmin) return 'Super admin';
    if (!sp.permissionCodes.length) return 'No permissions assigned';
    return sp.permissionCodes.sort().join(', ');
  }
}
