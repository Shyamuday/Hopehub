import { ExpenseLevel, PaymentStatus, StockMovementType } from '@prisma/client';
import { prisma } from '../db.js';
import { calcNetSalary, getLeaveDaysMap, parseMonth, type MonthRange } from './payroll.js';

export const DEFAULT_MEDICINE_GST_PERCENT = 12;
export const CONSULTATION_GST_PERCENT = 0;
export const EXPENSE_GST_PERCENT = 12;

export type BranchPnlRow = {
  storeId: string | null;
  storeCode: string;
  storeName: string;
  consultationRevenueInPaise: number;
  medicineRevenueInPaise: number;
  totalRevenueInPaise: number;
  payrollCostInPaise: number;
  storeExpensesInPaise: number;
  clinicExpensesInPaise: number;
  netEstimateInPaise: number;
  counts: {
    paidConsultations: number;
    medicineSales: number;
  };
};

export type BranchPnlTotals = {
  consultationRevenueInPaise: number;
  medicineRevenueInPaise: number;
  totalRevenueInPaise: number;
  payrollCostInPaise: number;
  storeExpensesInPaise: number;
  clinicExpensesInPaise: number;
  netEstimateInPaise: number;
};

function monthEndDate(range: MonthRange): Date {
  return new Date(
    range.monthEnd.getFullYear(),
    range.monthEnd.getMonth(),
    range.monthEnd.getDate(),
    23,
    59,
    59,
    999
  );
}

function emptyTotals(): BranchPnlTotals {
  return {
    consultationRevenueInPaise: 0,
    medicineRevenueInPaise: 0,
    totalRevenueInPaise: 0,
    payrollCostInPaise: 0,
    storeExpensesInPaise: 0,
    clinicExpensesInPaise: 0,
    netEstimateInPaise: 0
  };
}

function sumTotals(rows: BranchPnlRow[]): BranchPnlTotals {
  return rows.reduce(
    (acc, row) => ({
      consultationRevenueInPaise: acc.consultationRevenueInPaise + row.consultationRevenueInPaise,
      medicineRevenueInPaise: acc.medicineRevenueInPaise + row.medicineRevenueInPaise,
      totalRevenueInPaise: acc.totalRevenueInPaise + row.totalRevenueInPaise,
      payrollCostInPaise: acc.payrollCostInPaise + row.payrollCostInPaise,
      storeExpensesInPaise: acc.storeExpensesInPaise + row.storeExpensesInPaise,
      clinicExpensesInPaise: acc.clinicExpensesInPaise + row.clinicExpensesInPaise,
      netEstimateInPaise: acc.netEstimateInPaise + row.netEstimateInPaise
    }),
    emptyTotals()
  );
}

export function splitGst(amountInPaise: number, gstRatePercent: number) {
  if (gstRatePercent <= 0) {
    return { taxableBaseInPaise: amountInPaise, gstAmountInPaise: 0, gstRatePercent: 0 };
  }
  const taxableBaseInPaise = Math.round((amountInPaise * 100) / (100 + gstRatePercent));
  return {
    taxableBaseInPaise,
    gstAmountInPaise: amountInPaise - taxableBaseInPaise,
    gstRatePercent
  };
}

