import { ProviderDomain, Role } from '@prisma/client';
import { prisma } from '../db.js';
import { homeopathyProviderApprovalReadiness } from '../doctor-capabilities.js';
import { writeAuditLog } from '../utils/helpers.js';
import { notifyAdminsProviderReadyForApproval } from './doctor-signup-notifications.js';
import {
  HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX,
  isHomeopathyApprovalFlowSuspension,
  isHomeopathyCredentialReview
} from '../constants/homeopathy-provider-approval.constants.js';

export {
  HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX,
  HOMEOPATHY_PROFILE_DRAFT_REASON,
  isHomeopathyApprovalFlowSuspension,
  isHomeopathyCredentialReview
} from '../constants/homeopathy-provider-approval.constants.js';

async function notifyApprovalRequestOnce(provider: {
  user: { id: string; name: string; email: string | null; mobile: string | null };
  specialty: string;
  registrationNo: string | null;
}) {
  try {
    const [existingNotice, latestReturnedForChanges] = await Promise.all([
      prisma.auditLog.findFirst({
        where: {
          action: 'provider.approval_requested',
          targetType: 'doctor',
          targetId: provider.user.id
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, createdAt: true }
      }),
      prisma.auditLog.findFirst({
        where: {
          action: 'doctor.deactivate',
          targetType: 'doctor',
          targetId: provider.user.id
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      })
    ]);
    if (
      existingNotice &&
      (!latestReturnedForChanges || existingNotice.createdAt >= latestReturnedForChanges.createdAt)
    ) {
      return;
    }

    const delivered = await notifyAdminsProviderReadyForApproval({
      id: provider.user.id,
      name: provider.user.name,
      email: provider.user.email || 'Not provided',
      mobile: provider.user.mobile,
      specialty: provider.specialty,
      registrationNo: provider.registrationNo
    });
    if (delivered <= 0) return;

    await writeAuditLog({
      actorId: provider.user.id,
      actorRole: Role.DOCTOR,
      action: 'provider.approval_requested',
      targetType: 'doctor',
      targetId: provider.user.id,
      summary: 'Completed homeopathy profile submitted for credential approval.',
      metadata: { telegramRecipients: delivered }
    });
  } catch (error) {
    // Approval remains visible in the admin queue even when Telegram is temporarily unavailable.
    console.error('[provider-approval] Could not send Telegram approval request.', error);
  }
}

export async function submitHomeopathyProviderForApprovalIfReady(userId: string) {
  const provider = await prisma.doctor.findUnique({
    where: { userId },
    select: {
      providerDomain: true,
      suspendedAt: true,
      suspendedReason: true,
      specialty: true,
      registrationNo: true,
      user: { select: { id: true, name: true, email: true, mobile: true } }
    }
  });

  if (!provider || provider.providerDomain !== ProviderDomain.HOMEOPATHY) {
    return { status: 'NOT_APPLICABLE' as const };
  }
  if (!provider.suspendedAt) return { status: 'APPROVED' as const };
  if (!isHomeopathyApprovalFlowSuspension(provider.suspendedReason)) {
    return { status: 'ADMIN_SUSPENDED' as const };
  }

  const readiness = await homeopathyProviderApprovalReadiness(userId);
  if (!readiness.ready) return { status: 'INCOMPLETE' as const, readiness };
  if (isHomeopathyCredentialReview(provider.suspendedReason)) {
    await notifyApprovalRequestOnce(provider);
    return { status: 'PENDING_REVIEW' as const, readiness };
  }

  const transitioned = await prisma.doctor.updateMany({
    where: {
      userId,
      suspendedAt: { not: null },
      suspendedReason: provider.suspendedReason
    },
    data: {
      suspendedReason: `${HOMEOPATHY_CREDENTIAL_REVIEW_PREFIX}.`,
      suspendedById: null,
      showOnWebsite: false,
      isOnline: false
    }
  });

  if (transitioned.count === 1) {
    await notifyApprovalRequestOnce(provider);
  }

  return { status: 'PENDING_REVIEW' as const, readiness };
}

export class HomeopathyProviderApprovalError extends Error {
  constructor(
    readonly code:
      | 'PROVIDER_NOT_FOUND'
      | 'NOT_HOMEOPATHY_PROVIDER'
      | 'PROFILE_INCOMPLETE'
      | 'NOT_AWAITING_APPROVAL',
    message: string,
    readonly blockers: Array<{ code: string; label: string; action?: string }> = []
  ) {
    super(message);
  }
}

export async function approveHomeopathyProviderAccount(input: {
  doctorId: string;
  actorId: string;
  actorRole: Role;
}) {
  const existing = await prisma.user.findUnique({
    where: { id: input.doctorId },
    select: {
      id: true,
      role: true,
      doctorProfile: {
        select: {
          providerDomain: true,
          suspendedAt: true,
          suspendedReason: true
        }
      }
    }
  });
  if (!existing || existing.role !== Role.DOCTOR || !existing.doctorProfile) {
    throw new HomeopathyProviderApprovalError(
      'PROVIDER_NOT_FOUND',
      'Provider application not found.'
    );
  }
  if (existing.doctorProfile.providerDomain !== ProviderDomain.HOMEOPATHY) {
    throw new HomeopathyProviderApprovalError(
      'NOT_HOMEOPATHY_PROVIDER',
      'This approval action is only for homeopathy providers.'
    );
  }
  if (!existing.doctorProfile.suspendedAt) {
    return { alreadyApproved: true, doctor: existing };
  }
  if (!isHomeopathyCredentialReview(existing.doctorProfile.suspendedReason)) {
    const readiness = await homeopathyProviderApprovalReadiness(input.doctorId);
    if (!readiness.ready) {
      throw new HomeopathyProviderApprovalError(
        'PROFILE_INCOMPLETE',
        'The provider must complete the required profile fields before approval.',
        readiness.blockers
      );
    }
    throw new HomeopathyProviderApprovalError(
      'NOT_AWAITING_APPROVAL',
      'This provider has not submitted the completed profile for approval.'
    );
  }

  const readiness = await homeopathyProviderApprovalReadiness(input.doctorId);
  if (!readiness.ready) {
    throw new HomeopathyProviderApprovalError(
      'PROFILE_INCOMPLETE',
      'The provider must complete the required profile fields before approval.',
      readiness.blockers
    );
  }

  const doctor = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: input.doctorId }, data: { isActive: true } });
    await tx.doctor.update({
      where: { userId: input.doctorId },
      data: {
        suspendedAt: null,
        suspendedReason: null,
        suspendedById: null,
        isAvailable: true,
        isOnline: false,
        showOnWebsite: true
      }
    });
    return tx.user.findUniqueOrThrow({
      where: { id: input.doctorId },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        isActive: true,
        doctorProfile: true
      }
    });
  });

  await writeAuditLog({
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: 'doctor.approve',
    targetType: 'doctor',
    targetId: doctor.id,
    summary: 'Homeopathy credentials approved and provider activated.',
    metadata: { workspace: 'homeopathy', credentialReview: true }
  });

  return { alreadyApproved: false, doctor };
}
