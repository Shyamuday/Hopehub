import type { Response } from 'express';
import { ClinicalMediaType, Role } from '@prisma/client';
import {
  CLINICAL_MEDIA_TYPE_LABELS,
  type ClinicalMediaType as OntologyMediaType
} from '@vitalis/homeopathy-approaches';
import { prisma } from '../db.js';

export const clinicalMediaFilePath = (mediaId: string) => `/clinical-media/${mediaId}/file`;

export function mapClinicalMediaUploadError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'UNSUPPORTED_MIME') {
    return { status: 400, message: 'Only JPEG, PNG, WebP, and GIF images are supported.' };
  }
  if (code === 'FILE_TOO_LARGE') {
    return { status: 400, message: 'Image must be 5 MB or smaller.' };
  }
  return { status: 400, message: 'Could not save image.' };
}

export function serializeClinicalMedia(item: {
  id: string;
  patientId: string;
  caseAnalysisId: string | null;
  consultationId: string | null;
  diseaseId: string | null;
  conditionLabel: string | null;
  uploadedById: string;
  mediaType: ClinicalMediaType;
  bodyRegion: string | null;
  mimeType: string;
  fileName: string | null;
  observations: string | null;
  patientConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy?: { id: string; name: string; role: Role } | null;
  disease?: { id: string; name: string } | null;
}) {
  return {
    id: item.id,
    patientId: item.patientId,
    caseAnalysisId: item.caseAnalysisId,
    consultationId: item.consultationId,
    diseaseId: item.diseaseId,
    conditionLabel: item.conditionLabel,
    uploadedById: item.uploadedById,
    uploadedByName: item.uploadedBy?.name ?? null,
    uploadedByRole: item.uploadedBy?.role ?? null,
    mediaType: item.mediaType,
    mediaTypeLabel: CLINICAL_MEDIA_TYPE_LABELS[item.mediaType as OntologyMediaType],
    bodyRegion: item.bodyRegion,
    diseaseName: item.disease?.name ?? null,
    mimeType: item.mimeType,
    fileName: item.fileName,
    observations: item.observations,
    patientConsent: item.patientConsent,
    fileUrl: clinicalMediaFilePath(item.id),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

export const clinicalMediaInclude = {
  uploadedBy: { select: { id: true, name: true, role: true } },
  disease: { select: { id: true, name: true } }
} as const;

export async function doctorCanAccessPatient(doctorId: string, patientId: string, isAdmin: boolean) {
  if (isAdmin) return true;
  const linked = await prisma.consultation.findFirst({
    where: { patientId, assignedDoctorId: doctorId },
    select: { id: true }
  });
  return Boolean(linked);
}

export async function assertClinicalMediaAccess(input: {
  userId: string;
  role: Role;
  media: { patientId: string; uploadedById: string };
  res: Response;
}) {
  if (input.role === Role.PATIENT) {
    if (input.media.patientId !== input.userId) {
      input.res.status(403).json({ message: 'Access denied.' });
      return false;
    }
    return true;
  }

  if (input.role === Role.DOCTOR) {
    const allowed = await doctorCanAccessPatient(input.userId, input.media.patientId, false);
    if (!allowed) {
      input.res.status(403).json({ message: 'Access denied.' });
      return false;
    }
    return true;
  }

  if (input.role === Role.ADMIN || input.role === Role.HR) {
    return true;
  }

  input.res.status(403).json({ message: 'Access denied.' });
  return false;
}

export async function resolvePatientIdForAnalysis(analysisId: string) {
  const analysis = await prisma.caseAnalysis.findUnique({
    where: { id: analysisId },
    select: { consultation: { select: { id: true, patientId: true, diseaseId: true } } }
  });
  return analysis?.consultation
    ? {
        patientId: analysis.consultation.patientId,
        consultationId: analysis.consultation.id,
        diseaseId: analysis.consultation.diseaseId
      }
    : null;
}

export async function loadActiveDiseaseOptions() {
  return prisma.disease.findMany({
    where: { isActive: true },
    select: { id: true, name: true, publicCategory: true },
    orderBy: { name: 'asc' }
  });
}
