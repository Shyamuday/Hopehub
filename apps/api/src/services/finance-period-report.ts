import { ExpenseLevel, PaymentStatus, StockMovementType } from '@prisma/client';
import { prisma } from '../db.js';
import { calcNetSalary, getLeaveDaysMap, parseMonth } from './payroll.js';

export type FinanceGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type FinancePeriodPreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_2_years'
  | 'last_3_years'
  | 'custom';

export type FinanceStoreScope = 'ALL' | 'ONLINE' | string;

export type FinanceBucketRow = {
  key: string;
  label: string;
  start: string;
  end: string;
  consultationRevenueInPaise: number;
  medicineRevenueInPaise: number;
  totalRevenueInPaise: number;
  pendingConsultationRevenueInPaise: number;
  payrollCostInPaise: number;
  storeExpensesInPaise: number;
  clinicExpensesInPaise: number;
  totalExpensesInPaise: number;
  netEstimateInPaise: number;
  counts: {
    paidConsultations: number;
    pendingConsultations: number;
    medicineSales: number;
  };
};

export type FinanceStoreBreakdownRow = {
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
};

export type FinancePeriodReport = {
  preset: FinancePeriodPreset | null;
  granularity: FinanceGranularity;
  storeScope: FinanceStoreScope;
  from: string;
  to: string;
  buckets: FinanceBucketRow[];
  byStore: FinanceStoreBreakdownRow[];
  totals: Omit<FinanceBucketRow, 'key' | 'label' | 'start' | 'end'>;
};

