import { Router } from 'express';
import { HR_API_ROUTES } from '../../constants/hr-api-routes.constants.js';
import { asyncRoute } from '../../utils/helpers.js';
import { buildAdminPayrollMonth } from '../../services/payroll.js';
import { getAccess, hrAuthMiddleware } from './shared.js';

export function registerHrPayrollRoutes(router: Router) {
// ─── Payroll Summary ──────────────────────────────────────────────────────────

// GET /hr/payroll?month=YYYY-MM — monthly payroll summary
router.get(HR_API_ROUTES.PAYROLL, hrAuthMiddleware, asyncRoute(async (req, res) => {
  const { storeIds } = getAccess(req);
  const monthStr = (req.query['month'] as string) ?? new Date().toISOString().slice(0, 7);
  const result = await buildAdminPayrollMonth(monthStr, storeIds ?? undefined);
  res.json(result);
}));
}
