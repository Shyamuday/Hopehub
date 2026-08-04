import { ConsultationStatus, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { upsertProviderEarningForPayment } from './provider-earnings.js';
import { cancelConsultationReminders } from './consultation-reminders.js';

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function cancellationSnapshot(input: {
  actorId?: string | null;
  actorRole?: string | null;
  reason?: string | null;
  restorePackageSession: boolean;
}) {
  return {
    cancelledAt: new Date().toISOString(),
    cancelledByUserId: input.actorId || null,
    cancelledByRole: input.actorRole || null,
    reason: input.reason || null,
    restorePackageSession: input.restorePackageSession
  };
}

export async function applyConsultationCancellationEffects(input: {
  consultationId: string;
  actorId?: string | null;
  actorRole?: string | null;
  reason?: string | null;
  restorePackageSession?: boolean;
  holdProviderPayout?: boolean;
}) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: input.consultationId },
    include: {
      payment: { select: { id: true, status: true } },
      providerEarning: { select: { id: true, payoutStatus: true } }
    }
  });
  if (!consultation) return null;

  const snapshot = asRecord(consultation.pricingSnapshot);
  const usage = asRecord(snapshot['packageUsage']);
  const isPackageRedemption =
    String(snapshot['careTeamPricingRule'] || '').toUpperCase() === 'PACKAGE_REDEMPTION' ||
    String(usage['type'] || '').toUpperCase() === 'REDEMPTION';
  const packageConsultationId =
    String(snapshot['careTeamPackageConsultationId'] || usage['packageConsultationId'] || '') ||
    null;
  const shouldRestorePackage = Boolean(
    input.restorePackageSession !== false && isPackageRedemption && packageConsultationId
  );
  const cancellation = cancellationSnapshot({
    actorId: input.actorId,
    actorRole: input.actorRole,
    reason: input.reason,
    restorePackageSession: shouldRestorePackage
  });

  await prisma.consultation.update({
    where: { id: consultation.id },
    data: {
      status: ConsultationStatus.CANCELLED,
      pricingSnapshot: {
        ...snapshot,
        cancellation,
        packageUsage:
          usage && Object.keys(usage).length
            ? {
                ...usage,
                cancelled: true,
                restoredToPackage: shouldRestorePackage
              }
            : snapshot['packageUsage']
      } as Prisma.InputJsonObject
    }
  });

  if (shouldRestorePackage && packageConsultationId) {
    const packageConsultation = await prisma.consultation.findUnique({
      where: { id: packageConsultationId },
      select: { id: true, pricingSnapshot: true }
    });
    const packageSnapshot = asRecord(packageConsultation?.pricingSnapshot);
    const packageUsage = asRecord(packageSnapshot['packageUsage']);
    if (packageConsultation && Object.keys(packageUsage).length) {
      const totalSessions = Math.max(1, Number(packageUsage['totalSessions'] || 1));
      const usedSessions = Math.max(0, Number(packageUsage['usedSessions'] || 0) - 1);
      const remainingSessions = Math.min(
        totalSessions,
        Math.max(0, Number(packageUsage['remainingSessions'] || 0) + 1)
      );
      const restorations = Array.isArray(packageSnapshot['cancellationRestorations'])
        ? packageSnapshot['cancellationRestorations']
        : [];
      await prisma.consultation.update({
        where: { id: packageConsultation.id },
        data: {
          pricingSnapshot: {
            ...packageSnapshot,
            packageUsage: {
              ...packageUsage,
              usedSessions,
              remainingSessions,
              lastRestoredAt: cancellation.cancelledAt,
              lastRestoredConsultationId: consultation.id
            },
            cancellationRestorations: [
              ...restorations,
              {
                consultationId: consultation.id,
                restoredAt: cancellation.cancelledAt,
                reason: input.reason || null
              }
            ]
          } as Prisma.InputJsonObject
        }
      });
    }
  }

  if (consultation.payment?.id && input.holdProviderPayout !== false) {
    await upsertProviderEarningForPayment(consultation.payment.id, {
      forceHold: true,
      payoutNote: input.reason
        ? `Cancelled: ${input.reason}`
        : 'Cancelled consultation — payout on hold'
    });
  }

  await cancelConsultationReminders(consultation.id, input.reason || null);

  return {
    consultationId: consultation.id,
    restoredPackageSession: shouldRestorePackage,
    packageConsultationId
  };
}
