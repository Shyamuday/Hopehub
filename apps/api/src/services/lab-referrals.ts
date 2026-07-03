import { LabReferralStatus, type Prisma } from '@prisma/client';
import { prisma } from '../db.js';

export class LabReferralError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LabReferralError';
  }
}

const referralInclude = {
  diagnosticCenter: { select: { id: true, code: true, name: true, email: true, phone: true } },
  store: { select: { id: true, name: true, code: true, address: true } },
  patient: { select: { id: true, name: true, patientCode: true, mobile: true, email: true } },
  consultation: { select: { id: true, status: true } },
  lines: true
} satisfies Prisma.LabReferralInclude;

function nextReferralNumber(storeCode: string) {
  return `LAB-${storeCode}-${Date.now().toString(36).toUpperCase()}`;
}

export async function resolveDiagnosticCenterId(userId: string, role: string): Promise<string | null> {
  if (role === 'ADMIN') return null;
  const profile = await prisma.diagnosticCenterProfile.findUnique({
    where: { userId },
    select: { diagnosticCenterId: true }
  });
  return profile?.diagnosticCenterId ?? null;
}

export async function createLabReferral(input: {
  diagnosticCenterId: string;
  storeId: string;
  patientId: string;
  consultationId?: string;
  clinicalNotes?: string;
  expectedResultDate?: string;
  createdById?: string;
  lines: Array<{ testName: string; testCode?: string; specimen?: string }>;
  send?: boolean;
}) {
  if (!input.lines.length) {
    throw new LabReferralError('At least one test line is required.');
  }

  const store = await prisma.store.findUniqueOrThrow({
    where: { id: input.storeId },
    select: { code: true }
  });

  await prisma.user.findFirstOrThrow({
    where: { id: input.patientId, role: 'PATIENT' }
  });

  const referral = await prisma.labReferral.create({
    data: {
      referralNumber: nextReferralNumber(store.code),
      diagnosticCenterId: input.diagnosticCenterId,
      storeId: input.storeId,
      patientId: input.patientId,
      consultationId: input.consultationId,
      status: LabReferralStatus.SENT,
      clinicalNotes: input.clinicalNotes,
      expectedResultDate: input.expectedResultDate ? new Date(input.expectedResultDate) : undefined,
      createdById: input.createdById,
      lines: {
        create: input.lines.map((line) => ({
          testName: line.testName,
          testCode: line.testCode,
          specimen: line.specimen
        }))
      }
    },
    include: referralInclude
  });

  return formatReferral(referral);
}

export async function listLabReferrals(filters: {
  diagnosticCenterId?: string;
  storeId?: string;
  patientId?: string;
  status?: LabReferralStatus;
}) {
  const referrals = await prisma.labReferral.findMany({
    where: {
      ...(filters.diagnosticCenterId ? { diagnosticCenterId: filters.diagnosticCenterId } : {}),
      ...(filters.storeId ? { storeId: filters.storeId } : {}),
      ...(filters.patientId ? { patientId: filters.patientId } : {}),
      ...(filters.status ? { status: filters.status } : {})
    },
    include: referralInclude,
    orderBy: { createdAt: 'desc' }
  });

  return referrals.map(formatReferral);
}

export async function getLabReferral(id: string) {
  const referral = await prisma.labReferral.findUnique({
    where: { id },
    include: referralInclude
  });
  return referral ? formatReferral(referral) : null;
}

export async function partnerAcceptLabReferral(
  referralId: string,
  diagnosticCenterId: string,
  input: { partnerNotes?: string; expectedResultDate?: string }
) {
  const referral = await prisma.labReferral.findUnique({ where: { id: referralId } });
  if (!referral || referral.diagnosticCenterId !== diagnosticCenterId) {
    throw new LabReferralError('Referral not found for this lab.');
  }
  if (referral.status !== LabReferralStatus.SENT) {
    throw new LabReferralError('Only sent referrals can be accepted.');
  }

  const updated = await prisma.labReferral.update({
    where: { id: referralId },
    data: {
      status: LabReferralStatus.ACCEPTED,
      partnerNotes: input.partnerNotes,
      expectedResultDate: input.expectedResultDate ? new Date(input.expectedResultDate) : referral.expectedResultDate,
      acceptedAt: new Date()
    },
    include: referralInclude
  });
  return formatReferral(updated);
}

const forwardStatuses: Record<string, LabReferralStatus> = {
  SAMPLE_COLLECTED: LabReferralStatus.SAMPLE_COLLECTED,
  IN_PROGRESS: LabReferralStatus.IN_PROGRESS
};

export async function partnerAdvanceLabReferral(
  referralId: string,
  diagnosticCenterId: string,
  status: 'SAMPLE_COLLECTED' | 'IN_PROGRESS'
) {
  const referral = await prisma.labReferral.findUnique({ where: { id: referralId } });
  if (!referral || referral.diagnosticCenterId !== diagnosticCenterId) {
    throw new LabReferralError('Referral not found for this lab.');
  }

  const next = forwardStatuses[status];
  const allowed: Record<string, LabReferralStatus[]> = {
    [LabReferralStatus.ACCEPTED]: [LabReferralStatus.SAMPLE_COLLECTED],
    [LabReferralStatus.SAMPLE_COLLECTED]: [LabReferralStatus.IN_PROGRESS]
  };
  if (!allowed[referral.status]?.includes(next)) {
    throw new LabReferralError('Invalid status transition.');
  }

  const updated = await prisma.labReferral.update({
    where: { id: referralId },
    data: { status: next },
    include: referralInclude
  });
  return formatReferral(updated);
}

