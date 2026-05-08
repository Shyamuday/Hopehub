import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import type express from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { allowRoles, authRequired } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute } from '../middleware/async-route.js';

const profileDbSelect = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  allergies: true,
  currentMedications: true,
  chronicConditions: true,
  deliveryAddressLine1: true,
  deliveryAddressLine2: true,
  deliveryCity: true,
  deliveryState: true,
  deliveryPincode: true,
  passwordHash: true
} as const;

function toProfileResponse(row: {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  allergies: string | null;
  currentMedications: string | null;
  chronicConditions: string | null;
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryPincode: string | null;
  passwordHash: string | null;
}) {
  const { passwordHash, ...rest } = row;
  return { ...rest, hasPassword: Boolean(passwordHash) };
}

export function registerPatientProfileRoutes(app: express.Application) {
  app.get(
    '/patient/profile',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        select: profileDbSelect
      });
      res.json({ profile: toProfileResponse(user) });
    })
  );

  app.put(
    '/patient/profile',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(1).max(100),
          allergies: z.string().max(1000).optional(),
          currentMedications: z.string().max(2000).optional(),
          chronicConditions: z.string().max(1000).optional(),
          deliveryAddressLine1: z.string().max(200).optional().nullable(),
          deliveryAddressLine2: z.string().max(200).optional().nullable(),
          deliveryCity: z.string().max(100).optional().nullable(),
          deliveryState: z.string().max(100).optional().nullable(),
          deliveryPincode: z.string().max(16).optional().nullable()
        })
        .parse(req.body);

      const raw = req.body as Record<string, unknown>;
      const data: Prisma.UserUpdateInput = {
        name: body.name,
        allergies: body.allergies,
        currentMedications: body.currentMedications,
        chronicConditions: body.chronicConditions
      };

      if (Object.hasOwn(raw, 'deliveryAddressLine1')) {
        const v = body.deliveryAddressLine1;
        data.deliveryAddressLine1 = typeof v === 'string' ? v.trim() || null : null;
      }
      if (Object.hasOwn(raw, 'deliveryAddressLine2')) {
        const v = body.deliveryAddressLine2;
        data.deliveryAddressLine2 = typeof v === 'string' ? v.trim() || null : null;
      }
      if (Object.hasOwn(raw, 'deliveryCity')) {
        const v = body.deliveryCity;
        data.deliveryCity = typeof v === 'string' ? v.trim() || null : null;
      }
      if (Object.hasOwn(raw, 'deliveryState')) {
        const v = body.deliveryState;
        data.deliveryState = typeof v === 'string' ? v.trim() || null : null;
      }
      if (Object.hasOwn(raw, 'deliveryPincode')) {
        const v = body.deliveryPincode;
        data.deliveryPincode = typeof v === 'string' ? v.trim() || null : null;
      }

      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data,
        select: profileDbSelect
      });
      res.json({ profile: toProfileResponse(updated) });
    })
  );

  app.post(
    '/patient/account/password',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          newPassword: z.string().min(8),
          currentPassword: z.string().optional()
        })
        .parse(req.body);

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        select: { id: true, passwordHash: true }
      });

      if (user.passwordHash) {
        if (!body.currentPassword) {
          return res.status(400).json({ message: 'Current password is required.' });
        }
        const same = await bcrypt.compare(body.currentPassword, user.passwordHash);
        if (!same) {
          return res.status(401).json({ message: 'Current password is incorrect.' });
        }
      }

      const passwordHash = await bcrypt.hash(body.newPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      });

      res.json({ ok: true });
    })
  );
}
