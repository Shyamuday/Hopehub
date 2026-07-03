import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { SupplierApiService } from '../../services/supplier-api.service';

function emptyConfirmForm() {
  return { supplierNotes: '', expectedDeliveryDate: '' };
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormField, DatePipe],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
  private api = inject(SupplierApiService);

  loading = signal(true);
  error = signal('');
  orders = signal<any[]>([]);
  toast = signal('');
  confirmingId = signal<string | null>(null);

  readonly confirmFormModel = signal(emptyConfirmForm());
  readonly confirmForm = form(this.confirmFormModel);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getOrders()
      .then((res) => {
        this.orders.set(res.orders ?? []);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load purchase orders.');
        this.loading.set(false);
      });
  }

  formatPaise(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  openConfirm(order: any): void {
    this.confirmingId.set(order.id);
    this.confirmFormModel.set({
      supplierNotes: order.supplierNotes ?? '',
      expectedDeliveryDate: order.expectedDeliveryDate?.slice(0, 10) ?? ''
    });
  }

  closeConfirm(): void {
    this.confirmingId.set(null);
    this.confirmFormModel.set(emptyConfirmForm());
  }

  async submitConfirm(id: string): Promise<void> {
    const form = this.confirmFormModel();
    try {
      await this.api.confirmOrder(id, {
        supplierNotes: form.supplierNotes || undefined,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined
      });
      this.showToast('Purchase order confirmed');
      this.closeConfirm();
      this.load();
    } catch {
      this.showToast('Confirmation failed');
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }
}
