import { PaymentStatus, StockMovementType } from '@prisma/client';
import { prisma } from '../db.js';
import { resolveDoctorSharePercent } from './doctor-compensation.js';

export type PaymentFeeBreakdown = {
  consultationFeeInPaise: number;
  medicineFeeInPaise: number;
};

export type EarningsStatusBucket = {
  count: number;
  consultationGrossInPaise: number;
  medicineGrossInPaise: number;
  totalGrossInPaise: number;
  doctorEarningsInPaise: number;
};

export type DoctorEarningsLineItem = {
  id: string;
  kind: 'CONSULTATION_PAYMENT' | 'MEDICINE_SALE';
  status: PaymentStatus | 'RECORDED';
  patientName: string | null;
  label: string;
  pricingLabel?: string | null;
  pricingMode?: string | null;
  pricingRule?: string | null;
  serviceTitle?: string | null;
  platformFeeInPaise?: number | null;
  providerSharePercent?: number | null;
  earningModel?: string | null;
  configuredPercent?: number | null;
  configuredFixedInPaise?: number | null;
  packageUsage?: unknown;
  billableMinutes?: number | null;
  consultationFeeInPaise: number;
  medicineFeeInPaise: number;
  totalGrossInPaise: number;
  refundedAmountInPaise?: number;
  netPaidInPaise?: number;
  doctorEarningsInPaise: number;
  payoutStatus?: string | null;
  payoutReference?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
};

export type DoctorEarningsReport = {
  doctorSharePercent: number;
  consultation: {
    paid: EarningsStatusBucket;
    pending: EarningsStatusBucket;
    failed: EarningsStatusBucket;
  };
  medicineSales: EarningsStatusBucket;
  totals: {
    earnedInPaise: number;
    pendingInPaise: number;
    failedGrossInPaise: number;
    totalGrossInPaise: number;
  };
  lineItems: DoctorEarningsLineItem[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readPaise(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value);
}

/** Split a payment total into consultation vs medicine using lineItems when available. */
export function parsePaymentFeeBreakdown(
  lineItems: unknown,
  totalInPaise: number
): PaymentFeeBreakdown {
  const items = asRecord(lineItems);
  const explicitConsult =
    readPaise(items?.consultationFeeInPaise) ??
    readPaise(items?.diseaseFeeInPaise) ??
    readPaise(items?.selectedPlanPriceInPaise);
  const explicitMedicine = readPaise(items?.medicineFeeInPaise) ?? 0;

  if (explicitConsult != null && explicitMedicine > 0) {
    return { consultationFeeInPaise: explicitConsult, medicineFeeInPaise: explicitMedicine };
  }
  if (explicitConsult != null) {
    const medicineFeeInPaise = Math.max(0, totalInPaise - explicitConsult);
    return { consultationFeeInPaise: explicitConsult, medicineFeeInPaise };
  }
  return { consultationFeeInPaise: totalInPaise, medicineFeeInPaise: 0 };
}

export function computeDoctorShareAmount(grossInPaise: number, sharePercent: number): number {
  return Math.round((grossInPaise * sharePercent) / 100);
}

function emptyBucket(): EarningsStatusBucket {
  return {
    count: 0,
    consultationGrossInPaise: 0,
    medicineGrossInPaise: 0,
    totalGrossInPaise: 0,
    doctorEarningsInPaise: 0
  };
}

function addToBucket(
  bucket: EarningsStatusBucket,
  consultationFeeInPaise: number,
  medicineFeeInPaise: number,
  sharePercent: number,
  earningOverrideInPaise?: number | null
) {
  const totalGrossInPaise = consultationFeeInPaise + medicineFeeInPaise;
  bucket.count += 1;
  bucket.consultationGrossInPaise += consultationFeeInPaise;
  bucket.medicineGrossInPaise += medicineFeeInPaise;
  bucket.totalGrossInPaise += totalGrossInPaise;
  bucket.doctorEarningsInPaise +=
    earningOverrideInPaise ?? computeDoctorShareAmount(totalGrossInPaise, sharePercent);
}

function monthEndInclusive(monthEnd: Date): Date {
  return new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59, 999);
}

