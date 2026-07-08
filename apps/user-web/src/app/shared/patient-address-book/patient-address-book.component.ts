import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import {
  ADDRESS_TYPE_OPTIONS,
  addressToForm,
  addressTypeLabel,
  emptyAddressForm,
  formToAddressPayload,
  type PatientAddress,
} from '../../core/constants/patient-address.constants';
import { ClinicHttpClient } from '@vitalis/clinic-api';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-patient-address-book',
  standalone: true,
  imports: [CommonModule, FormField],
  templateUrl: './patient-address-book.component.html',
  styleUrl: './patient-address-book.component.scss',
})
export class PatientAddressBookComponent implements OnInit {
  @Input() defaultRecipientName = '';
  @Input() defaultPhone = '';

  private readonly auth = inject(AuthService);
  private readonly http = inject(ClinicHttpClient);

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

  async load() {
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      const { addresses } = await this.http.get<{ addresses: PatientAddress[] }>(
        API_PATHS.PATIENT.ADDRESSES,
      );
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
      isDefault: this.addresses().length === 0,
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
    const model = this.formModel();
    const pin = model.pincode.trim();
    if (!/^\d{6}$/.test(pin)) {
      this.errorMsg.set('PIN code must be exactly 6 digits.');
      this.saving.set(false);
      return;
    }
    const payload = formToAddressPayload(model);
    const editingId = this.editingId();

    try {
      if (editingId) {
        await this.http.put(API_PATHS.PATIENT.ADDRESS(editingId), payload);
        this.successMsg.set('Address updated.');
      } else {
        await this.http.post(API_PATHS.PATIENT.ADDRESSES, payload);
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
      await this.http.post(API_PATHS.PATIENT.ADDRESS_DEFAULT(id));
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
      await this.http.delete(API_PATHS.PATIENT.ADDRESS(id));
      if (this.editingId() === id) this.cancelForm();
      await this.load();
      this.successMsg.set('Address removed.');
      setTimeout(() => this.successMsg.set(''), 2500);
    } catch (err: unknown) {
      this.errorMsg.set(err instanceof Error ? err.message : 'Could not remove address.');
    }
  }
}
