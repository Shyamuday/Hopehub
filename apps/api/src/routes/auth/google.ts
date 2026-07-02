import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { createPatientRecord } from '../../services/patient-identity.js';
import { asyncRoute, publicUserSelect, toAuthResponse, logAuthEvent } from '../../utils/helpers.js';
import { googleClient, googleClientId } from './shared.js';

export function registerAuthGoogleRoutes(router: Router) {
// ─── Google OAuth ──────────────────────────────────────────────────────────────

router.post(
  '/auth/google',
  asyncRoute(async (req, res) => {
    const body = z.object({ idToken: z.string().min(20) }).parse(req.body);
    if (!googleClient || !googleClientId) {
      return res.status(503).json({ message: 'Google login is not configured. Set GOOGLE_CLIENT_ID.' });
    }

    const ticket = await googleClient.verifyIdToken({ idToken: body.idToken, audience: googleClientId });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ message: 'Google account email is required' });
    }

    const existing = await prisma.user.findUnique({
      where: { email: payload.email },
      select: publicUserSelect
    });

    const user = existing
      ? await prisma.user.update({
          where: { email: payload.email },
          data: { name: payload.name || payload.email },
          select: publicUserSelect
        })
      : await createPatientRecord({
          name: payload.name || payload.email,
          email: payload.email
        });

    logAuthEvent('patient_login', { userId: user.id, event: 'google' });
    res.json(toAuthResponse({ ...user, role: Role.PATIENT }));
  })
);

}
