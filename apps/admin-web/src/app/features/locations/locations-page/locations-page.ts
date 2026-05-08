import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ADMIN_PERMISSIONS, adminHasAllPermissions } from '../../../core/admin-permissions';
import { AdminAuth } from '../../../core/services/admin-auth';
import { AdminApi } from '../../../core/services/admin-api';

export type ClinicLocationRow = {
  id: string;
  name: string;
  slug: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  timezone: string;
  isActive: boolean;
  sortOrder: number;
};

type LocationForm = {
  name: string;
  slug: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  timezone: string;
  isActive: boolean;
  sortOrder: number;
};

@Component({
  selector: 'app-locations-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './locations-page.html',
  styleUrl: './locations-page.scss'
})
export class LocationsPage {
  locations: ClinicLocationRow[] = [];
  loading = false;
  error = '';

  showCreateForm = false;
  newLoc = this.emptyForm();
  creating = false;
  createError = '';

  editingId = '';
  draft = this.emptyForm();
  saving = false;
  saveError = '';

  constructor(private readonly api: AdminApi, readonly auth: AdminAuth) {
    void this.load();
  }

  canWrite() {
    return adminHasAllPermissions(this.auth.user(), ADMIN_PERMISSIONS.LOCATIONS_WRITE);
  }

  private emptyForm(): LocationForm {
    return {
      name: '',
      slug: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      timezone: 'Asia/Kolkata',
      isActive: true,
      sortOrder: 0
    };
  }

  private normalizePayload(f: LocationForm) {
    const slug = f.slug.trim();
    return {
      name: f.name.trim(),
      slug: slug === '' ? null : slug,
      addressLine1: f.addressLine1.trim(),
      addressLine2: f.addressLine2.trim() || null,
      city: f.city.trim() || null,
      state: f.state.trim() || null,
      pincode: f.pincode.trim() || null,
      phone: f.phone.trim() || null,
      timezone: f.timezone.trim() || 'Asia/Kolkata',
      isActive: f.isActive,
      sortOrder: Number(f.sortOrder) || 0
    };
  }

  async load() {
    this.loading = true;
    this.error = '';
    try {
      const res = await this.api.getLocations();
      this.locations = res.locations || [];
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'error' in e
          ? (e as { error?: { message?: string } }).error?.message
          : undefined;
      this.error = msg || 'Could not load clinic locations. You may need admin.locations.read permission.';
    } finally {
      this.loading = false;
    }
  }

  startEdit(row: ClinicLocationRow) {
    this.editingId = row.id;
    this.draft = {
      name: row.name,
      slug: row.slug || '',
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2 || '',
      city: row.city || '',
      state: row.state || '',
      pincode: row.pincode || '',
      phone: row.phone || '',
      timezone: row.timezone,
      isActive: row.isActive,
      sortOrder: row.sortOrder
    };
    this.saveError = '';
  }

  cancelEdit() {
    this.editingId = '';
    this.draft = this.emptyForm();
    this.saveError = '';
  }

  async saveEdit() {
    if (!this.editingId || !this.draft.name.trim() || !this.draft.addressLine1.trim()) return;
    this.saving = true;
    this.saveError = '';
    try {
      await this.api.updateLocation(this.editingId, this.normalizePayload(this.draft));
      await this.load();
      this.cancelEdit();
    } catch {
      this.saveError = 'Could not save. Check slug format (lowercase, numbers, hyphens only) and permissions (admin.locations.write).';
    } finally {
      this.saving = false;
    }
  }

  async createLocation() {
    if (!this.newLoc.name.trim() || !this.newLoc.addressLine1.trim()) {
      this.createError = 'Name and address line 1 are required.';
      return;
    }
    this.creating = true;
    this.createError = '';
    try {
      await this.api.createLocation(this.normalizePayload(this.newLoc));
      this.newLoc = this.emptyForm();
      this.showCreateForm = false;
      await this.load();
    } catch {
      this.createError = 'Could not create. Check slug format and permissions (admin.locations.write).';
    } finally {
      this.creating = false;
    }
  }

  formatAddress(row: ClinicLocationRow) {
    const parts = [row.addressLine1, row.addressLine2, row.city, row.state, row.pincode].filter(Boolean);
    return parts.join(', ');
  }
}
