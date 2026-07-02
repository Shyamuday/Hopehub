import { ConsultationStatus, PaymentStatus, Role, SupportNoteCategory } from '@prisma/client';
import { prisma } from '../db.js';

const STUCK_STATUSES: ConsultationStatus[] = [
  ConsultationStatus.PAYMENT_PENDING,
  ConsultationStatus.PAID,
  ConsultationStatus.ASSIGNED
];

export async function listPatientSupportNotes(patientId: string) {
  return prisma.supportCaseNote.findMany({
    where: { patientId },
    include: {
      author: { select: { id: true, name: true, email: true } },
      consultation: { select: { id: true, status: true, disease: { select: { name: true } } } }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });
}

export async function createPatientSupportNote(input: {
  patientId: string;
  authorId: string;
  category: SupportNoteCategory;
  body: string;
  consultationId?: string;
}) {
  if (input.consultationId) {
    const consultation = await prisma.consultation.findFirst({
      where: { id: input.consultationId, patientId: input.patientId },
      select: { id: true }
    });
    if (!consultation) {
      throw new Error('Consultation not found for this patient.');
    }
  }

  return prisma.supportCaseNote.create({
    data: {
      patientId: input.patientId,
      authorId: input.authorId,
      category: input.category,
      body: input.body.trim(),
      consultationId: input.consultationId || null
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      consultation: { select: { id: true, status: true, disease: { select: { name: true } } } }
    }
  });
}

export async function buildPatientSupportContext(patientId: string) {
  const patient = await prisma.user.findFirst({
    where: { id: patientId, role: Role.PATIENT },
    select: {
      id: true,
      name: true,
      isActive: true,
      patientCode: true,
      mobile: true,
      email: true,
      reminderPreference: {
        select: { inApp: true, sms: true, whatsapp: true, push: true, quietHoursStart: true, quietHoursEnd: true }
      }
    }
  });

  if (!patient) {
    return null;
  }

  const consultations = await prisma.consultation.findMany({
    where: { patientId },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      disease: { select: { name: true } },
      assignedDoctor: { select: { name: true } },
      payment: { select: { status: true, amountInPaise: true, createdAt: true } },
      _count: { select: { prescriptions: true, messages: true } }
    }
  });

  const consultationIds = consultations.map((c) => c.id);

  const [recentAudit, adherence] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        OR: [{ targetType: 'patient', targetId: patientId }, { targetType: 'consultation', targetId: { in: consultationIds } }]
      },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.medicineDoseEvent.groupBy({
      by: ['status'],
      where: { patientId },
      _count: { status: true }
    })
  ]);

  const doseTotals = Object.fromEntries(adherence.map((row) => [row.status, row._count.status])) as Record<string, number>;
  const totalDoses = Object.values(doseTotals).reduce((sum, n) => sum + n, 0);
  const takenDoses = doseTotals.TAKEN ?? 0;
  const adherencePercent = totalDoses ? Math.round((takenDoses / totalDoses) * 100) : null;

  const stuckConsultations = consultations.filter((c) => STUCK_STATUSES.includes(c.status));
  const failedPayments = consultations.filter((c) => c.payment?.status === PaymentStatus.FAILED);

  const flags: string[] = [];
  if (!patient.isActive) flags.push('Account is inactive.');
  if (stuckConsultations.length) {
    flags.push(`${stuckConsultations.length} consultation(s) may need follow-up (payment/assignment).`);
  }
  if (failedPayments.length) flags.push(`${failedPayments.length} failed payment(s) on record.`);
  if (adherencePercent !== null && adherencePercent < 50 && totalDoses >= 5) {
    flags.push(`Low adherence (${adherencePercent}%) — review reminder settings and dose notes.`);
  }
  if (!patient.reminderPreference) {
    flags.push('No reminder preferences saved yet.');
  }

  return {
    account: {
      isActive: patient.isActive,
      patientCode: patient.patientCode,
      mobile: patient.mobile,
      email: patient.email
    },
    reminderPreferences: patient.reminderPreference,
    consultations: consultations.map((c) => ({
      id: c.id,
      status: c.status,
      diseaseName: c.disease?.name ?? 'Consultation',
      doctorName: c.assignedDoctor?.name ?? null,
      paymentStatus: c.payment?.status ?? null,
      paymentAmountInPaise: c.payment?.amountInPaise ?? null,
      prescriptionCount: c._count.prescriptions,
      messageCount: c._count.messages,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    })),
    adherenceSummary: {
      total: totalDoses,
      taken: takenDoses,
      skipped: doseTotals.SKIPPED ?? 0,
      missed: doseTotals.MISSED ?? 0,
      percent: adherencePercent
    },
    flags,
    recentAudit: recentAudit.map((log) => ({
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      summary: log.summary,
      createdAt: log.createdAt,
      actorName: log.actor?.name ?? null
    })),
    safeActions: [
      'Review consultation timeline and payment status before changing anything.',
      'Add a support case note documenting what you checked and next steps.',
      'Use doctor assignment only when consultation is PAID and unassigned.',
      'Direct billing issues to Payments with date filters — do not edit patient records.'
    ]
  };
}

export function parseSupportNoteCategory(value: string): SupportNoteCategory {
  const normalized = value.toUpperCase();
  if (Object.values(SupportNoteCategory).includes(normalized as SupportNoteCategory)) {
    return normalized as SupportNoteCategory;
  }
  return SupportNoteCategory.GENERAL;
}
