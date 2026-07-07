import { PrescriptionStatus } from '@prisma/client';
import { prisma } from '../db.js';

export async function resolvePatientLastPrescriptionMethodOptionId(patientId: string) {
  const last = await prisma.prescription.findFirst({
    where: {
      patientId,
      status: PrescriptionStatus.PUBLISHED,
      methodOptionId: { not: null }
    },
    orderBy: { createdAt: 'desc' },
    select: {
      methodOptionId: true,
      methodOption: { select: { id: true, label: true } }
    }
  });

  return last?.methodOption ?? null;
}

export async function loadPatientCaseHistory(patientId: string, doctorId?: string | null) {
  const consultations = await prisma.consultation.findMany({
    where: { patientId, assignedDoctorId: doctorId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      status: true,
      createdAt: true,
      disease: { select: { name: true } },
      caseAnalyses: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          methodOption: { select: { id: true, label: true } },
          selectedRemedy: { select: { id: true, name: true } },
          _count: { select: { rubrics: true } }
        }
      },
      prescriptions: {
        where: { isLatest: true },
        orderBy: { version: 'desc' },
        take: 1,
        select: {
          id: true,
          diagnosis: true,
          status: true,
          createdAt: true,
          methodOption: { select: { id: true, label: true } },
          caseAnalysisId: true
        }
      }
    }
  });

  const lastPrescriptionMethod = await resolvePatientLastPrescriptionMethodOptionId(patientId);

  return {
    lastPrescriptionMethod,
    entries: consultations.map((consultation) => ({
      consultationId: consultation.id,
      consultationDate: consultation.createdAt.toISOString(),
      diseaseName: consultation.disease.name,
      status: consultation.status,
      analyses: consultation.caseAnalyses.map((analysis) => ({
        id: analysis.id,
        methodLabel: analysis.methodOption?.label ?? null,
        selectedRemedyName: analysis.selectedRemedy?.name ?? null,
        status: analysis.status,
        createdAt: analysis.createdAt.toISOString(),
        rubricCount: analysis._count.rubrics
      })),
      prescription: consultation.prescriptions[0]
        ? {
            id: consultation.prescriptions[0].id,
            methodLabel: consultation.prescriptions[0].methodOption?.label ?? null,
            diagnosis: consultation.prescriptions[0].diagnosis,
            status: consultation.prescriptions[0].status,
            createdAt: consultation.prescriptions[0].createdAt.toISOString(),
            caseAnalysisId: consultation.prescriptions[0].caseAnalysisId
          }
        : null
    }))
  };
}
