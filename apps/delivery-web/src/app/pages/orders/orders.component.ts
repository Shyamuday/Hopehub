import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DeliveryApiService } from '../../services/delivery-api.service';
import { DEV_DEMO_ACCOUNTS } from '../../core/constants/dev-demo.constants';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss'
})
export class OrdersComponent implements OnInit {
  private api = inject(DeliveryApiService);

  loading = signal(true);
  error = signal('');
  orders = signal<any[]>([]);
  toast = signal('');

  completingId = signal<string | null>(null);
  failingId = signal<string | null>(null);
  otp = DEV_DEMO_ACCOUNTS.deliveryOtp;
  proofNote = '';
  failReason = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getOrders()
      .then((res) => {
        this.orders.set(res.deliveries ?? []);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load deliveries.');
        this.loading.set(false);
      });
  }

  async accept(id: string): Promise<void> {
    try {
      await this.api.acceptOrder(id);
      this.showToast('Delivery accepted');
      this.load();
    } catch {
      this.showToast('Accept failed');
    }
  }

  async pickup(id: string): Promise<void> {
    try {
      await this.api.pickupOrder(id);
      this.showToast('Marked out for delivery');
      this.load();
    } catch {
      this.showToast('Pickup failed');
    }
  }

  openComplete(order: any): void {
    this.completingId.set(order.id);
    this.otp = DEV_DEMO_ACCOUNTS.deliveryOtp;
    this.proofNote = '';
  }

  closeComplete(): void {
    this.completingId.set(null);
    this.proofNote = '';
  }

  async submitComplete(): Promise<void> {
    const id = this.completingId();
    if (!id || !this.otp) return;
    try {
      await this.api.completeOrder(id, { otp: this.otp, proofNote: this.proofNote || undefined });
      this.showToast('Delivery completed');
      this.closeComplete();
      this.load();
    } catch {
      this.showToast('Invalid OTP or completion failed');
    }
  }

  openFail(id: string): void {
    this.failingId.set(id);
    this.failReason = '';
  }

  closeFail(): void {
    this.failingId.set(null);
    this.failReason = '';
  }

  async submitFail(): Promise<void> {
    const id = this.failingId();
    if (!id || this.failReason.length < 3) return;
    try {
      await this.api.failOrder(id, this.failReason);
      this.showToast('Marked as failed');
      this.closeFail();
      this.load();
    } catch {
      this.showToast('Could not mark failed');
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }
}