export function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export async function computeBranchPnl(monthStr: string) {
  const range = parseMonth(monthStr);
  const endDate = monthEndDate(range);

  const [
    stores,
    payments,
    medicineMovements,
    storeExpenseGroups,
    clinicExpenseAgg,
    doctors,
    storeStaff,
    leaveDaysMap
  ] = await Promise.all([
    prisma.store.findMany({
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' }
    }),
    prisma.payment.findMany({
      where: { status: PaymentStatus.PAID, createdAt: { gte: range.monthStart, lte: endDate } },
      select: { amountInPaise: true, consultation: { select: { clinicStoreId: true } } }
    }),
    prisma.stockMovement.findMany({
      where: { type: StockMovementType.SALE_OUT, createdAt: { gte: range.monthStart, lte: endDate } },
      select: { storeId: true, amountInPaise: true }
    }),
    prisma.businessExpense.groupBy({
      by: ['storeId'],
      where: { level: ExpenseLevel.STORE, expenseDate: { gte: range.monthStart, lte: range.monthEnd } },
      _sum: { amountInPaise: true }
    }),
    prisma.businessExpense.aggregate({
      where: { level: ExpenseLevel.CLINIC, expenseDate: { gte: range.monthStart, lte: range.monthEnd } },
      _sum: { amountInPaise: true }
    }),
    prisma.doctor.findMany({
      where: { employeeStatus: { not: 'TERMINATED' } },
      select: { id: true, clinicStoreId: true, salaryPerMonth: true }
    }),
    prisma.storeStaff.findMany({
      where: { employeeStatus: { not: 'TERMINATED' } },
      select: { id: true, storeId: true, salaryPerMonth: true }
    }),
    getLeaveDaysMap(range.monthStart, range.monthEnd)
  ]);

  const clinicExpensesInPaise = clinicExpenseAgg._sum.amountInPaise ?? 0;

  const consultByStore = new Map<string | null, { revenue: number; count: number }>();
  for (const payment of payments) {
    const storeId = payment.consultation.clinicStoreId;
    const current = consultByStore.get(storeId) ?? { revenue: 0, count: 0 };
    current.revenue += payment.amountInPaise;
    current.count += 1;
    consultByStore.set(storeId, current);
  }

  const medicineByStore = new Map<string, { revenue: number; count: number }>();
  for (const movement of medicineMovements) {
    const current = medicineByStore.get(movement.storeId) ?? { revenue: 0, count: 0 };
    current.revenue += movement.amountInPaise ?? 0;
    current.count += 1;
    medicineByStore.set(movement.storeId, current);
  }

  const expenseByStore = new Map<string, number>();
  for (const group of storeExpenseGroups) {
    if (group.storeId) {
      expenseByStore.set(group.storeId, group._sum.amountInPaise ?? 0);
    }
  }

  const payrollByStore = new Map<string | null, number>();
  for (const doctor of doctors) {
    const net = calcNetSalary(
      doctor.salaryPerMonth,
      leaveDaysMap.get(doctor.id) ?? 0,
      range.daysInMonth
    );
    payrollByStore.set(doctor.clinicStoreId, (payrollByStore.get(doctor.clinicStoreId) ?? 0) + net);
  }
  for (const staff of storeStaff) {
    const net = calcNetSalary(
      staff.salaryPerMonth,
      leaveDaysMap.get(staff.id) ?? 0,
      range.daysInMonth
    );
    payrollByStore.set(staff.storeId, (payrollByStore.get(staff.storeId) ?? 0) + net);
  }

  const branches: BranchPnlRow[] = stores.map((store) => {
    const consult = consultByStore.get(store.id) ?? { revenue: 0, count: 0 };
    const medicine = medicineByStore.get(store.id) ?? { revenue: 0, count: 0 };
    const payroll = payrollByStore.get(store.id) ?? 0;
    const storeExpenses = expenseByStore.get(store.id) ?? 0;
    const totalRevenue = consult.revenue + medicine.revenue;
    return {
      storeId: store.id,
      storeCode: store.code,
      storeName: store.name,
      consultationRevenueInPaise: consult.revenue,
      medicineRevenueInPaise: medicine.revenue,
      totalRevenueInPaise: totalRevenue,
      payrollCostInPaise: payroll,
      storeExpensesInPaise: storeExpenses,
      clinicExpensesInPaise: 0,
      netEstimateInPaise: totalRevenue - payroll - storeExpenses,
      counts: { paidConsultations: consult.count, medicineSales: medicine.count }
    };
  });

  const unallocatedConsult = consultByStore.get(null) ?? { revenue: 0, count: 0 };
  const unallocatedPayroll = payrollByStore.get(null) ?? 0;
  if (unallocatedConsult.revenue > 0 || unallocatedPayroll > 0 || clinicExpensesInPaise > 0) {
    branches.push({
      storeId: null,
      storeCode: 'CLINIC',
      storeName: 'Clinic (online / unallocated)',
      consultationRevenueInPaise: unallocatedConsult.revenue,
      medicineRevenueInPaise: 0,
      totalRevenueInPaise: unallocatedConsult.revenue,
      payrollCostInPaise: unallocatedPayroll,
      storeExpensesInPaise: 0,
      clinicExpensesInPaise: clinicExpensesInPaise,
      netEstimateInPaise: unallocatedConsult.revenue - unallocatedPayroll - clinicExpensesInPaise,
      counts: { paidConsultations: unallocatedConsult.count, medicineSales: 0 }
    });
  }

  return {
    month: monthStr,
    branches,
    clinicExpensesInPaise,
    totals: sumTotals(branches)
  };
}