export type SubmitResultLine = {
  lineId: string;
  resultSummary: string;
  resultFileUrl?: string;
};

export async function partnerSubmitLabResults(
  referralId: string,
  diagnosticCenterId: string,
  lines: SubmitResultLine[]
) {
  const referral = await prisma.labReferral.findUnique({
    where: { id: referralId },
    include: { lines: true }
  });
  if (!referral || referral.diagnosticCenterId !== diagnosticCenterId) {
    throw new LabReferralError('Referral not found for this lab.');
  }
  if (
    referral.status !== LabReferralStatus.ACCEPTED &&
    referral.status !== LabReferralStatus.SAMPLE_COLLECTED &&
    referral.status !== LabReferralStatus.IN_PROGRESS
  ) {
    throw new LabReferralError('Results cannot be submitted in the current status.');
  }
  if (!lines.length) {
    throw new LabReferralError('At least one result line is required.');
  }

  const lineMap = new Map(referral.lines.map((line) => [line.id, line]));
  for (const input of lines) {
    if (!lineMap.has(input.lineId)) throw new LabReferralError('Invalid referral line.');
    if (!input.resultSummary.trim()) throw new LabReferralError('Result summary is required.');
  }

  return prisma.$transaction(async (tx) => {
    for (const input of lines) {
      await tx.labReferralLine.update({
        where: { id: input.lineId },
        data: {
          resultSummary: input.resultSummary,
          resultFileUrl: input.resultFileUrl,
          completedAt: new Date()
        }
      });
    }

    const updated = await tx.labReferral.update({
      where: { id: referralId },
      data: {
        status: LabReferralStatus.RESULT_READY,
        completedAt: new Date()
      },
      include: referralInclude
    });
    return formatReferral(updated);
  });
}

function formatReferral(referral: Prisma.LabReferralGetPayload<{ include: typeof referralInclude }>) {
  const completedTests = referral.lines.filter((line) => line.resultSummary).length;
  return {
    ...referral,
    totals: { testCount: referral.lines.length, completedTests }
  };
}

function formatPatientLabReferral(
  referral: Prisma.LabReferralGetPayload<{ include: typeof referralInclude }>
) {
  const formatted = formatReferral(referral);
  const { partnerNotes: _partnerNotes, createdById: _createdById, ...patientSafe } = formatted;
  return patientSafe;
}

export async function listPatientLabResults(patientId: string) {
  const referrals = await prisma.labReferral.findMany({
    where: { patientId, status: LabReferralStatus.RESULT_READY },
    include: referralInclude,
    orderBy: { completedAt: 'desc' }
  });
  return referrals.map(formatPatientLabReferral);
}

export async function getPatientLabResult(id: string, patientId: string) {
  const referral = await prisma.labReferral.findFirst({
    where: { id, patientId, status: LabReferralStatus.RESULT_READY },
    include: referralInclude
  });
  return referral ? formatPatientLabReferral(referral) : null;
}

export async function listDoctorPatientLabReferrals(patientId: string) {
  const referrals = await prisma.labReferral.findMany({
    where: { patientId },
    include: referralInclude,
    orderBy: { createdAt: 'desc' }
  });
  return referrals.map(formatReferral);
}

export async function getDoctorPatientLabReferral(id: string, patientId: string) {
  const referral = await prisma.labReferral.findFirst({
    where: { id, patientId },
    include: referralInclude
  });
  return referral ? formatReferral(referral) : null;
}

const demoResultSummaries: Record<string, string> = {
  CBC: 'Hemoglobin 13.2 g/dL, WBC 7.1 x10³/µL — within normal limits',
  THY: 'TSH 2.1 mIU/L, T3/T4 normal — euthyroid'
};

/** Dev seed helper — publishes demo lab results without going through the partner portal. */
export async function publishDemoLabResults(referralId: string) {
  const referral = await prisma.labReferral.findUnique({
    where: { id: referralId },
    include: referralInclude
  });
  if (!referral) return null;
  if (referral.status === LabReferralStatus.RESULT_READY) {
    return formatReferral(referral);
  }

  const lines = referral.lines;
  return prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const summary =
        (line.testCode && demoResultSummaries[line.testCode]) ||
        `${line.testName}: results within normal limits`;
      await tx.labReferralLine.update({
        where: { id: line.id },
        data: { resultSummary: summary, completedAt: new Date() }
      });
    }

    const updated = await tx.labReferral.update({
      where: { id: referralId },
      data: {
        status: LabReferralStatus.RESULT_READY,
        acceptedAt: referral.acceptedAt ?? new Date(),
        completedAt: new Date()
      },
      include: referralInclude
    });
    return formatReferral(updated);
  });
}
