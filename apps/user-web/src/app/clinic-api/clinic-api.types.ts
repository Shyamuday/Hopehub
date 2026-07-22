export type RazorpayOrderResponse = {
  orderId: string | null;
  amountInPaise: number;
  currency: string;
  razorpayKeyId: string;
  paidWithoutGateway?: boolean;
};

export type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

import type { Socket } from 'socket.io-client';

export interface RealtimeSubscription {
  unsubscribe(): void;
  socket: Socket;
}
