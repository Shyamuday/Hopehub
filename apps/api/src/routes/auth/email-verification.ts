import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../utils/helpers.js';
import {
  createEmailVerificationToken,
  verifyEmailToken
} from '../../services/email-verification.js';
import { submitHomeopathyProviderForApprovalIfReady } from '../../services/homeopathy-provider-approval.js';

export function registerAuthEmailVerificationRoutes(router: Router) {
  router.post(
    '/auth/verify-email',
    asyncRoute(async (req, res) => {
      const body = z.object({ token: z.string().min(20) }).parse(req.body);
      const user = await verifyEmailToken(body.token, req);
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification link.' });
      }
      const approvalSubmission =
        user.role === Role.DOCTOR
          ? await submitHomeopathyProviderForApprovalIfReady(user.id)
          : undefined;
      res.json({ user, approvalSubmission, message: 'Email verified successfully.' });
    })
  );

  router.post(
    '/auth/resend-verification',
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          email: z.string().email(),
          role: z.nativeEnum(Role).optional().default(Role.PATIENT)
        })
        .parse(req.body);
      const email = body.email.trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: { email, role: body.role },
        select: { id: true, email: true, emailVerified: true, role: true }
      });

      if (!user || !user.email || user.emailVerified) {
        return res.json({
          message: 'If the account needs verification, a new link has been sent.'
        });
      }

      await createEmailVerificationToken({
        userId: user.id,
        email: user.email,
        portal:
          user.role === Role.DOCTOR ? 'provider' : user.role === Role.ADMIN ? 'admin' : 'patient',
        req
      });

      res.json({ message: 'If the account needs verification, a new link has been sent.' });
    })
  );
}
