import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { SupplierApiService } from '../../services/supplier-api.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './orders.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
  private api = inject(SupplierApiService);

  loading = signal(true);
  error = signal('');
  orders = signal<any[]>([]);
  toast = signal('');
  confirmingId = signal<string | null>(null);
  supplierNotes = '';
  expectedDeliveryDate = '';

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
    this.supplierNotes = order.supplierNotes ?? '';
    this.expectedDeliveryDate = order.expectedDeliveryDate?.slice(0, 10) ?? '';
  }

  closeConfirm(): void {
    this.confirmingId.set(null);
    this.supplierNotes = '';
    this.expectedDeliveryDate = '';
  }

  async submitConfirm(id: string): Promise<void> {
    try {
      await this.api.confirmOrder(id, {
        supplierNotes: this.supplierNotes || undefined,
        expectedDeliveryDate: this.expectedDeliveryDate || undefined
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
