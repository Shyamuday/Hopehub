import { Router } from 'express';
import { z } from 'zod';
import { ClinicalMediaType, Role } from '@prisma/client';
import {
  CLINICAL_MEDIA_TYPE_LABELS,
  clinicalMediaMetaPayload,
  observationHintsForMediaType,
  suggestRubricSearchPhrases,
  type ClinicalMediaType as OntologyMediaType
} from '../../lib/homeopathy-approaches.js';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam } from '../../utils/helpers.js';
import {
  deleteClinicalMediaFile,
  readClinicalMediaFile,
  saveClinicalMediaFile
} from '../../services/clinical-media-storage.js';
import {
  assertClinicalMediaAccess,
  clinicalMediaInclude,
  doctorCanAccessPatient,
  loadActiveDiseaseOptions,
  mapClinicalMediaUploadError,
  resolvePatientIdForAnalysis,
  serializeClinicalMedia
} from '../../services/clinical-media-shared.js';
import { analyzeClinicalMediaImage } from '../../services/clinical-media-rubric-analysis.js';
import { isOllamaVisionAvailable, ollamaVisionConfig } from '../../services/clinical-media-vision.js';
import { analysisIdFromReq, loadCaseAnalysisForDoctor } from './shared.js';

const mediaTypeSchema = z.nativeEnum(ClinicalMediaType);

const createMediaSchema = z.object({
  mediaType: mediaTypeSchema,
  bodyRegion: z.string().max(120).optional(),
  observations: z.string().max(4000).optional(),
  patientConsent: z.boolean().optional().default(false),
  diseaseId: z.string().min(1).optional(),
  conditionLabel: z.string().max(200).optional(),
  consultationId: z.string().min(1).optional(),
  mimeType: z.string().min(3).max(80),
  fileName: z.string().max(200).optional(),
  dataBase64: z.string().min(1)
});

const updateMediaSchema = z.object({
  bodyRegion: z.string().max(120).optional(),
  observations: z.string().max(4000).optional(),
  patientConsent: z.boolean().optional(),
  diseaseId: z.string().min(1).nullable().optional(),
  conditionLabel: z.string().max(200).nullable().optional()
});

const suggestPhrasesSchema = z.object({
  mediaType: mediaTypeSchema,
  observations: z.string().max(4000).optional(),
  bodyRegion: z.string().max(120).optional()
});

async function saveUploadedClinicalMedia(input: {
  patientId: string;
  uploadedById: string;
  body: z.infer<typeof createMediaSchema>;
  caseAnalysisId?: string | null;
  consultationId?: string | null;
  diseaseId?: string | null;
  requireConsent: boolean;
}) {
  if (input.requireConsent && !input.body.patientConsent) {
    return { error: { status: 400, message: 'Patient consent is required before attaching clinical images.' } };
  }

  let storageKey: string;
  try {
    ({ storageKey } = await saveClinicalMediaFile({
      patientId: input.patientId,
      mimeType: input.body.mimeType,
      fileName: input.body.fileName,
      dataBase64: input.body.dataBase64
    }));
  } catch (error) {
    return { error: mapClinicalMediaUploadError(error) };
  }

  const media = await prisma.clinicalMedia.create({
    data: {
      patientId: input.patientId,
      caseAnalysisId: input.caseAnalysisId ?? null,
      consultationId: input.consultationId ?? input.body.consultationId ?? null,
      diseaseId: input.diseaseId ?? input.body.diseaseId ?? null,
      conditionLabel: input.body.conditionLabel?.trim() || null,
      uploadedById: input.uploadedById,
      mediaType: input.body.mediaType,
      bodyRegion: input.body.bodyRegion?.trim() || null,
      storageKey,
      mimeType: input.body.mimeType,
      fileName: input.body.fileName?.trim() || null,
      observations: input.body.observations?.trim() || null,
      patientConsent: input.requireConsent ? true : Boolean(input.body.patientConsent)
    },
    include: clinicalMediaInclude
  });

  return { media };
}

