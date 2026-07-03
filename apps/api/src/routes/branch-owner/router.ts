import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryText } from '../../utils/helpers.js';
import { computeBranchPnl } from '../../services/branch-finance.js';
import { getClinicManagerDashboard } from '../../services/clinic-manager-hub.js';

const roles = [Role.BRANCH_OWNER, Role.ADMIN] as const;

export function createBranchOwnerRouter() {
  const router = Router();

  router.get(
    '/branch-owner/me',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const profile = await prisma.branchOwnerProfile.findUnique({
        where: { userId: req.user!.id },
        include: { store: { select: { id: true, name: true, code: true, address: true } } }
      });
      res.json({ user: req.user, profile, store: profile?.store ?? null });
    })
  );

  router.get(
    '/branch-owner/dashboard',
    authRequired,
    allowRoles(...roles),
    asyncRoute(async (req, res) => {
      const profile = await prisma.branchOwnerProfile.findUnique({
        where: { userId: req.user!.id }
      });
      if (!profile && req.user!.role !== Role.ADMIN) {
        return res.status(403).json({ message: 'Branch owner profile not found.' });
      }
      const storeId = profile?.storeId ?? queryText(req, 'storeId');
      if (!storeId) {
        return res.status(400).json({ message: 'storeId is required.' });
      }
      const month = queryText(req, 'month') || new Date().toISOString().slice(0, 7);
      const [pnl, ops] = await Promise.all([
        computeBranchPnl(month),
        getClinicManagerDashboard(storeId)
      ]);
      const branch = pnl.branches.find((row) => row.storeId === storeId) ?? null;
      res.json({ month, branch, totals: pnl.totals, operations: ops });
    })
  );

  return router;
}
