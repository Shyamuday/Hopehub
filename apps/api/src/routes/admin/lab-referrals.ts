import { Router } from 'express';
import { z } from 'zod';
import { LabReferralStatus } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { Role } from '@prisma/client';
import { asyncRoute, queryText, routeParam } from '../../utils/helpers.js';
import {
  createLabReferral,
  getLabReferral,
  listLabReferrals
} from '../../services/lab-referrals.js';

export function registerAdminLabReferralRoutes(router: Router) {
  router.get(
    '/admin/lab-referrals',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const status = queryText(req, 'status') as LabReferralStatus | undefined;
      const referrals = await listLabReferrals({
        storeId: queryText(req, 'storeId') || undefined,
        patientId: queryText(req, 'patientId') || undefined,
        diagnosticCenterId: queryText(req, 'diagnosticCenterId') || undefined,
        status: status || undefined
      });
      res.json({ referrals });
    })
  );

  router.get(
    '/admin/lab-referrals/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const referral = await getLabReferral(routeParam(req, 'id'));
      if (!referral) return res.status(404).json({ message: 'Referral not found.' });
      res.json(referral);
    })
  );

  router.post(
    '/admin/lab-referrals',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          diagnosticCenterId: z.string().min(1),
          storeId: z.string().min(1),
          patientId: z.string().min(1),
          consultationId: z.string().optional(),
          clinicalNotes: z.string().optional(),
          expectedResultDate: z.string().optional(),
          lines: z
            .array(
              z.object({
                testName: z.string().min(1),
                testCode: z.string().optional(),
                specimen: z.string().optional()
              })
            )
            .min(1)
        })
        .parse(req.body);

      const referral = await createLabReferral({
        ...body,
        createdById: req.user!.id,
        send: true
      });
      res.status(201).json(referral);
    })
  );
}
