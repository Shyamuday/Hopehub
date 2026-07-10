import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import {
  generateOtp,
  storeOtp,
  verifyOtp,
  sendOtpEmail,
  devOtp,
  isProduction
} from '../../services/otp.js';
import { getMailTransporter } from '../../services/mail.js';
import { createPatientRecord } from '../../services/patient-identity.js';
import { attachReferralOnSignup } from '../../services/referral-codes.js';
import { asyncRoute, publicUserSelect, toAuthResponse, logAuthEvent } from '../../utils/helpers.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../../services/product-analytics.js';

export function registerAuthOtpRoutes(router: Router) {
  // ─── OTP auth ──────────────────────────────────────────────────────────────────

  router.post(
    '/auth/request-otp',
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          email: z.string().email(),
          leadSource: z.enum(['HOME_BOOKING', 'PROMO_POPUP']).optional(),
          visitorName: z.string().max(120).optional(),
          visitorKey: z.string().max(80).optional(),
          entryPage: z.string().max(500).optional()
        })
        .parse(req.body);
      const email = body.email.trim().toLowerCase();
      if (isProduction && !getMailTransporter()) {
        return res.status(503).json({ message: 'Email delivery is not configured.' });
      }

      const otp = isProduction ? generateOtp() : devOtp;
      await storeOtp(email, otp);
      if (isProduction) {
        await sendOtpEmail(email, otp);
      } else {
        console.info(`[otp] DEV — Email OTP for ${email}: ${otp}`);
      }

      res.json({ message: 'OTP sent.', ...(!isProduction ? { devOtp: otp } : {}) });
    })
  );

  router.post(
    '/auth/patient-login',
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          email: z.string().email(),
          otp: z.string().min(4),
          name: z.string().min(2).optional(),
          referralCode: z.string().min(3).max(32).optional()
        })
        .parse(req.body);

      const email = body.email.trim().toLowerCase();

      if (!(await verifyOtp(email, body.otp))) {
        return res.status(401).json({ message: 'Invalid or expired OTP.' });
      }

      const patients = await prisma.user.findMany({
        where: { email, role: Role.PATIENT },
        select: publicUserSelect,
        orderBy: { createdAt: 'asc' }
      });

      if (patients.length > 1) {
        return res.json({
          requiresPatientSelection: true,
          email,
          patients
        });
      }

      if (patients.length === 1) {
        logAuthEvent('patient_login', { userId: patients[0].id, email });
        void trackProductEvent({
          name: PRODUCT_EVENTS.PATIENT_LOGIN,
          actorId: patients[0].id,
          actorRole: Role.PATIENT,
          properties: { email, method: 'email_otp' }
        });
        return res.json(toAuthResponse(patients[0]));
      }

      const user = await createPatientRecord({
        name: body.name?.trim() || 'Patient',
        email
      });

      if (body.referralCode) {
        void attachReferralOnSignup(user.id, body.referralCode).catch((err) => {
          console.warn('[referral] Could not attach on signup', err);
        });
      }

      logAuthEvent('patient_login', { userId: user.id, email, event: 'email_otp_register' });
      void trackProductEvent({
        name: PRODUCT_EVENTS.PATIENT_LOGIN,
        actorId: user.id,
        actorRole: Role.PATIENT,
        properties: { email, method: 'email_otp_register' }
      });
      res.json(toAuthResponse({ ...user, role: Role.PATIENT }));
    })
  );

  router.post(
    '/auth/patient-login/select',
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          email: z.string().email(),
          otp: z.string().min(4),
          patientId: z.string().min(1)
        })
        .parse(req.body);

      const email = body.email.trim().toLowerCase();

      if (!(await verifyOtp(email, body.otp))) {
        return res.status(401).json({ message: 'Invalid or expired OTP.' });
      }

      const user = await prisma.user.findFirst({
        where: { id: body.patientId, email, role: Role.PATIENT },
        select: publicUserSelect
      });

      if (!user) {
        return res.status(404).json({ message: 'Patient profile not found for this email.' });
      }

      logAuthEvent('patient_login', { userId: user.id, email, event: 'email_otp_select' });
      void trackProductEvent({
        name: PRODUCT_EVENTS.PATIENT_LOGIN,
        actorId: user.id,
        actorRole: Role.PATIENT,
        properties: { email, method: 'email_otp_select' }
      });
      res.json(toAuthResponse(user));
    })
  );
}
