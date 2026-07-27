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

type RazorpayPaymentFailedResponse = {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on?: (event: string, callback: (response: unknown) => void) => void;
    };
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

      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        reject(new Error(message));
      };

      const checkout = new window.Razorpay({
        key: order.razorpayKeyId,
        amount: order.amountInPaise,
        currency: order.currency,
        name: 'Hope Hub',
        description: donor.donorName || donor.donorEmail ? 'Hope Hub payment' : 'Hope Hub support',
        order_id: order.orderId,
        prefill: {
          name: donor.donorName || '',
          email: donor.donorEmail || '',
          contact: donor.donorPhone || '',
        },
        theme: { color: '#4a6fa5' },
        handler: (response: RazorpayCheckoutResponse) => {
          if (settled) return;
          settled = true;
          resolve(response);
        },
        modal: { ondismiss: () => fail('Payment was cancelled.') },
      });

      checkout.on?.('payment.failed', (response: unknown) => {
        const failure = response as RazorpayPaymentFailedResponse;
        fail(
          failure.error?.description ||
            failure.error?.reason ||
            'Payment failed. Please retry or use another payment method.',
        );
      });

      checkout.open();
    });
  }
}
