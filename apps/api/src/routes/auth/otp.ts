import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import {
  generateOtp,
  storeOtp,
  verifyOtpDetailed,
  sendOtpEmail,
  devOtp,
  isProduction
} from '../../services/otp.js';
import { getMailTransporter } from '../../services/mail.js';
import { createPatientRecord } from '../../services/patient-identity.js';
import { attachReferralOnSignup } from '../../services/referral-codes.js';
import { asyncRoute, publicUserSelect, logAuthEvent } from '../../utils/helpers.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../../services/product-analytics.js';
import { recordAuthProcess } from '../../services/auth-process-log.js';
import { issueAuthSession } from '../../services/auth-sessions.js';

const staffOtpKey = (email: string) => `staff:${email.trim().toLowerCase()}`;

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
      const existingUser = await prisma.user.findFirst({
        where: { email, role: Role.PATIENT },
        select: { id: true, role: true, isActive: true }
      });
      const isStaffUser = false;

      if (isProduction && !getMailTransporter()) {
        await recordAuthProcess({
          processType: isStaffUser ? 'staff_email_otp' : 'patient_email_otp',
          step: 'request',
          status: 'blocked',
          identifier: email,
          reason: 'email_delivery_not_configured',
          req
        });
        return res.status(503).json({ message: 'Email delivery is not configured.' });
      }

      const otp = isProduction ? generateOtp() : devOtp;
      await storeOtp(isStaffUser ? staffOtpKey(email) : email, otp);
      if (isProduction) {
        try {
          await sendOtpEmail(email, otp);
        } catch (error) {
          await recordAuthProcess({
            processType: isStaffUser ? 'staff_email_otp' : 'patient_email_otp',
            step: 'request',
            status: 'failure',
            identifier: email,
            reason: 'email_delivery_failed',
            req,
            metadata: { error: error instanceof Error ? error.message : String(error) }
          });
          throw error;
        }
      } else {
        console.info(`[otp] DEV — Email OTP for ${email}: ${otp}`);
      }

      await recordAuthProcess({
        processType: isStaffUser ? 'staff_email_otp' : 'patient_email_otp',
        step: 'request',
        status: 'success',
        identifier: email,
        req,
        metadata: {
          leadSource: body.leadSource,
          entryPage: body.entryPage,
          delivery: isProduction ? 'email' : 'dev',
          role: existingUser?.role
        }
      });

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
      const otpResult = await verifyOtpDetailed(email, body.otp);

      if (!otpResult.ok) {
        await recordAuthProcess({
          processType: 'patient_email_otp',
          step: 'verify',
          status: 'failure',
          identifier: email,
          reason: otpResult.reason,
          req,
          metadata: { outcome: 'otp_rejected' }
        });
        return res.status(401).json({
          message: 'Invalid or expired OTP. Request a fresh OTP for this email and try again.'
        });
      }

      const patients = await prisma.user.findMany({
        where: { email, role: Role.PATIENT },
        select: publicUserSelect,
        orderBy: { createdAt: 'asc' }
      });

      if (patients.length > 1) {
        await recordAuthProcess({
          processType: 'patient_email_otp',
          step: 'verify',
          status: 'success',
          identifier: email,
          req,
          metadata: { outcome: 'patient_selection_required', patientCount: patients.length }
        });
        return res.json({
          requiresPatientSelection: true,
          email,
          patients
        });
      }

      if (patients.length === 1) {
        logAuthEvent('patient_login', { userId: patients[0].id, email });
        await recordAuthProcess({
          processType: 'patient_email_otp',
          step: 'login',
          status: 'success',
          identifier: email,
          req,
          metadata: { outcome: 'existing_patient_login', userId: patients[0].id }
        });
        void trackProductEvent({
          name: PRODUCT_EVENTS.PATIENT_LOGIN,
          actorId: patients[0].id,
          actorRole: Role.PATIENT,
          properties: { email, method: 'email_otp' }
        });
        return res.json(await issueAuthSession(patients[0], req));
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
      await recordAuthProcess({
        processType: 'patient_email_otp',
        step: 'signup',
        status: 'success',
        identifier: email,
        req,
        metadata: { outcome: 'new_patient_created', userId: user.id }
      });
      void trackProductEvent({
        name: PRODUCT_EVENTS.PATIENT_LOGIN,
        actorId: user.id,
        actorRole: Role.PATIENT,
        properties: { email, method: 'email_otp_register' }
      });
      res.json(await issueAuthSession({ ...user, role: Role.PATIENT }, req));
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
      const otpResult = await verifyOtpDetailed(email, body.otp);

      if (!otpResult.ok) {
        await recordAuthProcess({
          processType: 'patient_email_otp',
          step: 'select',
          status: 'failure',
          identifier: email,
          reason: otpResult.reason,
          req,
          metadata: { outcome: 'otp_rejected', patientId: body.patientId }
        });
        return res.status(401).json({
          message: 'Invalid or expired OTP. Request a fresh OTP for this email and try again.'
        });
      }

      const user = await prisma.user.findFirst({
        where: { id: body.patientId, email, role: Role.PATIENT },
        select: publicUserSelect
      });

      if (!user) {
        await recordAuthProcess({
          processType: 'patient_email_otp',
          step: 'select',
          status: 'failure',
          identifier: email,
          reason: 'patient_not_found',
          req,
          metadata: { outcome: 'patient_not_found', patientId: body.patientId }
        });
        return res.status(404).json({ message: 'Patient profile not found for this email.' });
      }

      logAuthEvent('patient_login', { userId: user.id, email, event: 'email_otp_select' });
      await recordAuthProcess({
        processType: 'patient_email_otp',
        step: 'select',
        status: 'success',
        identifier: email,
        req,
        metadata: { outcome: 'selected_patient_login', userId: user.id }
      });
      void trackProductEvent({
        name: PRODUCT_EVENTS.PATIENT_LOGIN,
        actorId: user.id,
        actorRole: Role.PATIENT,
        properties: { email, method: 'email_otp_select' }
      });
      res.json(await issueAuthSession(user, req));
    })
  );
}
