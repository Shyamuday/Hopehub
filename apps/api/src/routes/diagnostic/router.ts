import { Router } from 'express';
import { z } from 'zod';
import { LabReferralStatus, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { asyncRoute, queryText, routeParam } from '../../utils/helpers.js';
import {
  getLabReferral,
  listLabReferrals,
  partnerAcceptLabReferral,
  partnerAdvanceLabReferral,
  partnerSubmitLabResults,
  resolveDiagnosticCenterId
} from '../../services/lab-referrals.js';
import { prisma } from '../../db.js';

const diagnosticRoles = [Role.DIAGNOSTIC_PARTNER, Role.ADMIN] as const;

export function createDiagnosticRouter() {
  const router = Router();

  router.get(
    '/diagnostic/me',
    authRequired,
    allowRoles(...diagnosticRoles),
    asyncRoute(async (req, res) => {
      const diagnosticCenterId = await resolveDiagnosticCenterId(req.user!.id, req.user!.role);
      const profile = await prisma.diagnosticCenterProfile.findUnique({
        where: { userId: req.user!.id },
        include: { diagnosticCenter: true }
      });
      res.json({
        user: req.user,
        diagnosticCenterId,
        profile,
        diagnosticCenter: profile?.diagnosticCenter ?? null
      });
    })
  );

  router.get(
    '/diagnostic/referrals',
    authRequired,
    allowRoles(...diagnosticRoles),
    asyncRoute(async (req, res) => {
      const diagnosticCenterId = await resolveDiagnosticCenterId(req.user!.id, req.user!.role);
      if (req.user!.role === Role.DIAGNOSTIC_PARTNER && !diagnosticCenterId) {
        return res.status(400).json({ message: 'Diagnostic center profile not found.' });
      }
      const status = queryText(req, 'status') as LabReferralStatus | undefined;
      const referrals = await listLabReferrals({
        diagnosticCenterId: diagnosticCenterId ?? (queryText(req, 'diagnosticCenterId') || undefined),
        status: status || undefined
      });
      res.json({ referrals });
    })
  );

  router.get(
    '/diagnostic/referrals/:id',
    authRequired,
    allowRoles(...diagnosticRoles),
    asyncRoute(async (req, res) => {
      const diagnosticCenterId = await resolveDiagnosticCenterId(req.user!.id, req.user!.role);
      const referral = await getLabReferral(routeParam(req, 'id'));
      if (!referral) return res.status(404).json({ message: 'Referral not found.' });
      if (
        req.user!.role === Role.DIAGNOSTIC_PARTNER &&
        referral.diagnosticCenterId !== diagnosticCenterId
      ) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      res.json(referral);
    })
  );

  router.post(
    '/diagnostic/referrals/:id/accept',
    authRequired,
    allowRoles(...diagnosticRoles),
    asyncRoute(async (req, res) => {
      const diagnosticCenterId = await resolveDiagnosticCenterId(req.user!.id, req.user!.role);
      const referral = await getLabReferral(routeParam(req, 'id'));
      if (!referral) return res.status(404).json({ message: 'Referral not found.' });
      const effectiveCenterId =
        req.user!.role === Role.ADMIN ? referral.diagnosticCenterId : diagnosticCenterId!;
      if (!effectiveCenterId) {
        return res.status(400).json({ message: 'Diagnostic center profile not found.' });
      }

      const body = z
        .object({
          partnerNotes: z.string().optional(),
          expectedResultDate: z.string().optional()
        })
        .parse(req.body);

      const updated = await partnerAcceptLabReferral(routeParam(req, 'id'), effectiveCenterId, body);
      res.json(updated);
    })
  );

  router.post(
    '/diagnostic/referrals/:id/advance',
    authRequired,
    allowRoles(...diagnosticRoles),
    asyncRoute(async (req, res) => {
      const diagnosticCenterId = await resolveDiagnosticCenterId(req.user!.id, req.user!.role);
      const referral = await getLabReferral(routeParam(req, 'id'));
      if (!referral) return res.status(404).json({ message: 'Referral not found.' });
      const effectiveCenterId =
        req.user!.role === Role.ADMIN ? referral.diagnosticCenterId : diagnosticCenterId!;
      if (!effectiveCenterId) {
        return res.status(400).json({ message: 'Diagnostic center profile not found.' });
      }

      const body = z
        .object({
          status: z.enum(['SAMPLE_COLLECTED', 'IN_PROGRESS'])
        })
        .parse(req.body);

      const updated = await partnerAdvanceLabReferral(
        routeParam(req, 'id'),
        effectiveCenterId,
        body.status
      );
      res.json(updated);
    })
  );

  router.post(
    '/diagnostic/referrals/:id/results',
    authRequired,
    allowRoles(...diagnosticRoles),
    asyncRoute(async (req, res) => {
      const diagnosticCenterId = await resolveDiagnosticCenterId(req.user!.id, req.user!.role);
      const referral = await getLabReferral(routeParam(req, 'id'));
      if (!referral) return res.status(404).json({ message: 'Referral not found.' });
      const effectiveCenterId =
        req.user!.role === Role.ADMIN ? referral.diagnosticCenterId : diagnosticCenterId!;
      if (!effectiveCenterId) {
        return res.status(400).json({ message: 'Diagnostic center profile not found.' });
      }

      const body = z
        .object({
          lines: z
            .array(
              z.object({
                lineId: z.string().min(1),
                resultSummary: z.string().min(1),
                resultFileUrl: z.string().optional()
              })
            )
            .min(1)
        })
        .parse(req.body);

      const updated = await partnerSubmitLabResults(
        routeParam(req, 'id'),
        effectiveCenterId,
        body.lines
      );
      res.json(updated);
    })
  );

  return router;
}
