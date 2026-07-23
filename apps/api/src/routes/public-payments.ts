import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../utils/helpers.js';
import { getRazorpayClient, razorpayKeyId, verifyRazorpaySignature } from '../services/razorpay.js';

export const publicPaymentsRouter = Router();

const donationOrderSchema = z.object({
  amountInPaise: z.number().int().min(100).max(10000000),
  donorName: z.string().trim().max(120).optional().or(z.literal('')),
  donorEmail: z.string().trim().email().max(254).optional().or(z.literal('')),
  donorPhone: z.string().trim().max(30).optional().or(z.literal(''))
});

publicPaymentsRouter.post(
  '/public-payments/donations/create-order',
  asyncRoute(async (req, res) => {
    const body = donationOrderSchema.parse(req.body);
    const razorpay = getRazorpayClient();
    const order = await razorpay.orders.create({
      amount: body.amountInPaise,
      currency: 'INR',
      receipt: `donation_${Date.now()}`,
      notes: {
        purpose: 'hope_hub_donation',
        donorName: body.donorName || '',
        donorEmail: body.donorEmail || '',
        donorPhone: body.donorPhone || ''
      }
    });

    res.json({
      orderId: order.id,
      amountInPaise: body.amountInPaise,
      currency: 'INR',
      razorpayKeyId
    });
  })
);

publicPaymentsRouter.post(
  '/public-payments/donations/verify',
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        razorpayOrderId: z.string().min(1),
        razorpayPaymentId: z.string().min(1),
        razorpaySignature: z.string().min(1)
      })
      .parse(req.body);

    if (!verifyRazorpaySignature(body)) {
      return res.status(400).json({ message: 'Invalid Razorpay signature.' });
    }

    res.json({ ok: true });
  })
);