const MAX_RANGE_DAYS = 365 * 5;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysInclusive(start: Date, end: Date): number {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

function clampRange(from: Date, to: Date): { from: Date; to: Date } {
  if (from > to) return { from: to, to: from };
  const maxTo = new Date(from);
  maxTo.setDate(maxTo.getDate() + MAX_RANGE_DAYS - 1);
  return { from, to: to > maxTo ? maxTo : to };
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function resolvePeriodFromPreset(
  preset: FinancePeriodPreset,
  customFrom?: string,
  customTo?: string
): { from: Date; to: Date; preset: FinancePeriodPreset } {
  const now = new Date();
  const today = startOfDay(now);

  if (preset === 'custom') {
    if (!customFrom || !customTo) {
      throw new Error('Custom period requires from and to dates.');
    }
    const range = clampRange(startOfDay(parseLocalDate(customFrom)), endOfDay(parseLocalDate(customTo)));
    return { ...range, preset };
  }

  if (preset === 'today') {
    return { from: today, to: endOfDay(today), preset };
  }

  if (preset === 'this_week') {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    return { from: weekStart, to: endOfDay(today), preset };
  }

  if (preset === 'this_month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    return { ...clampRange(from, to), preset };
  }

  if (preset === 'this_quarter') {
    const quarter = Math.floor(today.getMonth() / 3);
    const from = new Date(today.getFullYear(), quarter * 3, 1);
    const to = endOfDay(new Date(today.getFullYear(), quarter * 3 + 3, 0));
    return { ...clampRange(from, to), preset };
  }

  if (preset === 'this_year') {
    const from = new Date(today.getFullYear(), 0, 1);
    const to = endOfDay(new Date(today.getFullYear(), 11, 31));
    return { ...clampRange(from, to), preset };
  }

  if (preset === 'last_2_years') {
    const from = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
    return { ...clampRange(from, endOfDay(today)), preset };
  }

  const from = new Date(today.getFullYear() - 3, today.getMonth(), today.getDate());
  return { ...clampRange(from, endOfDay(today)), preset: 'last_3_years' };
}

export function suggestGranularity(from: Date, to: Date): FinanceGranularity {
  const days = daysInclusive(from, to);
  if (days <= 31) return 'daily';
  if (days <= 92) return 'weekly';
  if (days <= 730) return 'monthly';
  return 'yearly';
}

function emptyBucketCounts() {
  return { paidConsultations: 0, pendingConsultations: 0, medicineSales: 0 };
}

function emptyBucket(): Omit<FinanceBucketRow, 'key' | 'label' | 'start' | 'end'> {
  return {
    consultationRevenueInPaise: 0,
    medicineRevenueInPaise: 0,
    totalRevenueInPaise: 0,
    pendingConsultationRevenueInPaise: 0,
    payrollCostInPaise: 0,
    storeExpensesInPaise: 0,
    clinicExpensesInPaise: 0,
    totalExpensesInPaise: 0,
    netEstimateInPaise: 0,
    counts: emptyBucketCounts()
  };
}

export function buildPeriodBuckets(
  from: Date,
  to: Date,
  granularity: FinanceGranularity
): Array<{ key: string; label: string; start: Date; end: Date }> {
  const buckets: Array<{ key: string; label: string; start: Date; end: Date }> = [];
  let cursor = startOfDay(from);
  const end = startOfDay(to);

  while (cursor <= end) {
    let bucketStart = new Date(cursor);
    let bucketEnd: Date;

    if (granularity === 'daily') {
      bucketEnd = endOfDay(cursor);
    } else if (granularity === 'weekly') {
      bucketEnd = endOfDay(cursor);
      bucketEnd.setDate(bucketEnd.getDate() + 6);
    } else if (granularity === 'monthly') {
      bucketStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      bucketEnd = endOfDay(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));
    } else {
      bucketStart = new Date(cursor.getFullYear(), 0, 1);
      bucketEnd = endOfDay(new Date(cursor.getFullYear(), 11, 31));
    }

    if (bucketEnd > endOfDay(to)) bucketEnd = endOfDay(to);
    if (bucketStart < startOfDay(from)) bucketStart = startOfDay(from);

    const key =
      granularity === 'yearly'
        ? String(bucketStart.getFullYear())
        : granularity === 'monthly'
          ? `${bucketStart.getFullYear()}-${String(bucketStart.getMonth() + 1).padStart(2, '0')}`
          : isoDate(bucketStart);

    const label =
      granularity === 'yearly'
        ? String(bucketStart.getFullYear())
        : granularity === 'monthly'
          ? bucketStart.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          : granularity === 'weekly'
            ? `${isoDate(bucketStart)} – ${isoDate(bucketEnd)}`
            : bucketStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    buckets.push({ key, label, start: bucketStart, end: bucketEnd });

    if (granularity === 'daily') {
      cursor.setDate(cursor.getDate() + 1);
    } else if (granularity === 'weekly') {
      cursor.setDate(cursor.getDate() + 7);
    } else if (granularity === 'monthly') {
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    } else {
      cursor = new Date(cursor.getFullYear() + 1, 0, 1);
    }
  }

  return buckets;
}

function findBucketIndex(
  buckets: Array<{ start: Date; end: Date }>,
  date: Date
): number {
  const t = date.getTime();
  return buckets.findIndex((b) => t >= b.start.getTime() && t <= b.end.getTime());
}

function proRatedPayroll(monthlyNetPaise: number, bucketStart: Date, bucketEnd: Date): number {
  if (!monthlyNetPaise) return 0;
  let total = 0;
  let cursor = new Date(bucketStart.getFullYear(), bucketStart.getMonth(), 1);
  while (cursor <= bucketEnd) {
    const monthRange = parseMonth(cursor.toISOString().slice(0, 7));
    const monthEnd = endOfDay(monthRange.monthEnd);
    const overlapStart = bucketStart > monthRange.monthStart ? bucketStart : monthRange.monthStart;
    const overlapEnd = bucketEnd < monthEnd ? bucketEnd : monthEnd;
    if (overlapStart <= overlapEnd) {
      const overlapDays = daysInclusive(overlapStart, overlapEnd);
      total += Math.round((monthlyNetPaise / monthRange.daysInMonth) * overlapDays);
    }
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return total;
}

function matchesStoreScope(
  storeScope: FinanceStoreScope,
  clinicStoreId: string | null,
  storeId?: string
): boolean {
  if (storeScope === 'ALL') return true;
  if (storeScope === 'ONLINE') return clinicStoreId == null && storeId == null;
  if (storeId != null) return storeId === storeScope;
  return clinicStoreId === storeScope;
}

export async function computeFinancePeriodReport(input: {
  preset?: FinancePeriodPreset | null;
  from?: string;
  to?: string;
  granularity?: FinanceGranularity;
  storeScope?: FinanceStoreScope;
}): Promise<FinancePeriodReport> {
  const preset = input.preset ?? (input.from && input.to ? 'custom' : 'this_month');
  const { from, to } = resolvePeriodFromPreset(preset, input.from, input.to);
  const granularity = input.granularity ?? suggestGranularity(from, to);
  const storeScope: FinanceStoreScope = input.storeScope ?? 'ALL';

  const bucketDefs = buildPeriodBuckets(from, to, granularity);
  const buckets: FinanceBucketRow[] = bucketDefs.map((b) => ({
    key: b.key,
    label: b.label,
    start: isoDate(b.start),
    end: isoDate(b.end),
    ...emptyBucket()
  }));

  const addToBucket = (index: number, patch: Partial<FinanceBucketRow>) => {
    if (index < 0) return;
    const row = buckets[index];
    if (patch.consultationRevenueInPaise) row.consultationRevenueInPaise += patch.consultationRevenueInPaise;
    if (patch.medicineRevenueInPaise) row.medicineRevenueInPaise += patch.medicineRevenueInPaise;
    if (patch.pendingConsultationRevenueInPaise) {
      row.pendingConsultationRevenueInPaise += patch.pendingConsultationRevenueInPaise;
    }
    if (patch.storeExpensesInPaise) row.storeExpensesInPaise += patch.storeExpensesInPaise;
    if (patch.clinicExpensesInPaise) row.clinicExpensesInPaise += patch.clinicExpensesInPaise;
    if (patch.counts?.paidConsultations) row.counts.paidConsultations += patch.counts.paidConsultations;
    if (patch.counts?.pendingConsultations) row.counts.pendingConsultations += patch.counts.pendingConsultations;
    if (patch.counts?.medicineSales) row.counts.medicineSales += patch.counts.medicineSales;
    row.totalRevenueInPaise = row.consultationRevenueInPaise + row.medicineRevenueInPaise;
    row.totalExpensesInPaise = row.payrollCostInPaise + row.storeExpensesInPaise + row.clinicExpensesInPaise;
    row.netEstimateInPaise = row.totalRevenueInPaise - row.totalExpensesInPaise;
  };

  const rangeEnd = endOfDay(to);

  const [payments, medicineMovements, expenses, stores, doctors, storeStaff] = await Promise.all([
    prisma.payment.findMany({
      where: { createdAt: { gte: from, lte: rangeEnd } },
      select: {
        amountInPaise: true,
        status: true,
        createdAt: true,
        consultation: { select: { clinicStoreId: true } }
      }
    }),
    prisma.stockMovement.findMany({
      where: {
        type: StockMovementType.SALE_OUT,
        createdAt: { gte: from, lte: rangeEnd },
        amountInPaise: { not: null }
      },
      select: { storeId: true, amountInPaise: true, createdAt: true }
    }),
    prisma.businessExpense.findMany({
      where: { expenseDate: { gte: from, lte: rangeEnd } },
      select: { level: true, storeId: true, amountInPaise: true, expenseDate: true }
    }),
    prisma.store.findMany({ select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.doctor.findMany({
      where: { employeeStatus: { not: 'TERMINATED' } },
      select: { id: true, clinicStoreId: true, salaryPerMonth: true }
    }),
    prisma.storeStaff.findMany({
      where: { employeeStatus: { not: 'TERMINATED' } },
      select: { id: true, storeId: true, salaryPerMonth: true }
    })
  ]);

  const leaveDaysMap = await getLeaveDaysMap(from, rangeEnd);

  for (const payment of payments) {
    const clinicStoreId = payment.consultation.clinicStoreId;
    if (!matchesStoreScope(storeScope, clinicStoreId)) continue;
    const idx = findBucketIndex(bucketDefs, payment.createdAt);
    if (payment.status === PaymentStatus.PAID) {
      addToBucket(idx, {
        consultationRevenueInPaise: payment.amountInPaise,
        counts: { paidConsultations: 1, pendingConsultations: 0, medicineSales: 0 }
      });
    } else if (payment.status === PaymentStatus.CREATED) {
      addToBucket(idx, {
        pendingConsultationRevenueInPaise: payment.amountInPaise,
        counts: { paidConsultations: 0, pendingConsultations: 1, medicineSales: 0 }
      });
    }
  }

  for (const movement of medicineMovements) {
    if (!matchesStoreScope(storeScope, null, movement.storeId)) continue;
    const idx = findBucketIndex(bucketDefs, movement.createdAt);
    addToBucket(idx, {
      medicineRevenueInPaise: movement.amountInPaise ?? 0,
      counts: { paidConsultations: 0, pendingConsultations: 0, medicineSales: 1 }
    });
  }

  for (const expense of expenses) {
    if (expense.level === ExpenseLevel.STORE) {
      if (storeScope === 'ONLINE') continue;
      if (storeScope !== 'ALL' && expense.storeId !== storeScope) continue;
      const idx = findBucketIndex(bucketDefs, expense.expenseDate);
      addToBucket(idx, { storeExpensesInPaise: expense.amountInPaise });
    } else if (expense.level === ExpenseLevel.CLINIC) {
      if (storeScope !== 'ALL' && storeScope !== 'ONLINE') continue;
      const idx = findBucketIndex(bucketDefs, expense.expenseDate);
      addToBucket(idx, { clinicExpensesInPaise: expense.amountInPaise });
    }
  }

  for (let i = 0; i < buckets.length; i++) {
    const def = bucketDefs[i];
    let payroll = 0;
    for (const doctor of doctors) {
      if (!matchesStoreScope(storeScope, doctor.clinicStoreId)) continue;
      const monthlyNet = calcNetSalary(
        doctor.salaryPerMonth,
        leaveDaysMap.get(doctor.id) ?? 0,
        parseMonth(def.start).daysInMonth
      );
      payroll += proRatedPayroll(monthlyNet, def.start, def.end);
    }
    for (const staff of storeStaff) {
      if (!matchesStoreScope(storeScope, null, staff.storeId)) continue;
      const monthlyNet = calcNetSalary(
        staff.salaryPerMonth,
        leaveDaysMap.get(staff.id) ?? 0,
        parseMonth(def.start).daysInMonth
      );
      payroll += proRatedPayroll(monthlyNet, def.start, def.end);
    }
    buckets[i].payrollCostInPaise = payroll;
    buckets[i].totalExpensesInPaise =
      payroll + buckets[i].storeExpensesInPaise + buckets[i].clinicExpensesInPaise;
    buckets[i].netEstimateInPaise = buckets[i].totalRevenueInPaise - buckets[i].totalExpensesInPaise;
  }

  const byStoreMap = new Map<string | null, FinanceStoreBreakdownRow>();
  const ensureStore = (storeId: string | null, code: string, name: string) => {
    if (!byStoreMap.has(storeId)) {
      byStoreMap.set(storeId, {
        storeId,
        storeCode: code,
        storeName: name,
        consultationRevenueInPaise: 0,
        medicineRevenueInPaise: 0,
        totalRevenueInPaise: 0,
        payrollCostInPaise: 0,
        storeExpensesInPaise: 0,
        clinicExpensesInPaise: 0,
        netEstimateInPaise: 0
      });
    }
    return byStoreMap.get(storeId)!;
  };

  for (const store of stores) ensureStore(store.id, store.code, store.name);
  ensureStore(null, 'CLINIC', 'Clinic (online / unallocated)');

  for (const payment of payments) {
    if (payment.status !== PaymentStatus.PAID) continue;
    const storeId = payment.consultation.clinicStoreId;
    if (storeScope !== 'ALL' && storeScope !== 'ONLINE' && storeId !== storeScope) continue;
    if (storeScope === 'ONLINE' && storeId != null) continue;
    const store = storeId ? stores.find((s) => s.id === storeId) : null;
    const row = ensureStore(storeId, store?.code ?? 'CLINIC', store?.name ?? 'Clinic (online / unallocated)');
    row.consultationRevenueInPaise += payment.amountInPaise;
    row.totalRevenueInPaise += payment.amountInPaise;
  }

  for (const movement of medicineMovements) {
    if (storeScope === 'ONLINE') continue;
    if (storeScope !== 'ALL' && movement.storeId !== storeScope) continue;
    const store = stores.find((s) => s.id === movement.storeId);
    if (!store) continue;
    const row = ensureStore(store.id, store.code, store.name);
    row.medicineRevenueInPaise += movement.amountInPaise ?? 0;
    row.totalRevenueInPaise += movement.amountInPaise ?? 0;
  }

  for (const expense of expenses) {
    if (expense.level === ExpenseLevel.STORE && expense.storeId) {
      if (storeScope !== 'ALL' && expense.storeId !== storeScope) continue;
      const store = stores.find((s) => s.id === expense.storeId);
      if (!store) continue;
      const row = ensureStore(store.id, store.code, store.name);
      row.storeExpensesInPaise += expense.amountInPaise;
    }
    if (expense.level === ExpenseLevel.CLINIC) {
      if (storeScope !== 'ALL' && storeScope !== 'ONLINE') continue;
      const row = ensureStore(null, 'CLINIC', 'Clinic (online / unallocated)');
      row.clinicExpensesInPaise += expense.amountInPaise;
    }
  }

  for (const doctor of doctors) {
    const storeId = doctor.clinicStoreId;
    if (storeScope !== 'ALL' && storeScope !== 'ONLINE' && storeId !== storeScope) continue;
    if (storeScope === 'ONLINE' && storeId != null) continue;
    const store = storeId ? stores.find((s) => s.id === storeId) : null;
    const row = ensureStore(storeId, store?.code ?? 'CLINIC', store?.name ?? 'Clinic (online / unallocated)');
    const monthlyNet = calcNetSalary(
      doctor.salaryPerMonth,
      leaveDaysMap.get(doctor.id) ?? 0,
      parseMonth(isoDate(from)).daysInMonth
    );
    row.payrollCostInPaise += proRatedPayroll(monthlyNet, from, rangeEnd);
  }

  for (const staff of storeStaff) {
    if (storeScope === 'ONLINE') continue;
    if (storeScope !== 'ALL' && staff.storeId !== storeScope) continue;
    const store = stores.find((s) => s.id === staff.storeId);
    if (!store) continue;
    const row = ensureStore(store.id, store.code, store.name);
    const monthlyNet = calcNetSalary(
      staff.salaryPerMonth,
      leaveDaysMap.get(staff.id) ?? 0,
      parseMonth(isoDate(from)).daysInMonth
    );
    row.payrollCostInPaise += proRatedPayroll(monthlyNet, from, rangeEnd);
  }

  const byStore = [...byStoreMap.values()]
    .map((row) => ({
      ...row,
      netEstimateInPaise:
        row.totalRevenueInPaise - row.payrollCostInPaise - row.storeExpensesInPaise - row.clinicExpensesInPaise
    }))
    .filter(
      (row) =>
        storeScope === 'ALL' ||
        (storeScope === 'ONLINE' ? row.storeId == null : row.storeId === storeScope)
    )
    .filter(
      (row) =>
        row.totalRevenueInPaise > 0 ||
        row.payrollCostInPaise > 0 ||
        row.storeExpensesInPaise > 0 ||
        row.clinicExpensesInPaise > 0
    )
    .sort((a, b) => a.storeName.localeCompare(b.storeName));

  const totals = buckets.reduce(
    (acc, b) => ({
      consultationRevenueInPaise: acc.consultationRevenueInPaise + b.consultationRevenueInPaise,
      medicineRevenueInPaise: acc.medicineRevenueInPaise + b.medicineRevenueInPaise,
      totalRevenueInPaise: acc.totalRevenueInPaise + b.totalRevenueInPaise,
      pendingConsultationRevenueInPaise:
        acc.pendingConsultationRevenueInPaise + b.pendingConsultationRevenueInPaise,
      payrollCostInPaise: acc.payrollCostInPaise + b.payrollCostInPaise,
      storeExpensesInPaise: acc.storeExpensesInPaise + b.storeExpensesInPaise,
      clinicExpensesInPaise: acc.clinicExpensesInPaise + b.clinicExpensesInPaise,
      totalExpensesInPaise: acc.totalExpensesInPaise + b.totalExpensesInPaise,
      netEstimateInPaise: acc.netEstimateInPaise + b.netEstimateInPaise,
      counts: {
        paidConsultations: acc.counts.paidConsultations + b.counts.paidConsultations,
        pendingConsultations: acc.counts.pendingConsultations + b.counts.pendingConsultations,
        medicineSales: acc.counts.medicineSales + b.counts.medicineSales
      }
    }),
    emptyBucket()
  );

  return {
    preset: preset === 'custom' && !input.preset ? null : preset,
    granularity,
    storeScope,
    from: isoDate(from),
    to: isoDate(to),
    buckets,
    byStore,
    totals
  };
}
