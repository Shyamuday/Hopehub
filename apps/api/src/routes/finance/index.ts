import { Router } from 'express';
import { registerFinanceBranchRoutes } from './branches.js';
import { registerFinanceExpenseRoutes } from './expenses.js';
import { registerFinanceOutstandingRoutes } from './outstanding.js';
import { registerFinancePayslipRoutes } from './payslip.js';
import { registerFinanceRevenueRoutes } from './revenue.js';
import { registerFinanceSummaryRoutes } from './summary.js';

export const financeRouter = Router();

registerFinanceSummaryRoutes(financeRouter);
registerFinanceBranchRoutes(financeRouter);
registerFinanceRevenueRoutes(financeRouter);
registerFinanceOutstandingRoutes(financeRouter);
registerFinancePayslipRoutes(financeRouter);
registerFinanceExpenseRoutes(financeRouter);
