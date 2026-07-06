import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { asyncRoute, queryText } from '../../utils/helpers.js';
import {
  computeFinancePeriodReport,
  type FinanceGranularity,
  type FinancePeriodPreset
} from '../../services/finance-period-report.js';

export function registerFinancePeriodReportRoutes(router: Router) {
  router.get(
    '/admin/finance/period-report',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const preset = queryText(req, 'preset') as FinancePeriodPreset | undefined;
      const from = queryText(req, 'from') || undefined;
      const to = queryText(req, 'to') || undefined;
      const granularity = queryText(req, 'granularity') as FinanceGranularity | undefined;
      const storeScope = queryText(req, 'storeScope') || 'ALL';

      z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional().parse(granularity);

      const report = await computeFinancePeriodReport({
        preset: preset ?? null,
        from,
        to,
        granularity,
        storeScope: storeScope === 'ONLINE' ? 'ONLINE' : storeScope
      });

      res.json(report);
    })
  );
}
