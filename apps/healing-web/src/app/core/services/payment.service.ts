import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssessmentAccess, AssessmentConfig } from '../models/assessment.model';

type DonationOrder = {
  orderId: string;
  amountInPaise: number;
  currency: 'INR';
  razorpayKeyId: string;
  description?: string;
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

type PaymentLifecycle = {
  onOrderCreated?: () => void;
  onCheckoutOpened?: () => void;
  onVerifying?: () => void;
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

  async donate(
    input: {
      amount: number;
      donorName?: string | null;
      donorEmail?: string | null;
      donorPhone?: string | null;
    },
    lifecycle?: PaymentLifecycle,
  ): Promise<void> {
    const order = await firstValueFrom(
      this.http.post<DonationOrder>(`${this.apiUrl}/public-payments/donations/create-order`, {
        amountInPaise: input.amount * 100,
        donorName: input.donorName || '',
        donorEmail: input.donorEmail || '',
        donorPhone: input.donorPhone || '',
      }),
    ).catch((error) => {
      throw this.friendlyPaymentError(error);
    });
    this.assertOrderReady(order);
    lifecycle?.onOrderCreated?.();

    await this.loadRazorpayScript();
    lifecycle?.onCheckoutOpened?.();
    const payment = await this.openCheckout(order, input);
    lifecycle?.onVerifying?.();
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/public-payments/donations/verify`, {
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature,
      }),
    ).catch((error) => {
      throw this.friendlyPaymentError(error);
    });
  }

  async payConsultation(consultation: any, lifecycle?: PaymentLifecycle): Promise<void> {
    const order = await firstValueFrom(
      this.http.post<DonationOrder>(`${this.apiUrl}/payments/${consultation.id}/create-order`, {}),
    ).catch((error) => {
      throw this.friendlyPaymentError(error);
    });
    this.assertOrderReady(order);
    lifecycle?.onOrderCreated?.();

    await this.loadRazorpayScript();
    lifecycle?.onCheckoutOpened?.();
    const payment = await this.openCheckout(order, {
      amount: Math.round(order.amountInPaise / 100),
      donorName: consultation.patient?.name || '',
      donorEmail: consultation.patient?.email || '',
      donorPhone: consultation.patient?.mobile || '',
      description: this.checkoutDescription(consultation),
    });

    lifecycle?.onVerifying?.();
    await firstValueFrom(
      this.http.post(`${this.apiUrl}/payments/${consultation.id}/verify`, {
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature,
      }),
    ).catch((error) => {
      throw this.friendlyPaymentError(error);
    });
  }

  async payAssessment(
    assessment: AssessmentConfig,
    lifecycle?: PaymentLifecycle,
  ): Promise<AssessmentAccess | null> {
    const order = await firstValueFrom(
      this.http.post<DonationOrder>(
        `${this.apiUrl}/assessment-definitions/${encodeURIComponent(assessment.id)}/create-order`,
        {},
      ),
    ).catch((error) => {
      throw this.friendlyPaymentError(error);
    });
    this.assertOrderReady(order);
    lifecycle?.onOrderCreated?.();

    await this.loadRazorpayScript();
    lifecycle?.onCheckoutOpened?.();
    const payment = await this.openCheckout(order, {
      amount: Math.round(order.amountInPaise / 100),
      description: order.description || `Unlock ${assessment.title}`,
    });

    lifecycle?.onVerifying?.();
    const verified = await firstValueFrom(
      this.http.post<{ ok: boolean; access?: AssessmentAccess }>(
        `${this.apiUrl}/assessment-definitions/${encodeURIComponent(assessment.id)}/verify-payment`,
        {
          razorpayOrderId: payment.razorpay_order_id,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpaySignature: payment.razorpay_signature,
        },
      ),
    ).catch((error) => {
      throw this.friendlyPaymentError(error);
    });
    return verified.access ?? null;
  }

  private loadRazorpayScript(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.Razorpay) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.razorpayScriptUrl;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error('Could not open secure checkout. Check your connection and try again.'));
      document.body.appendChild(script);
    });
  }

  private assertOrderReady(order: DonationOrder): void {
    if (!order?.orderId || !order.razorpayKeyId) {
      throw new Error('Payment setup is not ready. Please try again later.');
    }
  }

  private friendlyPaymentError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (error.status === 503) {
        return new Error('Payment setup is not ready. Please try again later.');
      }
      if (typeof message === 'string' && message.trim()) {
        return new Error(message.trim());
      }
      if (error.status >= 500) {
        return new Error('Payment could not be prepared. Please try again shortly.');
      }
    }
    if (error instanceof Error) return error;
    return new Error('Payment could not be completed. Please try again.');
  }

  private openCheckout(
    order: DonationOrder,
    donor: {
      amount: number;
      donorName?: string | null;
      donorEmail?: string | null;
      donorPhone?: string | null;
      description?: string | null;
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
        description: donor.description || 'Secure Hope Hub payment',
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
        modal: { ondismiss: () => fail('Payment was closed before completion.') },
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

  private checkoutDescription(consultation: any): string {
    const lineItems = consultation?.payment?.lineItems || {};
    const offeringType = String(lineItems.offeringType || '');
    if (['WORKSHOP', 'MEETUP', 'WEBINAR', 'GROUP_SESSION'].includes(offeringType)) {
      return `Secure ${offeringType.replace('_', ' ').toLowerCase()} payment`;
    }
    if (offeringType === 'RECORDED_SESSION') return 'Secure recorded session payment';
    return 'Secure session payment';
  }
}
