import { ImagingInterpretationStatus, type Prisma } from '@prisma/client';
import { CLINICAL_MEDIA_TYPE_LABELS, type ClinicalMediaType } from '../lib/homeopathy-approaches.js';
import { prisma } from '../db.js';
import { analyzeClinicalMediaImage } from './clinical-media-rubric-analysis.js';
import {
  buildFailedPatientPreview,
  buildPatientPreviewFromAnalysis,
  buildProcessingPatientPreview,
  mapJobStatusToPatientStatus,
  type PatientImagingPreview
} from './patient-imaging-preview.js';

export async function queuePatientMediaAnalysis(mediaId: string) {
  const media = await prisma.clinicalMedia.findUnique({
    where: { id: mediaId },
    select: { id: true, mediaType: true }
  });
  if (!media) return;

  const mediaTypeLabel = CLINICAL_MEDIA_TYPE_LABELS[media.mediaType as ClinicalMediaType] ?? media.mediaType;

  const inFlight = await prisma.imagingInterpretation.findFirst({
    where: { mediaId, analysisJobStatus: 'PROCESSING' },
    select: { id: true }
  });
  if (inFlight) return;

  await prisma.imagingInterpretation.create({
    data: {
      mediaId,
      aiProvider: 'pending',
      aiModel: 'pending',
      structuredSnapshot: { pending: true },
      patientPreviewSnapshot: buildProcessingPatientPreview({
        mediaId,
        mediaTypeLabel
      }) as unknown as Prisma.InputJsonValue,
      status: ImagingInterpretationStatus.PENDING,
      analysisJobStatus: 'PROCESSING',
      visibleToPatient: true
    }
  });

  setImmediate(() => {
    void runPatientMediaAnalysis(mediaId).catch((error) => {
      console.error('[patient-media-analysis] failed', mediaId, error);
    });
  });
}

export async function runPatientMediaAnalysis(mediaId: string) {
  const media = await prisma.clinicalMedia.findUnique({
    where: { id: mediaId },
    select: { id: true, mediaType: true }
  });
  if (!media) return;

  const mediaTypeLabel = CLINICAL_MEDIA_TYPE_LABELS[media.mediaType as ClinicalMediaType] ?? media.mediaType;
  const job = await prisma.imagingInterpretation.findFirst({
    where: { mediaId, analysisJobStatus: 'PROCESSING' },
    orderBy: { createdAt: 'desc' }
  });

  try {
    const analysis = await analyzeClinicalMediaImage({
      mediaId,
      forPatientPreview: true
    });

    if (!analysis) {
      throw new Error('ANALYSIS_EMPTY');
    }

    const patientPreview = buildPatientPreviewFromAnalysis(analysis);

    if (job) {
      await prisma.imagingInterpretation.update({
        where: { id: job.id },
        data: {
          aiProvider: analysis.extractionSource === 'local-pdf-text' ? 'local-pdf-text' : 'ollama',
          aiModel: analysis.visionModel,
          rawAiOutput: analysis.extractedSymptoms,
          structuredSnapshot: analysis as unknown as Prisma.InputJsonValue,
          patientPreviewSnapshot: patientPreview as unknown as Prisma.InputJsonValue,
          status: ImagingInterpretationStatus.READY,
          analysisJobStatus: 'READY'
        }
      });
    }
  } catch (error) {
    const reason =
      error instanceof Error && error.message === 'OLLAMA_UNAVAILABLE'
        ? 'Vision AI is temporarily unavailable. Your doctor will review the upload directly.'
        : error instanceof Error && error.message === 'PDF_NO_TEXT'
          ? 'This PDF looks like a scanned image. Your doctor can review it during consultation.'
          : undefined;

    const failedPreview = buildFailedPatientPreview({ mediaId, mediaTypeLabel, reason });

    if (job) {
      await prisma.imagingInterpretation.update({
        where: { id: job.id },
        data: {
          status: ImagingInterpretationStatus.FAILED,
          analysisJobStatus: 'FAILED',
          patientPreviewSnapshot: failedPreview as unknown as Prisma.InputJsonValue,
          structuredSnapshot: { failed: true, reason: reason ?? 'unknown' }
        }
      });
    } else {
      await prisma.imagingInterpretation.create({
        data: {
          mediaId,
          aiProvider: 'failed',
          aiModel: 'failed',
          structuredSnapshot: { failed: true },
          patientPreviewSnapshot: failedPreview as unknown as Prisma.InputJsonValue,
          status: ImagingInterpretationStatus.FAILED,
          analysisJobStatus: 'FAILED',
          visibleToPatient: true
        }
      });
    }
  }
}

export async function getPatientMediaAiPreview(patientId: string, mediaId: string) {
  const media = await prisma.clinicalMedia.findFirst({
    where: { id: mediaId, patientId },
    select: { id: true, mediaType: true }
  });
  if (!media) return null;

  const interpretation = await prisma.imagingInterpretation.findFirst({
    where: { mediaId, visibleToPatient: true },
    orderBy: { createdAt: 'desc' }
  });

  const mediaTypeLabel = CLINICAL_MEDIA_TYPE_LABELS[media.mediaType as ClinicalMediaType] ?? media.mediaType;

  if (!interpretation?.patientPreviewSnapshot) {
    return {
      preview: buildProcessingPatientPreview({ mediaId, mediaTypeLabel }),
      interpretationId: null
    };
  }

  const preview = {
    ...(interpretation.patientPreviewSnapshot as unknown as PatientImagingPreview),
    status: mapJobStatusToPatientStatus(interpretation.analysisJobStatus)
  };

  if (!interpretation.patientViewedAt) {
    await prisma.imagingInterpretation.update({
      where: { id: interpretation.id },
      data: { patientViewedAt: new Date() }
    });
  }

  return { preview, interpretationId: interpretation.id };
}

export async function latestAiPreviewStatusForMedia(mediaIds: string[]) {
  if (!mediaIds.length) return new Map<string, PatientImagingPreview['status']>();

  const rows = await prisma.imagingInterpretation.findMany({
    where: { mediaId: { in: mediaIds }, visibleToPatient: true },
    orderBy: { createdAt: 'desc' },
    select: { mediaId: true, analysisJobStatus: true }
  });

  const map = new Map<string, PatientImagingPreview['status']>();
  for (const row of rows) {
    if (map.has(row.mediaId)) continue;
    map.set(row.mediaId, mapJobStatusToPatientStatus(row.analysisJobStatus));
  }
  return map;
}
