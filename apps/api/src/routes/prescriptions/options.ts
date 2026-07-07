import { Router } from 'express';
import { z } from 'zod';
import { PrescriptionOptionType, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, normalizeOptionLabel, queryText } from '../../utils/helpers.js';
import { syncSystemMethodOptions } from '../../services/sync-system-method-options.js';

export function registerPrescriptionOptionRoutes(router: Router) {
  // ─── Prescription options ──────────────────────────────────────────────────────

  router.post(
    '/doctor/prescription-options',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({ type: z.nativeEnum(PrescriptionOptionType), label: z.string().min(2) })
        .parse(req.body);

      const normalized = normalizeOptionLabel(body.label);
      const option = await prisma.prescriptionOption.upsert({
        where: { type_normalizedLabel: { type: body.type, normalizedLabel: normalized } },
        update: { label: body.label.trim() },
        create: { type: body.type, label: body.label.trim(), normalizedLabel: normalized, isSystem: false, createdById: req.user!.id }
      });

      res.status(201).json({ option });
    })
  );

  router.get(
    '/doctor/prescription-options',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const query = z.object({ type: z.nativeEnum(PrescriptionOptionType) }).parse(req.query);
      if (query.type === PrescriptionOptionType.METHOD) {
        await syncSystemMethodOptions(prisma);
      }
      const search = queryText(req, 'q').trim();
      const options = await prisma.prescriptionOption.findMany({
        where: {
          type: query.type,
          ...(search ? { label: { contains: search, mode: 'insensitive' } } : {})
        },
        orderBy: [{ isSystem: 'desc' }, { label: 'asc' }],
        ...(search ? { take: 50 } : {})
      });
      res.json({ options });
    })
  );

}