export async function buildAccountantExportBundle(monthStr: string, filterStoreId?: string): Promise<string> {
  const range = parseMonth(monthStr);
  const endDate = monthEndDate(range);
  const pnl = await computeBranchPnl(monthStr);
  const filteredBranches = filterStoreId
    ? pnl.branches.filter((row) =>
        filterStoreId === 'CLINIC' ? row.storeId == null : row.storeId === filterStoreId
      )
    : pnl.branches;

  const storeFilter = filterStoreId && filterStoreId !== 'CLINIC' ? filterStoreId : undefined;
  const clinicOnly = filterStoreId === 'CLINIC';

  const [payments, medicineMovements, expenses, doctors, storeStaff, leaveDaysMap] = await Promise.all([
    prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        createdAt: { gte: range.monthStart, lte: endDate },
        ...(storeFilter
          ? { consultation: { clinicStoreId: storeFilter } }
          : clinicOnly
            ? { consultation: { clinicStoreId: null } }
            : {})
      },
      include: {
        consultation: {
          select: {
            id: true,
            clinicStore: { select: { id: true, code: true, name: true } },
            patient: { select: { name: true } },
            assignedDoctor: { select: { name: true } },
            disease: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.stockMovement.findMany({
      where: {
        type: StockMovementType.SALE_OUT,
        createdAt: { gte: range.monthStart, lte: endDate },
        ...(storeFilter ? { storeId: storeFilter } : clinicOnly ? { storeId: '__none__' } : {})
      },
      include: {
        store: { select: { code: true, name: true } },
        stock: { include: { medicine: { select: { name: true, potency: true } } } }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.businessExpense.findMany({
      where: {
        expenseDate: { gte: range.monthStart, lte: range.monthEnd },
        ...(storeFilter
          ? { level: ExpenseLevel.STORE, storeId: storeFilter }
          : clinicOnly
            ? { level: ExpenseLevel.CLINIC }
            : {})
      },
      include: { store: { select: { code: true, name: true } } },
      orderBy: { expenseDate: 'asc' }
    }),
    prisma.doctor.findMany({
      where: {
        employeeStatus: { not: 'TERMINATED' },
        ...(storeFilter ? { clinicStoreId: storeFilter } : clinicOnly ? { clinicStoreId: null } : {})
      },
      select: {
        id: true,
        designation: true,
        department: true,
        salaryPerMonth: true,
        clinicStoreId: true,
        clinicStore: { select: { code: true, name: true } },
        user: { select: { name: true } }
      }
    }),
    prisma.storeStaff.findMany({
      where: {
        employeeStatus: { not: 'TERMINATED' },
        ...(storeFilter ? { storeId: storeFilter } : clinicOnly ? { storeId: '__none__' } : {})
      },
      select: {
        id: true,
        name: true,
        designation: true,
        department: true,
        salaryPerMonth: true,
        store: { select: { code: true, name: true } }
      }
    }),
    getLeaveDaysMap(range.monthStart, range.monthEnd)
  ]);

  const lines: string[] = [
    `# Accountant export bundle — ${monthStr}`,
    `# Generated at ${new Date().toISOString()}`,
    filterStoreId ? `# Branch filter: ${filterStoreId}` : '# Branch filter: all',
    '',
    '# SECTION: BRANCH_PNL',
    [
      'storeCode',
      'storeName',
      'consultationRevenueInPaise',
      'medicineRevenueInPaise',
      'totalRevenueInPaise',
      'payrollCostInPaise',
      'storeExpensesInPaise',
      'clinicExpensesInPaise',
      'netEstimateInPaise',
      'paidConsultations',
      'medicineSales'
    ].join(',')
  ];

  for (const row of filteredBranches) {
    lines.push(
      [
        csvCell(row.storeCode),
        csvCell(row.storeName),
        row.consultationRevenueInPaise,
        row.medicineRevenueInPaise,
        row.totalRevenueInPaise,
        row.payrollCostInPaise,
        row.storeExpensesInPaise,
        row.clinicExpensesInPaise,
        row.netEstimateInPaise,
        row.counts.paidConsultations,
        row.counts.medicineSales
      ].join(',')
    );
  }

  lines.push('', '# SECTION: PAYMENTS_GST_READY');
  lines.push(
    [
      'paymentId',
      'branchCode',
      'branchName',
      'patientName',
      'doctorName',
      'disease',
      'amountInPaise',
      'taxableBaseInPaise',
      'gstRatePercent',
      'gstAmountInPaise',
      'vendorGstin',
      'status',
      'createdAt'
    ].join(',')
  );

  for (const payment of payments) {
    const branch = payment.consultation.clinicStore;
    const gst = splitGst(payment.amountInPaise, CONSULTATION_GST_PERCENT);
    lines.push(
      [
        csvCell(payment.id),
        csvCell(branch?.code ?? 'CLINIC'),
        csvCell(branch?.name ?? 'Clinic (online / unallocated)'),
        csvCell(payment.consultation.patient?.name),
        csvCell(payment.consultation.assignedDoctor?.name),
        csvCell(payment.consultation.disease?.name),
        payment.amountInPaise,
        gst.taxableBaseInPaise,
        gst.gstRatePercent,
        gst.gstAmountInPaise,
        csvCell(''),
        csvCell(payment.status),
        csvCell(payment.createdAt.toISOString())
      ].join(',')
    );
  }

  lines.push('', '# SECTION: MEDICINE_SALES_GST_READY');
  lines.push(
    [
      'movementId',
      'branchCode',
      'branchName',
      'medicine',
      'qty',
      'amountInPaise',
      'taxableBaseInPaise',
      'gstRatePercent',
      'gstAmountInPaise',
      'createdAt'
    ].join(',')
  );

  for (const movement of medicineMovements) {
    const amount = movement.amountInPaise ?? 0;
    const gst = splitGst(amount, DEFAULT_MEDICINE_GST_PERCENT);
    const medicineName = movement.stock?.medicine
      ? `${movement.stock.medicine.name} ${movement.stock.medicine.potency ?? ''}`.trim()
      : '';
    lines.push(
      [
        csvCell(movement.id),
        csvCell(movement.store?.code),
        csvCell(movement.store?.name),
        csvCell(medicineName),
        movement.qty,
        amount,
        gst.taxableBaseInPaise,
        gst.gstRatePercent,
        gst.gstAmountInPaise,
        csvCell(movement.createdAt.toISOString())
      ].join(',')
    );
  }

  lines.push('', '# SECTION: PAYROLL');
  lines.push(
    [
      'employeeName',
      'employeeType',
      'branchCode',
      'branchName',
      'designation',
      'department',
      'grossInPaise',
      'leaveDays',
      'deductionInPaise',
      'netInPaise',
      'gstRatePercent'
    ].join(',')
  );

  for (const doctor of doctors) {
    const gross = doctor.salaryPerMonth ?? 0;
    const leaveDays = leaveDaysMap.get(doctor.id) ?? 0;
    const net = calcNetSalary(gross, leaveDays, range.daysInMonth);
    lines.push(
      [
        csvCell(doctor.user.name),
        csvCell('DOCTOR'),
        csvCell(doctor.clinicStore?.code ?? 'CLINIC'),
        csvCell(doctor.clinicStore?.name ?? 'Clinic (online / unallocated)'),
        csvCell(doctor.designation),
        csvCell(doctor.department),
        gross,
        leaveDays,
        gross - net,
        net,
        0
      ].join(',')
    );
  }

  for (const staff of storeStaff) {
    const gross = staff.salaryPerMonth ?? 0;
    const leaveDays = leaveDaysMap.get(staff.id) ?? 0;
    const net = calcNetSalary(gross, leaveDays, range.daysInMonth);
    lines.push(
      [
        csvCell(staff.name),
        csvCell('STORE_STAFF'),
        csvCell(staff.store.code),
        csvCell(staff.store.name),
        csvCell(staff.designation),
        csvCell(staff.department),
        gross,
        leaveDays,
        gross - net,
        net,
        0
      ].join(',')
    );
  }

  lines.push('', '# SECTION: EXPENSES_GST_READY');
  lines.push(
    [
      'expenseId',
      'level',
      'branchCode',
      'branchName',
      'category',
      'description',
      'vendor',
      'billNo',
      'vendorGstin',
      'amountInPaise',
      'taxableBaseInPaise',
      'gstRatePercent',
      'gstAmountInPaise',
      'expenseDate'
    ].join(',')
  );

  for (const expense of expenses) {
    const gst = splitGst(expense.amountInPaise, EXPENSE_GST_PERCENT);
    lines.push(
      [
        csvCell(expense.id),
        csvCell(expense.level),
        csvCell(expense.store?.code ?? 'CLINIC'),
        csvCell(expense.store?.name ?? 'Clinic (online / unallocated)'),
        csvCell(expense.category),
        csvCell(expense.description),
        csvCell(expense.vendor),
        csvCell(expense.billNo),
        csvCell(''),
        expense.amountInPaise,
        gst.taxableBaseInPaise,
        gst.gstRatePercent,
        gst.gstAmountInPaise,
        csvCell(expense.expenseDate.toISOString().slice(0, 10))
      ].join(',')
    );
  }

  return lines.join('\n');
}
