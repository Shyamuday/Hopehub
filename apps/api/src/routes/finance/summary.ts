import { Router } from 'express';
import { PaymentStatus, Role, StockMovementType, ExpenseLevel } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryText, routeParam } from '../../utils/helpers.js';
import {
  buildDoctorPayslip,
  buildStoreStaffPayslip,
  calcNetSalary,
  getLeaveDaysMap,
  parseMonth
} from '../../services/payroll.js';

export function registerFinanceSummaryRoutes(router: Router) {
// GET /admin/finance/summary
router.get(
  '/admin/finance/summary',
  authRequired,
  allowRoles(Role.ADMIN),
  asyncRoute(async (req, res) => {
    const month = queryText(req, 'month') || new Date().toISOString().slice(0, 7);
    const range = parseMonth(month);

    const [consultationAgg, medicineAgg, doctors, storeStaff, clinicExpenses, storeExpenses] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          createdAt: { gte: range.monthStart, lte: new Date(range.monthEnd.getFullYear(), range.monthEnd.getMonth(), range.monthEnd.getDate(), 23, 59, 59, 999) }
        },
        _sum: { amountInPaise: true },
        _count: true
      }),
      prisma.stockMovement.aggregate({
        where: {
          type: StockMovementType.SALE_OUT,
          createdAt: { gte: range.monthStart, lte: new Date(range.monthEnd.getFullYear(), range.monthEnd.getMonth(), range.monthEnd.getDate(), 23, 59, 59, 999) }
        },
        _sum: { amountInPaise: true },
        _count: true
      }),
      prisma.doctor.findMany({
        where: { employeeStatus: { not: 'TERMINATED' } },
        select: { id: true, salaryPerMonth: true }
      }),
      prisma.storeStaff.findMany({
        where: { employeeStatus: { not: 'TERMINATED' } },
        select: { id: true, salaryPerMonth: true }
      }),
      prisma.businessExpense.aggregate({
        where: { level: ExpenseLevel.CLINIC, expenseDate: { gte: range.monthStart, lte: range.monthEnd } },
        _sum: { amountInPaise: true }
      }),
      prisma.businessExpense.aggregate({
        where: { level: ExpenseLevel.STORE, expenseDate: { gte: range.monthStart, lte: range.monthEnd } },
        _sum: { amountInPaise: true }
      })
    ]);

    const leaveDaysMap = await getLeaveDaysMap(range.monthStart, range.monthEnd);
    const payrollCost = [...doctors, ...storeStaff].reduce((sum, emp) => {
      const gross = emp.salaryPerMonth ?? 0;
      const leaveDays = leaveDaysMap.get(emp.id) ?? 0;
      return sum + calcNetSalary(gross, leaveDays, range.daysInMonth);
    }, 0);

    const consultationRevenueInPaise = consultationAgg._sum.amountInPaise ?? 0;
    const medicineRevenueInPaise = medicineAgg._sum.amountInPaise ?? 0;
    const clinicExpensesInPaise = clinicExpenses._sum.amountInPaise ?? 0;
    const storeExpensesInPaise = storeExpenses._sum.amountInPaise ?? 0;
    const totalExpensesInPaise = clinicExpensesInPaise + storeExpensesInPaise;
    const totalRevenueInPaise = consultationRevenueInPaise + medicineRevenueInPaise;
    const netEstimateInPaise = totalRevenueInPaise - payrollCost - totalExpensesInPaise;

    res.json({
      month,
      consultationRevenueInPaise,
      medicineRevenueInPaise,
      totalRevenueInPaise,
      payrollCostInPaise: payrollCost,
      clinicExpensesInPaise,
      storeExpensesInPaise,
      totalExpensesInPaise,
      netEstimateInPaise,
      counts: {
        paidConsultations: consultationAgg._count,
        medicineSales: medicineAgg._count
      }
    });
  })
);

}