export function registerClinicalMediaRoutes(router: Router) {
  router.get(
    '/clinical-media/meta',
    authRequired,
    allowRoles(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.HR),
    asyncRoute(async (_req, res) => {
      const diseases = await loadActiveDiseaseOptions();
      res.json(clinicalMediaMetaPayload(diseases));
    })
  );

  router.get(
    '/clinical-media/observation-hints',
    authRequired,
    allowRoles(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const raw = req.query.mediaType;
      const mediaType = mediaTypeSchema.parse(typeof raw === 'string' ? raw : '');
      res.json({
        mediaType,
        label: CLINICAL_MEDIA_TYPE_LABELS[mediaType as OntologyMediaType],
        hints: observationHintsForMediaType(mediaType as OntologyMediaType)
      });
    })
  );

  router.post(
    '/clinical-media/suggest-rubric-phrases',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = suggestPhrasesSchema.parse(req.body);
      const phrases = suggestRubricSearchPhrases({
        mediaType: body.mediaType as OntologyMediaType,
        observations: body.observations,
        bodyRegion: body.bodyRegion
      });
      res.json({ phrases });
    })
  );

  router.get(
    '/clinical-media/:mediaId/file',
    authRequired,
    allowRoles(Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const mediaId = routeParam(req, 'mediaId');
      const media = await prisma.clinicalMedia.findUnique({ where: { id: mediaId } });
      if (!media) return res.status(404).json({ message: 'Clinical media not found' });

      const allowed = await assertClinicalMediaAccess({
        userId: req.user!.id,
        role: req.user!.role,
        media,
        res
      });
      if (!allowed) return;

      const bytes = await readClinicalMediaFile(media.storageKey);
      res.setHeader('Content-Type', media.mimeType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(bytes);
    })
  );

  router.get(
    '/patient/clinical-media',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const media = await prisma.clinicalMedia.findMany({
        where: { patientId: req.user!.id },
        include: clinicalMediaInclude,
        orderBy: { createdAt: 'desc' }
      });
      res.json({ media: media.map(serializeClinicalMedia) });
    })
  );

  router.post(
    '/patient/clinical-media',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = createMediaSchema.parse({ ...req.body, patientConsent: true });
      const result = await saveUploadedClinicalMedia({
        patientId: req.user!.id,
        uploadedById: req.user!.id,
        body,
        requireConsent: false
      });
      if ('error' in result && result.error) {
        return res.status(result.error.status).json({ message: result.error.message });
      }
      res.status(201).json({ media: serializeClinicalMedia(result.media!) });
    })
  );

  router.patch(
    '/patient/clinical-media/:mediaId',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const mediaId = routeParam(req, 'mediaId');
      const existing = await prisma.clinicalMedia.findFirst({
        where: { id: mediaId, patientId: req.user!.id }
      });
      if (!existing) return res.status(404).json({ message: 'Clinical media not found' });

      const body = updateMediaSchema.parse(req.body);
      const media = await prisma.clinicalMedia.update({
        where: { id: mediaId },
        data: {
          ...(body.bodyRegion !== undefined ? { bodyRegion: body.bodyRegion.trim() || null } : {}),
          ...(body.observations !== undefined ? { observations: body.observations.trim() || null } : {}),
          ...(body.diseaseId !== undefined ? { diseaseId: body.diseaseId } : {}),
          ...(body.conditionLabel !== undefined ? { conditionLabel: body.conditionLabel?.trim() || null } : {})
        },
        include: clinicalMediaInclude
      });
      res.json({ media: serializeClinicalMedia(media) });
    })
  );

  router.delete(
    '/patient/clinical-media/:mediaId',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const mediaId = routeParam(req, 'mediaId');
      const existing = await prisma.clinicalMedia.findFirst({
        where: { id: mediaId, patientId: req.user!.id, uploadedById: req.user!.id }
      });
      if (!existing) return res.status(404).json({ message: 'Clinical media not found' });

      await deleteClinicalMediaFile(existing.storageKey);
      await prisma.clinicalMedia.delete({ where: { id: mediaId } });
      res.json({ ok: true });
    })
  );

  router.get(
    '/doctor/patients/:patientId/clinical-media',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'patientId');
      if (req.user!.role === Role.DOCTOR) {
        const allowed = await doctorCanAccessPatient(req.user!.id, patientId, false);
        if (!allowed) return res.status(403).json({ message: 'Access denied.' });
      }

      const media = await prisma.clinicalMedia.findMany({
        where: { patientId },
        include: clinicalMediaInclude,
        orderBy: { createdAt: 'desc' }
      });
      res.json({ media: media.map(serializeClinicalMedia) });
    })
  );

  router.post(
    '/doctor/patients/:patientId/clinical-media',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'patientId');
      if (req.user!.role === Role.DOCTOR) {
        const allowed = await doctorCanAccessPatient(req.user!.id, patientId, false);
        if (!allowed) return res.status(403).json({ message: 'Access denied.' });
      }

      const body = createMediaSchema.parse(req.body);
      const result = await saveUploadedClinicalMedia({
        patientId,
        uploadedById: req.user!.id,
        body,
        requireConsent: true
      });
      if ('error' in result && result.error) {
        return res.status(result.error.status).json({ message: result.error.message });
      }
      res.status(201).json({ media: serializeClinicalMedia(result.media!) });
    })
  );

  router.delete(
    '/doctor/patients/:patientId/clinical-media/:mediaId',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'patientId');
      const mediaId = routeParam(req, 'mediaId');
      if (req.user!.role === Role.DOCTOR) {
        const allowed = await doctorCanAccessPatient(req.user!.id, patientId, false);
        if (!allowed) return res.status(403).json({ message: 'Access denied.' });
      }

      const existing = await prisma.clinicalMedia.findFirst({
        where: { id: mediaId, patientId }
      });
      if (!existing) return res.status(404).json({ message: 'Clinical media not found' });

      await deleteClinicalMediaFile(existing.storageKey);
      await prisma.clinicalMedia.delete({ where: { id: mediaId } });
      res.json({ ok: true });
    })
  );

  router.get(
    '/doctor/clinical-media/observation-hints',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const raw = req.query.mediaType;
      const mediaType = mediaTypeSchema.parse(typeof raw === 'string' ? raw : '');
      res.json({
        mediaType,
        label: CLINICAL_MEDIA_TYPE_LABELS[mediaType as OntologyMediaType],
        hints: observationHintsForMediaType(mediaType as OntologyMediaType)
      });
    })
  );

  router.post(
    '/doctor/clinical-media/suggest-rubric-phrases',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = suggestPhrasesSchema.parse(req.body);
      const phrases = suggestRubricSearchPhrases({
        mediaType: body.mediaType as OntologyMediaType,
        observations: body.observations,
        bodyRegion: body.bodyRegion
      });
      res.json({ phrases });
    })
  );

  router.get(
    '/doctor/clinical-media/vision-status',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const available = await isOllamaVisionAvailable();
      res.json({ available, ...ollamaVisionConfig() });
    })
  );

  router.post(
    '/doctor/case-analyses/:analysisId/clinical-media/:mediaId/analyze-image',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const analysisId = analysisIdFromReq(req);
      const mediaId = routeParam(req, 'mediaId');
      const analysis = await loadCaseAnalysisForDoctor(req, res, analysisId);
      if (!analysis) return;

      const body = z
        .object({
          saveObservations: z.boolean().optional().default(false)
        })
        .parse(req.body ?? {});

      try {
        const result = await analyzeClinicalMediaImage({
          analysisId,
          mediaId,
          saveObservations: body.saveObservations
        });
        if (!result) {
          return res.status(404).json({ message: 'Clinical media not found for this case analysis.' });
        }

        let media = null;
        if (body.saveObservations) {
          const updated = await prisma.clinicalMedia.findUnique({
            where: { id: mediaId },
            include: clinicalMediaInclude
          });
          media = updated ? serializeClinicalMedia(updated) : null;
        }

        res.json({ analysis: result, media });
      } catch (error) {
        if (error instanceof Error && error.message === 'OLLAMA_UNAVAILABLE') {
          return res.status(503).json({
            message:
              'Local vision AI is not available. Start Ollama and pull the vision model (e.g. ollama pull qwen2.5-vl:7b).',
            ...ollamaVisionConfig(),
            available: false
          });
        }
        throw error;
      }
    })
  );

  router.get(
    '/doctor/case-analyses/:analysisId/clinical-media',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const analysisId = analysisIdFromReq(req);
      const analysis = await loadCaseAnalysisForDoctor(req, res, analysisId);
      if (!analysis) return;

      const media = await prisma.clinicalMedia.findMany({
        where: { caseAnalysisId: analysisId },
        include: clinicalMediaInclude,
        orderBy: { createdAt: 'desc' }
      });

      res.json({ media: media.map(serializeClinicalMedia) });
    })
  );

  router.post(
    '/doctor/case-analyses/:analysisId/clinical-media',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const analysisId = analysisIdFromReq(req);
      const analysis = await loadCaseAnalysisForDoctor(req, res, analysisId);
      if (!analysis) return;

      const body = createMediaSchema.parse(req.body);
      const patientContext = await resolvePatientIdForAnalysis(analysisId);
      if (!patientContext) {
        return res.status(400).json({
          message: 'Link this case analysis to a consultation before attaching clinical images.'
        });
      }

      const result = await saveUploadedClinicalMedia({
        patientId: patientContext.patientId,
        uploadedById: req.user!.id,
        body,
        caseAnalysisId: analysisId,
        consultationId: patientContext.consultationId,
        diseaseId: body.diseaseId ?? patientContext.diseaseId,
        requireConsent: true
      });
      if ('error' in result && result.error) {
        return res.status(result.error.status).json({ message: result.error.message });
      }
      res.status(201).json({ media: serializeClinicalMedia(result.media!) });
    })
  );

  router.patch(
    '/doctor/case-analyses/:analysisId/clinical-media/:mediaId',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const analysisId = analysisIdFromReq(req);
      const mediaId = routeParam(req, 'mediaId');
      const analysis = await loadCaseAnalysisForDoctor(req, res, analysisId);
      if (!analysis) return;

      const existing = await prisma.clinicalMedia.findFirst({
        where: { id: mediaId, caseAnalysisId: analysisId }
      });
      if (!existing) return res.status(404).json({ message: 'Clinical media not found' });

      const body = updateMediaSchema.parse(req.body);
      const media = await prisma.clinicalMedia.update({
        where: { id: mediaId },
        data: {
          ...(body.bodyRegion !== undefined ? { bodyRegion: body.bodyRegion.trim() || null } : {}),
          ...(body.observations !== undefined ? { observations: body.observations.trim() || null } : {}),
          ...(body.patientConsent !== undefined ? { patientConsent: body.patientConsent } : {}),
          ...(body.diseaseId !== undefined ? { diseaseId: body.diseaseId } : {}),
          ...(body.conditionLabel !== undefined ? { conditionLabel: body.conditionLabel?.trim() || null } : {})
        },
        include: clinicalMediaInclude
      });

      res.json({ media: serializeClinicalMedia(media) });
    })
  );

  router.delete(
    '/doctor/case-analyses/:analysisId/clinical-media/:mediaId',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const analysisId = analysisIdFromReq(req);
      const mediaId = routeParam(req, 'mediaId');
      const analysis = await loadCaseAnalysisForDoctor(req, res, analysisId);
      if (!analysis) return;

      const existing = await prisma.clinicalMedia.findFirst({
        where: { id: mediaId, caseAnalysisId: analysisId }
      });
      if (!existing) return res.status(404).json({ message: 'Clinical media not found' });

      await deleteClinicalMediaFile(existing.storageKey);
      await prisma.clinicalMedia.delete({ where: { id: mediaId } });
      res.json({ ok: true });
    })
  );

  router.get(
    '/doctor/case-analyses/:analysisId/clinical-media/:mediaId/file',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const analysisId = analysisIdFromReq(req);
      const mediaId = routeParam(req, 'mediaId');
      const analysis = await loadCaseAnalysisForDoctor(req, res, analysisId);
      if (!analysis) return;

      const media = await prisma.clinicalMedia.findFirst({
        where: { id: mediaId, caseAnalysisId: analysisId }
      });
      if (!media) return res.status(404).json({ message: 'Clinical media not found' });

      const bytes = await readClinicalMediaFile(media.storageKey);
      res.setHeader('Content-Type', media.mimeType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(bytes);
    })
  );
}