export async function buildDoctorEarningsReport(
  doctorUserId: string,
  sharePercent: number,
  monthStart?: Date,
  monthEnd?: Date
): Promise<DoctorEarningsReport> {
  const paid = emptyBucket();
  const pending = emptyBucket();
  const failed = emptyBucket();
  const medicineSales = emptyBucket();
  const lineItems: DoctorEarningsLineItem[] = [];

  const paymentWhere: {
    consultation: { assignedDoctorId: string };
    createdAt?: { gte: Date; lte: Date };
  } = {
    consultation: { assignedDoctorId: doctorUserId }
  };
  if (monthStart && monthEnd) {
    paymentWhere.createdAt = { gte: monthStart, lte: monthEndInclusive(monthEnd) };
  }

  const payments = await prisma.payment.findMany({
    where: paymentWhere,
    select: {
      id: true,
      status: true,
      amountInPaise: true,
      refundedAmountInPaise: true,
      lineItems: true,
      createdAt: true,
      consultation: {
        select: {
          disease: { select: { name: true } },
          patient: { select: { name: true } }
        }
      },
      providerEarning: {
        select: {
          payoutStatus: true,
          payoutReference: true,
          paidAt: true,
          providerEarningInPaise: true,
          platformFeeInPaise: true,
          providerSharePercent: true,
          earningModel: true,
          configuredPercent: true,
          configuredFixedInPaise: true,
          pricingMode: true,
          pricingRule: true,
          serviceTitle: true,
          packageUsage: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  for (const payment of payments) {
    const fees = parsePaymentFeeBreakdown(payment.lineItems, payment.amountInPaise);
    const lineItemMeta = asRecord(payment.lineItems);
    const earningsInPaise =
      payment.status === PaymentStatus.PAID
        ? computeDoctorShareAmount(
            fees.consultationFeeInPaise + fees.medicineFeeInPaise,
            sharePercent
          )
        : 0;

    if (payment.status === PaymentStatus.PAID) {
      addToBucket(
        paid,
        fees.consultationFeeInPaise,
        fees.medicineFeeInPaise,
        sharePercent,
        payment.providerEarning?.providerEarningInPaise
      );
    } else if (payment.status === PaymentStatus.CREATED) {
      addToBucket(
        pending,
        fees.consultationFeeInPaise,
        fees.medicineFeeInPaise,
        sharePercent,
        payment.providerEarning?.providerEarningInPaise
      );
    } else {
      addToBucket(failed, fees.consultationFeeInPaise, fees.medicineFeeInPaise, sharePercent);
    }

    lineItems.push({
      id: payment.id,
      kind: 'CONSULTATION_PAYMENT',
      status: payment.status,
      patientName: payment.consultation.patient?.name ?? null,
      label:
        payment.providerEarning?.serviceTitle ||
        String(lineItemMeta?.careTeamServiceTitle || '') ||
        payment.consultation.disease?.name ||
        'Consultation',
      pricingLabel: String(lineItemMeta?.careTeamPricingLabel || '') || null,
      pricingMode:
        payment.providerEarning?.pricingMode ||
        String(lineItemMeta?.careTeamPricingMode || '') ||
        null,
      pricingRule:
        payment.providerEarning?.pricingRule ||
        String(lineItemMeta?.careTeamPricingRule || '') ||
        null,
      serviceTitle:
        payment.providerEarning?.serviceTitle ||
        String(lineItemMeta?.careTeamServiceTitle || '') ||
        null,
      platformFeeInPaise: payment.providerEarning?.platformFeeInPaise ?? null,
      providerSharePercent: payment.providerEarning?.providerSharePercent ?? null,
      earningModel: payment.providerEarning?.earningModel ?? null,
      configuredPercent: payment.providerEarning?.configuredPercent ?? null,
      configuredFixedInPaise: payment.providerEarning?.configuredFixedInPaise ?? null,
      packageUsage: payment.providerEarning?.packageUsage || lineItemMeta?.packageUsage || null,
      billableMinutes:
        readPaise(lineItemMeta?.careTeamBillableMinutes) ??
        readPaise(lineItemMeta?.billableMinutes) ??
        null,
      consultationFeeInPaise: fees.consultationFeeInPaise,
      medicineFeeInPaise: fees.medicineFeeInPaise,
      totalGrossInPaise: payment.amountInPaise,
      refundedAmountInPaise: payment.refundedAmountInPaise,
      netPaidInPaise: Math.max(0, payment.amountInPaise - payment.refundedAmountInPaise),
      doctorEarningsInPaise: payment.providerEarning?.providerEarningInPaise ?? earningsInPaise,
      payoutStatus: payment.providerEarning?.payoutStatus ?? null,
      payoutReference: payment.providerEarning?.payoutReference ?? null,
      paidAt: payment.providerEarning?.paidAt ?? null,
      createdAt: payment.createdAt
    });
  }

  const movementWhere: {
    type: typeof StockMovementType.SALE_OUT;
    amountInPaise: { not: null };
    prescription: { uploadedById: string };
    createdAt?: { gte: Date; lte: Date };
  } = {
    type: StockMovementType.SALE_OUT,
    amountInPaise: { not: null },
    prescription: { uploadedById: doctorUserId }
  };
  if (monthStart && monthEnd) {
    movementWhere.createdAt = { gte: monthStart, lte: monthEndInclusive(monthEnd) };
  }

  const movements = await prisma.stockMovement.findMany({
    where: movementWhere,
    select: {
      id: true,
      amountInPaise: true,
      createdAt: true,
      note: true,
      stock: { select: { medicine: { select: { name: true } } } },
      prescription: {
        select: {
          patient: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  for (const movement of movements) {
    const gross = movement.amountInPaise ?? 0;
    const earningsInPaise = computeDoctorShareAmount(gross, sharePercent);
    addToBucket(medicineSales, 0, gross, sharePercent);
    lineItems.push({
      id: movement.id,
      kind: 'MEDICINE_SALE',
      status: 'RECORDED',
      patientName: movement.prescription?.patient?.name ?? null,
      label: movement.stock.medicine.name,
      consultationFeeInPaise: 0,
      medicineFeeInPaise: gross,
      totalGrossInPaise: gross,
      doctorEarningsInPaise: earningsInPaise,
      createdAt: movement.createdAt
    });
  }

  lineItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const earnedInPaise = paid.doctorEarningsInPaise + medicineSales.doctorEarningsInPaise;
  const pendingInPaise = pending.doctorEarningsInPaise;
  const failedGrossInPaise = failed.totalGrossInPaise;
  const totalGrossInPaise =
    paid.totalGrossInPaise +
    pending.totalGrossInPaise +
    failed.totalGrossInPaise +
    medicineSales.totalGrossInPaise;

  return {
    doctorSharePercent: sharePercent,
    consultation: { paid, pending, failed },
    medicineSales,
    totals: { earnedInPaise, pendingInPaise, failedGrossInPaise, totalGrossInPaise },
    lineItems
  };
}

export async function getDoctorEarningsForMonth(
  doctorUserId: string,
  monthStart: Date,
  monthEnd: Date
) {
  const doctor = await prisma.doctor.findUnique({
    where: { userId: doctorUserId },
    select: { consultationSharePercent: true, compensationModel: true }
  });
  const sharePercent = doctor ? resolveDoctorSharePercent(doctor) : 60;
  return buildDoctorEarningsReport(doctorUserId, sharePercent, monthStart, monthEnd);
}
