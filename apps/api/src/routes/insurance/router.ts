import { Router } from 'express';
import { z } from 'zod';
import { InsuranceClaimStatus, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam } from '../../utils/helpers.js';

const roles = [Role.INSURANCE_PARTNER, Role.ADMIN] as const;

function claimNumber() {
  return `CLM-${Date.now().toString(36).toUpperCase()}`;
}

export function createInsuranceRouter() {
  const router = Router();

  router.get(
    '/insurance/me',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const profile = await prisma.insurancePartnerProfile.findUnique({
        where: { userId: req.user!.id }
      });
      res.json({ user: req.user, profile });
    })
  );

  router.get(
    '/insurance/claims',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const profile = await prisma.insurancePartnerProfile.findUnique({
        where: { userId: req.user!.id }
      });
      if (!profile && req.user!.role !== Role.ADMIN) {
        return res.status(403).json({ message: 'Insurance partner profile not found.' });
      }
      const claims = await prisma.insuranceClaim.findMany({
        where: profile ? { partnerId: profile.id } : {},
        include: {
          patient: { select: { id: true, name: true, patientCode: true, mobile: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      res.json({ claims });
    })
  );

  router.post(
    '/insurance/claims',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const profile = await prisma.insurancePartnerProfile.findUnique({
        where: { userId: req.user!.id }
      });
      if (!profile) {
        return res.status(403).json({ message: 'Insurance partner profile not found.' });
      }
      const body = z
        .object({
          patientId: z.string().min(1),
          claimAmountInPaise: z.number().int().min(1),
          description: z.string().optional()
        })
        .parse(req.body);

      const claim = await prisma.insuranceClaim.create({
        data: {
          claimNumber: claimNumber(),
          partnerId: profile.id,
          patientId: body.patientId,
          claimAmountInPaise: body.claimAmountInPaise,
          description: body.description,
          status: InsuranceClaimStatus.SUBMITTED
        },
        include: {
          patient: { select: { id: true, name: true, patientCode: true } }
        }
      });
      res.status(201).json({ claim });
    })
  );

  router.patch(
    '/insurance/claims/:id/status',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const profile = await prisma.insurancePartnerProfile.findUnique({
        where: { userId: req.user!.id }
      });
      if (!profile) {
        return res.status(403).json({ message: 'Insurance partner profile not found.' });
      }
      const body = z.object({ status: z.nativeEnum(InsuranceClaimStatus) }).parse(req.body);
      const claim = await prisma.insuranceClaim.updateMany({
        where: { id, partnerId: profile.id },
        data: { status: body.status }
      });
      if (!claim.count) {
        return res.status(404).json({ message: 'Claim not found.' });
      }
      const updated = await prisma.insuranceClaim.findUnique({ where: { id } });
      res.json({ claim: updated });
    })
  );

  return router;
}
