import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

type DonationOrder = {
  orderId: string;
  amountInPaise: number;
  currency: 'INR';
  razorpayKeyId: string;
};

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly razorpayScriptUrl = 'https://checkout.razorpay.com/v1/checkout.js';

  async donate(input: {
    amount: number;
    donorName?: string | null;
    donorEmail?: string | null;
    donorPhone?: string | null;
  }): Promise<void> {
    await this.loadRazorpayScript();
    const order = await firstValueFrom(
      this.http.post<DonationOrder>(`${this.apiUrl}/public-payments/donations/create-order`, {
        amountInPaise: input.amount * 100,
        donorName: input.donorName || '',
        donorEmail: input.donorEmail || '',
        donorPhone: input.donorPhone || '',
      }),
    );

    const payment = await this.openCheckout(order, input);
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/public-payments/donations/verify`, {
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature,
      }),
    );
  }

  async payConsultation(consultation: any): Promise<void> {
    await this.loadRazorpayScript();
    const order = await firstValueFrom(
      this.http.post<DonationOrder>(`${this.apiUrl}/payments/${consultation.id}/create-order`, {}),
    );

    const payment = await this.openCheckout(order, {
      amount: Math.round(order.amountInPaise / 100),
      donorName: consultation.patient?.name || '',
      donorEmail: consultation.patient?.email || '',
      donorPhone: consultation.patient?.mobile || '',
    });

    await firstValueFrom(
      this.http.post(`${this.apiUrl}/payments/${consultation.id}/verify`, {
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature,
      }),
    );
  }

  private loadRazorpayScript(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.Razorpay) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.razorpayScriptUrl;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'));
      document.body.appendChild(script);
    });
  }

  private openCheckout(
    order: DonationOrder,
    donor: {
      amount: number;
      donorName?: string | null;
      donorEmail?: string | null;
      donorPhone?: string | null;
    },
  ): Promise<RazorpayCheckoutResponse> {
    return new Promise((resolve, reject) => {
      if (!window.Razorpay) {
        reject(new Error('Razorpay Checkout is not available.'));
        return;
      }

      const checkout = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amountInPaise,
        currency: order.currency,
        name: 'Hope Hub',
        description: 'Donation',
        order_id: order.orderId,
        prefill: {
          name: donor.donorName || '',
          email: donor.donorEmail || '',
          contact: donor.donorPhone || '',
        },
        theme: { color: '#16a34a' },
        handler: (response: RazorpayCheckoutResponse) => resolve(response),
        modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
      });

      checkout.open();
    });
  }
}
