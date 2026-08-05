import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../db.js';

export const PAYMENT_CSV_EXPORT_LIMIT = 10_000;

export function buildPaymentWhere(input: {
  status?: string;
  from?: string;
  to?: string;
}): Prisma.PaymentWhereInput {
  const status = (input.status || '').toUpperCase();
  const createdAt = parsePaymentDateRange(input.from, input.to);

  return {
    ...(status === PaymentStatus.PAID ||
    status === PaymentStatus.FAILED ||
    status === PaymentStatus.CREATED ||
    status === PaymentStatus.PARTIALLY_REFUNDED ||
    status === PaymentStatus.REFUNDED
      ? { status: status as PaymentStatus }
      : {}),
    ...(createdAt ? { createdAt } : {})
  };
}

export function parsePaymentDateRange(from?: string, to?: string) {
  if (!from && !to) {
    return undefined;
  }

  const range: { gte?: Date; lte?: Date } = {};
  if (from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    range.gte = start;
  }
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }
  return range;
}

const paymentInclude = {
  providerEarning: {
    select: {
      id: true,
      payoutStatus: true,
      providerEarningInPaise: true,
      platformFeeInPaise: true,
      providerSharePercent: true,
      pricingMode: true,
      pricingRule: true,
      serviceTitle: true,
      packageUsage: true
    }
  },
  consultation: {
    select: {
      id: true,
      status: true,
      patient: { select: { id: true, name: true } },
      assignedDoctor: { select: { id: true, name: true } },
      disease: { select: { name: true } }
    }
  }
} as const;

export async function summarizePayments(where: Prisma.PaymentWhereInput) {
  const [totals, paidTotals, refundTotals, pendingCount, failedCount] = await Promise.all([
    prisma.payment.aggregate({
      where,
      _sum: { amountInPaise: true }
    }),
    prisma.payment.aggregate({
      where: { ...where, status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] } },
      _sum: { amountInPaise: true }
    }),
    prisma.payment.aggregate({
      where,
      _sum: { refundedAmountInPaise: true }
    }),
    prisma.payment.count({
      where: { ...where, status: PaymentStatus.CREATED }
    }),
    prisma.payment.count({
      where: { ...where, status: PaymentStatus.FAILED }
    })
  ]);

  return {
    total: totals._sum.amountInPaise ?? 0,
    paid: paidTotals._sum.amountInPaise ?? 0,
    refunded: refundTotals._sum.refundedAmountInPaise ?? 0,
    netPaid: (paidTotals._sum.amountInPaise ?? 0) - (refundTotals._sum.refundedAmountInPaise ?? 0),
    pendingCount,
    failedCount
  };
}

export function paymentRowsToCsv(
  payments: Array<{
    id: string;
    consultationId: string;
    amountInPaise: number;
    status: PaymentStatus;
    billingPlanCode: string | null;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    refundedAmountInPaise: number;
    createdAt: Date;
    consultation: {
      patient?: { name?: string | null } | null;
      assignedDoctor?: { name?: string | null } | null;
      disease?: { name?: string | null } | null;
    };
  }>
) {
  const lines = [
    'paymentId,consultationId,patientName,doctorName,disease,billingPlanCode,amountInPaise,refundedAmountInPaise,status,providerOrderId,providerPaymentId,createdAt'
  ];

  for (const payment of payments) {
    lines.push(
      [
        payment.id,
        payment.consultationId,
        payment.consultation.patient?.name || '',
        payment.consultation.assignedDoctor?.name || '',
        payment.consultation.disease?.name || '',
        payment.billingPlanCode || '',
        String(payment.amountInPaise),
        String(payment.refundedAmountInPaise),
        payment.status,
        payment.providerOrderId || '',
        payment.providerPaymentId || '',
        payment.createdAt.toISOString()
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(',')
    );
  }

  return lines.join('\n');
}

export async function listAdminPayments(
  where: Prisma.PaymentWhereInput,
  page: number,
  pageSize: number
) {
  const [total, payments, summary] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: paymentInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    summarizePayments(where)
  ]);

  return {
    payments,
    summary,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    }
  };
}

export async function exportAdminPaymentsCsv(where: Prisma.PaymentWhereInput) {
  const payments = await prisma.payment.findMany({
    where,
    include: paymentInclude,
    orderBy: { createdAt: 'desc' },
    take: PAYMENT_CSV_EXPORT_LIMIT
  });

  return paymentRowsToCsv(payments);
}
