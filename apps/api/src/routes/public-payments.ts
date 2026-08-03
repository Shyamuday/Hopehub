import { Router } from 'express';
import { PaymentStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute } from '../utils/helpers.js';
import {
  getRazorpayClient,
  isRazorpayConfigured,
  razorpayKeyId,
  verifyRazorpaySignature
} from '../services/razorpay.js';

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
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: 'Payment gateway is not configured.' });
    }

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

    await prisma.donationPayment.create({
      data: {
        providerOrderId: order.id,
        amountInPaise: body.amountInPaise,
        currency: 'INR',
        donorName: body.donorName || null,
        donorEmail: body.donorEmail || null,
        donorPhone: body.donorPhone || null,
        status: PaymentStatus.CREATED,
        notes: {
          purpose: 'hope_hub_donation',
          receipt: order.receipt || null
        }
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
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: 'Payment gateway is not configured.' });
    }

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

    const donation = await prisma.donationPayment.update({
      where: { providerOrderId: body.razorpayOrderId },
      data: {
        providerPaymentId: body.razorpayPaymentId,
        status: PaymentStatus.PAID,
        verifiedAt: new Date()
      }
    });

    res.json({ ok: true, donation });
  })
);
