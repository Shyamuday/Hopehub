import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { API_PATHS } from '../core/constants/api-paths.constants';
import {
  ADDRESS_TYPE_OPTIONS,
  addressToForm,
  addressTypeLabel,
  emptyAddressForm,
  formToAddressPayload,
  type PatientAddress
} from '../core/constants/patient-address.constants';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-patient-address-book',
  standalone: true,
  imports: [CommonModule, FormField],
  templateUrl: './patient-address-book.component.html',
  styleUrl: './patient-address-book.component.scss'
})
export class PatientAddressBookComponent implements OnInit {
  @Input() defaultRecipientName = '';
  @Input() defaultPhone = '';

  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMsg = signal('');
  readonly successMsg = signal('');
  readonly addresses = signal<PatientAddress[]>([]);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly addressTypeOptions = ADDRESS_TYPE_OPTIONS;
  readonly addressTypeLabel = addressTypeLabel;

  readonly formModel = signal(emptyAddressForm());
  readonly addressForm = form(this.formModel);

  ngOnInit() {
    void this.load();
  }

  private get token() {
    return this.auth.token || '';
  }

  private async apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${environment.apiUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(init?.headers || {})
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || 'Request failed');
    return data as T;
  }

  async load() {
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      const { addresses } = await this.apiFetch<{ addresses: PatientAddress[] }>(API_PATHS.PATIENT.ADDRESSES);
      this.addresses.set(addresses);
    } catch {
      this.errorMsg.set('Could not load saved addresses.');
    } finally {
      this.loading.set(false);
    }
  }

  openAddForm() {
    this.editingId.set(null);
    this.formModel.set({
      ...emptyAddressForm(this.defaultRecipientName, this.defaultPhone),
      isDefault: this.addresses().length === 0
    });
    this.showForm.set(true);
  }

  openEditForm(addr: PatientAddress) {
    this.editingId.set(addr.id);
    this.formModel.set(addressToForm(addr));
    this.showForm.set(true);
  }

  cancelForm() {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  toggleDefault(checked: boolean) {
    this.formModel.update((m) => ({ ...m, isDefault: checked }));
  }

  async saveAddress() {
    this.saving.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');
    const payload = formToAddressPayload(this.formModel());
    const editingId = this.editingId();

    try {
      if (editingId) {
        await this.apiFetch(API_PATHS.PATIENT.ADDRESS(editingId), {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        this.successMsg.set('Address updated.');
      } else {
        await this.apiFetch(API_PATHS.PATIENT.ADDRESSES, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        this.successMsg.set('Address saved.');
      }
      this.showForm.set(false);
      this.editingId.set(null);
      await this.load();
      setTimeout(() => this.successMsg.set(''), 3000);
    } catch (err: unknown) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Could not save address.');
    } finally {
      this.saving.set(false);
    }
  }

  async setDefault(id: string) {
    try {
      await this.apiFetch(API_PATHS.PATIENT.ADDRESS_DEFAULT(id), { method: 'POST' });
      await this.load();
      this.successMsg.set('Default address updated.');
      setTimeout(() => this.successMsg.set(''), 2500);
    } catch (err: unknown) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Could not update default.');
    }
  }

  async deleteAddress(id: string) {
    if (!confirm('Remove this address from your saved list?')) return;
    try {
      await this.apiFetch(API_PATHS.PATIENT.ADDRESS(id), { method: 'DELETE' });
      if (this.editingId() === id) this.cancelForm();
      await this.load();
      this.successMsg.set('Address removed.');
      setTimeout(() => this.successMsg.set(''), 2500);
    } catch (err: unknown) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Could not remove address.');
    }
  }
}
