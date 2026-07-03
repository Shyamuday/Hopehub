import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, patientProfileSelect } from '../../utils/helpers.js';
import { buildPatientIdCard } from '../../services/patient-identity.js';
import {
  capabilitiesForRole,
  defaultRouteForRole,
  portalForRole,
  sessionPayloadForUser
} from '../../constants/rbac-helpers.js';

export function registerAuthProfileRoutes(router: Router) {
// ─── Session / profile ───────────────────────────────────────────────────────

router.get('/me', authRequired, (req, res) => {
  res.json(sessionPayloadForUser(req.user!));
});

router.get('/capabilities', authRequired, (req, res) => {
  const role = req.user!.role;
  res.json({
    role,
    capabilities: capabilitiesForRole(role),
    portal: portalForRole(role),
    defaultRoute: defaultRouteForRole(role)
  });
});

router.get(
  '/patient/profile',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: req.user!.id },
      select: patientProfileSelect
    });
    res.json({ profile: user });
  })
);

router.get(
  '/patient/card',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const card = await buildPatientIdCard(req.user!.id);
    if (!card) {
      return res.status(404).json({ message: 'Patient ID card is not available yet.' });
    }
    res.json({ card });
  })
);

router.put(
  '/patient/profile',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(1).max(100),
        allergies: z.string().max(1000).optional(),
        currentMedications: z.string().max(1000).optional(),
        chronicConditions: z.string().max(1000).optional()
      })
      .parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: body,
      select: patientProfileSelect
    });

    res.json({ profile: updated });
  })
);
}
