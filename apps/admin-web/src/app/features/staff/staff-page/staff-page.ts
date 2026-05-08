import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ADMIN_PERMISSIONS, adminHasAllPermissions } from '../../../core/admin-permissions';
import { AdminAuth } from '../../../core/services/admin-auth';
import { AdminApi } from '../../../core/services/admin-api';

type StaffRow = {
  id: string;
  name: string;
  email?: string | null;
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

@Component({
  selector: 'app-staff-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './staff-page.html',
  styleUrl: './staff-page.scss'
})
export class StaffPage {
  staff: StaffRow[] = [];
  presets: PresetRow[] = [];
  clusters: Record<string, string> = {};
  governance: Record<string, string> = {};
  loading = true;
  loadError = '';

  editingId = '';
  draftSuper = false;
  draftCodes = '';
  selectedPresetId = '';
  saveError = '';
  saving = false;

  constructor(
    private readonly api: AdminApi,
    readonly auth: AdminAuth
  ) {
    void this.load();
  }

  canWrite() {
    return adminHasAllPermissions(this.auth.user(), ADMIN_PERMISSIONS.STAFF_WRITE);
  }

  async load() {
    this.loading = true;
    this.loadError = '';
    try {
      const [presetRes, staffRes] = await Promise.all([this.api.getPermissionPresets(), this.api.getStaff()]);
      this.presets = presetRes.presets || [];
      this.clusters = presetRes.clusters || {};
      this.governance = presetRes.governance || {};
      this.staff = staffRes.staff || [];
    } catch {
      this.loadError =
        'Could not load staff or presets. You need admin.staff.read (and a valid admin session).';
    } finally {
      this.loading = false;
    }
  }

  clusterLabel(key: string) {
    return this.clusters[key] || key;
  }

  startEdit(row: StaffRow) {
    if (!this.canWrite()) return;
    this.editingId = row.id;
    const sp = row.staffProfile;
    this.draftSuper = sp?.isSuperAdmin ?? false;
    this.draftCodes = (sp?.permissionCodes ?? []).join('\n');
    this.selectedPresetId = '';
    this.saveError = '';
  }

  cancelEdit() {
    this.editingId = '';
    this.draftSuper = false;
    this.draftCodes = '';
    this.selectedPresetId = '';
    this.saveError = '';
  }

  applyPreset() {
    if (!this.selectedPresetId) return;
    const p = this.presets.find((x) => x.id === this.selectedPresetId);
    if (!p) return;
    this.draftCodes = [...p.permissionCodes].sort().join('\n');
  }

  codesFromDraft(): string[] {
    return this.draftCodes
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async save() {
    if (!this.editingId || !this.canWrite()) return;
    this.saving = true;
    this.saveError = '';
    try {
      const permissionCodes = this.codesFromDraft();
      await this.api.updateStaff(this.editingId, {
        isSuperAdmin: this.draftSuper,
        permissionCodes
      });
      await this.load();
      this.cancelEdit();
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'error' in e
          ? (e as { error?: { message?: string } }).error?.message
          : undefined;
      this.saveError =
        msg ||
        'Could not save. Check admin.staff.write, valid permission codes, and try again.';
    } finally {
      this.saving = false;
    }
  }

  formatCodes(row: StaffRow) {
    const sp = row.staffProfile;
    if (!sp) return '— (legacy full access until profile created)';
    if (sp.isSuperAdmin) return 'Super admin';
    if (!sp.permissionCodes.length) return 'No codes';
    return sp.permissionCodes.sort().join(', ');
  }
}
