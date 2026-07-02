import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { generateOtp, storeOtp, verifyOtp, sendOtpSms, devOtp, isProduction } from '../../services/otp.js';
import { createPatientRecord, normalizeMobile } from '../../services/patient-identity.js';
import { asyncRoute, publicUserSelect, toAuthResponse, logAuthEvent } from '../../utils/helpers.js';
import { PRODUCT_EVENTS, trackProductEvent } from '../../services/product-analytics.js';

export function registerAuthOtpRoutes(router: Router) {
// ─── OTP auth ──────────────────────────────────────────────────────────────────

router.post(
  '/auth/request-otp',
  asyncRoute(async (req, res) => {
    const body = z.object({ mobile: z.string().min(8) }).parse(req.body);
    const mobile = normalizeMobile(body.mobile);
    if (!mobile) {
      return res.status(400).json({ message: 'Invalid mobile number.' });
    }
    const otp = isProduction ? generateOtp() : devOtp;
    storeOtp(mobile, otp);
    if (isProduction) {
      await sendOtpSms(mobile, otp);
    } else {
      console.info(`[otp] DEV — OTP for ${mobile}: ${otp}`);
    }
    res.json({ message: 'OTP sent.', ...(!isProduction ? { devOtp: otp } : {}) });
  })
);

router.post(
  '/auth/patient-login',
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        mobile: z.string().min(8),
        otp: z.string().min(4),
        name: z.string().min(2).optional()
      })
      .parse(req.body);

    const mobile = normalizeMobile(body.mobile);
    if (!mobile) {
      return res.status(400).json({ message: 'Invalid mobile number.' });
    }

    if (!verifyOtp(mobile, body.otp)) {
      return res.status(401).json({ message: 'Invalid or expired OTP.' });
    }

    const patients = await prisma.user.findMany({
      where: { mobile, role: Role.PATIENT },
      select: publicUserSelect,
      orderBy: { createdAt: 'asc' }
    });

    if (patients.length > 1) {
      return res.json({
        requiresPatientSelection: true,
        mobile,
        patients
      });
    }

    if (patients.length === 1) {
      logAuthEvent('patient_login', { userId: patients[0].id, mobile });
      void trackProductEvent({
        name: PRODUCT_EVENTS.PATIENT_LOGIN,
        actorId: patients[0].id,
        actorRole: Role.PATIENT,
        properties: { mobile, method: 'otp' }
      });
      return res.json(toAuthResponse(patients[0]));
    }

    const user = await createPatientRecord({
      name: body.name?.trim() || mobile,
      mobile
    });

    logAuthEvent('patient_login', { userId: user.id, mobile, event: 'otp_register' });
    void trackProductEvent({
      name: PRODUCT_EVENTS.PATIENT_LOGIN,
      actorId: user.id,
      actorRole: Role.PATIENT,
      properties: { mobile, method: 'otp_register' }
    });
    res.json(toAuthResponse({ ...user, role: Role.PATIENT }));
  })
);

router.post(
  '/auth/patient-login/select',
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        mobile: z.string().min(8),
        otp: z.string().min(4),
        patientId: z.string().min(1)
      })
      .parse(req.body);

    const mobile = normalizeMobile(body.mobile);
    if (!mobile) {
      return res.status(400).json({ message: 'Invalid mobile number.' });
    }

    if (!verifyOtp(mobile, body.otp)) {
      return res.status(401).json({ message: 'Invalid or expired OTP.' });
    }

    const user = await prisma.user.findFirst({
      where: { id: body.patientId, mobile, role: Role.PATIENT },
      select: publicUserSelect
    });

    if (!user) {
      return res.status(404).json({ message: 'Patient profile not found for this mobile.' });
    }

    logAuthEvent('patient_login', { userId: user.id, mobile, event: 'otp_select' });
    void trackProductEvent({
      name: PRODUCT_EVENTS.PATIENT_LOGIN,
      actorId: user.id,
      actorRole: Role.PATIENT,
      properties: { mobile, method: 'otp_select' }
    });
    res.json(toAuthResponse(user));
  })
);

}
