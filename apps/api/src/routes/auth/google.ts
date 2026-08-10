import { Router } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { createPatientRecord } from '../../services/patient-identity.js';
import { asyncRoute, publicUserSelect, toAuthResponse, logAuthEvent } from '../../utils/helpers.js';
import { googleClient, googleClientId } from './shared.js';

const googleAuthUserSelect = {
  ...publicUserSelect,
  authProvider: true
} as const;

export function registerAuthGoogleRoutes(router: Router) {
  // ─── Google OAuth ──────────────────────────────────────────────────────────────

  router.get('/auth/google-config', (_req, res) => {
    res.json({
      configured: Boolean(googleClientId),
      clientId: googleClientId || null
    });
  });

  router.post(
    '/auth/google',
    asyncRoute(async (req, res) => {
      const body = z.object({ idToken: z.string().min(20) }).parse(req.body);
      if (!googleClient || !googleClientId) {
        return res
          .status(503)
          .json({ message: 'Google login is not configured. Set GOOGLE_CLIENT_ID.' });
      }

      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken: body.idToken,
          audience: googleClientId
        });
      } catch {
        return res.status(401).json({ message: 'Invalid Google sign-in token.' });
      }
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.sub) {
        return res.status(401).json({ message: 'Google account email is required' });
      }
      const now = new Date();
      const email = payload.email.trim().toLowerCase();
      const emailVerified = payload.email_verified === true;
      const displayName = payload.name || email;
      const avatarUrl = payload.picture || null;
      const rawProfile = {
        sub: payload.sub,
        email,
        emailVerified,
        name: payload.name || null,
        givenName: payload.given_name || null,
        familyName: payload.family_name || null,
        picture: avatarUrl,
        hostedDomain: payload.hd || null,
        issuer: payload.iss || null
      } satisfies Prisma.InputJsonObject;

      const existingIdentity = await prisma.userIdentity.findUnique({
        where: {
          provider_providerUserId: {
            provider: 'GOOGLE',
            providerUserId: payload.sub
          }
        },
        include: { user: { select: googleAuthUserSelect } }
      });

      const existing = existingIdentity
        ? existingIdentity.user
        : await prisma.user.findFirst({
            where: { email, role: Role.PATIENT },
            select: googleAuthUserSelect
          });

      if (existing && existing.role !== Role.PATIENT) {
        return res.status(409).json({
          code: 'EMAIL_REGISTERED_WITH_DIFFERENT_ROLE',
          message: `This Google email is already registered as ${existing.role}. Use the provider/admin portal or another email.`
        });
      }

      let user;
      try {
        user = existing
          ? await prisma.user.update({
              where: { id: existing.id },
              data: {
                name: displayName,
                emailVerified: existing.email === email ? emailVerified || undefined : undefined,
                authProvider: existing.authProvider || 'GOOGLE',
                lastLoginAt: now,
                lastLoginMethod: 'GOOGLE',
                externalAvatarUrl: avatarUrl
              },
              select: publicUserSelect
            })
          : await createPatientRecord({
              name: displayName,
              email
            });
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message === 'EMAIL_TAKEN' || error.message === 'EMAIL_USED_BY_OTHER_ROLE')
        ) {
          return res.status(409).json({
            code: 'EMAIL_REGISTERED_WITH_DIFFERENT_ROLE',
            message: 'This Google email is already registered with another Hope Hub account.'
          });
        }
        throw error;
      }

      if (!existing) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerified,
            authProvider: 'GOOGLE',
            lastLoginAt: now,
            lastLoginMethod: 'GOOGLE',
            externalAvatarUrl: avatarUrl
          }
        });
      }

      await prisma.userIdentity.upsert({
        where: {
          provider_providerUserId: {
            provider: 'GOOGLE',
            providerUserId: payload.sub
          }
        },
        create: {
          userId: user.id,
          provider: 'GOOGLE',
          providerUserId: payload.sub,
          email,
          emailVerified,
          displayName,
          avatarUrl,
          rawProfile,
          lastLoginAt: now
        },
        update: {
          userId: user.id,
          email,
          emailVerified,
          displayName,
          avatarUrl,
          rawProfile,
          lastLoginAt: now
        }
      });

      logAuthEvent('patient_login', {
        userId: user.id,
        event: 'google',
        googleSubject: payload.sub,
        email
      });
      res.json(toAuthResponse({ ...user, role: Role.PATIENT }));
    })
  );
}
