import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { asyncRoute, queryText } from '../../utils/helpers.js';
import { buildAccountantExportBundle, computeBranchPnl } from '../../services/branch-finance.js';

export function registerFinanceBranchRoutes(router: Router) {
  router.get(
    '/admin/finance/branches',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const month = queryText(req, 'month') || new Date().toISOString().slice(0, 7);
      const result = await computeBranchPnl(month);
      res.json(result);
    })
  );

  router.get(
    '/admin/finance/export-bundle',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const month = queryText(req, 'month') || new Date().toISOString().slice(0, 7);
      const storeId = queryText(req, 'storeId') || undefined;
      const csv = await buildAccountantExportBundle(month, storeId);
      const suffix = storeId ? `-${storeId}` : '';
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="accountant-bundle-${month}${suffix}.csv"`
      );
      res.send(csv);
    })
  );
}
