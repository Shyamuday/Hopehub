import crypto from 'node:crypto';
import Razorpay from 'razorpay';

export const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
export const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

export function getRazorpayClient() {
  if (!razorpayKeyId || !razorpayKeySecret) {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  return new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });
}

export function verifyRazorpaySignature(payload: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const digest = crypto
    .createHmac('sha256', razorpayKeySecret)
    .update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(payload.razorpaySignature));
}
