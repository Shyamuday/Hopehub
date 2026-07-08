import { Router } from 'express';
import { z } from 'zod';
import { CaseAnalysisStatus, Role, Prisma } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam } from '../../utils/helpers.js';
import { computeRepertorization } from '../../services/repertorization.js';
import { applyApproachRubricWeights } from '../../services/approach-repertory-weights.js';
import {
  assertMethodOptionId,
  resolveDoctorDefaultMethodOptionId
} from '../../services/doctor-prescribing-preferences.js';
import { resolvePatientLastPrescriptionMethodOptionId, loadPatientCaseHistory } from '../../services/patient-case-history.js';
import {
  analysisIdFromReq,
  assertDoctorConsultationAccess,
  caseAnalysisInclude,
  consultationIdFromReq,
  loadCaseAnalysisForDoctor,
  resolveDefaultRepertorySource
} from './shared.js';

const rubricSelectionSchema = z.object({
  rubricId: z.string().min(1),
  weight: z.number().int().min(1).max(4).default(1)
});

const updateAnalysisSchema = z.object({
  notes: z.string().max(5000).optional(),
  caseSheet: z.record(z.string(), z.string()).optional(),
  approachData: z.record(z.string(), z.unknown()).optional(),
  status: z.nativeEnum(CaseAnalysisStatus).optional(),
  sourceId: z.string().optional(),
  methodOptionId: z.string().min(1).nullable().optional(),
  methodRationale: z.string().max(2000).nullable().optional(),
  rubrics: z.array(rubricSelectionSchema).max(40).optional()
});

async function resolveCaseMethodOptionId(
  doctorId: string,
  methodOptionId?: string | null,
  patientId?: string | null
) {
  if (methodOptionId === null) return null;
  if (methodOptionId) {
    const option = await assertMethodOptionId(methodOptionId);
    if (!option) throw new Error('INVALID_METHOD');
    return option.id;
  }
  if (patientId) {
    const lastMethod = await resolvePatientLastPrescriptionMethodOptionId(patientId);
    if (lastMethod) return lastMethod.id;
  }
  return resolveDoctorDefaultMethodOptionId(doctorId);
}

export function registerCaseAnalysisRoutes(router: Router) {
  router.get(
    '/doctor/repertory/practice-session',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const doctorId = req.user!.id;
      let analysis = await prisma.caseAnalysis.findFirst({
        where: { doctorId, consultationId: null, status: CaseAnalysisStatus.DRAFT },
        include: caseAnalysisInclude,
        orderBy: { updatedAt: 'desc' }
      });

      if (!analysis) {
        const defaultSource = await resolveDefaultRepertorySource();
        if (!defaultSource) {
          return res.status(400).json({ message: 'No active repertory source configured.' });
        }
        const methodOptionId = await resolveDoctorDefaultMethodOptionId(doctorId);
        analysis = await prisma.caseAnalysis.create({
          data: {
            doctorId,
            sourceId: defaultSource.id,
            methodOptionId,
            status: CaseAnalysisStatus.DRAFT
          },
          include: caseAnalysisInclude
        });
      }

      res.json({ analysis });
    })
  );

  router.post(
    '/doctor/repertory/practice-session',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = updateAnalysisSchema.parse(req.body);
      const defaultSource = await resolveDefaultRepertorySource(body.sourceId);
      if (!defaultSource) {
        return res.status(400).json({ message: 'No active repertory source configured.' });
      }

      let methodOptionId: string | null;
      try {
        methodOptionId = await resolveCaseMethodOptionId(req.user!.id, body.methodOptionId);
      } catch {
        return res.status(400).json({ message: 'Invalid prescribing approach.' });
      }

      const analysis = await prisma.caseAnalysis.create({
        data: {
          doctorId: req.user!.id,
          sourceId: defaultSource.id,
          methodOptionId,
          methodRationale: body.methodRationale || null,
          notes: body.notes || null,
          status: CaseAnalysisStatus.DRAFT,
          rubrics: body.rubrics?.length
            ? {
                create: body.rubrics.map((item) => ({
                  rubricId: item.rubricId,
                  weight: item.weight
                }))
              }
            : undefined
        },
        include: caseAnalysisInclude
      });

      res.status(201).json({ analysis });
    })
  );

  router.get(
    '/doctor/consultations/:consultationId/case-analyses',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const consultationId = consultationIdFromReq(req);
      const consultation = await assertDoctorConsultationAccess(req, res, consultationId);
      if (!consultation) return;

      const analyses = await prisma.caseAnalysis.findMany({
        where: { consultationId },
        include: caseAnalysisInclude,
        orderBy: { createdAt: 'desc' }
      });

      res.json({ consultation, analyses });
    })
  );

  router.get(
    '/doctor/patients/:patientId/case-history',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'patientId');
      if (req.user!.role === Role.DOCTOR) {
        const hasAccess = await prisma.consultation.findFirst({
          where: { patientId, assignedDoctorId: req.user!.id },
          select: { id: true }
        });
        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }

      const doctorId = req.user!.role === Role.DOCTOR ? req.user!.id : null;
      const history = await loadPatientCaseHistory(patientId, doctorId);
      res.json(history);
    })
  );

  router.post(
    '/doctor/consultations/:consultationId/case-analyses',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const consultationId = consultationIdFromReq(req);
      const consultation = await assertDoctorConsultationAccess(req, res, consultationId);
      if (!consultation) return;

      const body = updateAnalysisSchema.parse(req.body);
      const defaultSource = await resolveDefaultRepertorySource(body.sourceId);
      if (!defaultSource) {
        return res.status(400).json({ message: 'No active repertory source configured.' });
      }

      let methodOptionId: string | null;
      try {
        methodOptionId = await resolveCaseMethodOptionId(req.user!.id, body.methodOptionId, consultation.patientId);
      } catch {
        return res.status(400).json({ message: 'Invalid prescribing approach.' });
      }

      const analysis = await prisma.caseAnalysis.create({
        data: {
          consultationId,
          doctorId: req.user!.id,
          sourceId: defaultSource.id,
          methodOptionId,
          methodRationale: body.methodRationale || null,
          notes: body.notes || null,
          status: body.status || CaseAnalysisStatus.DRAFT,
          rubrics: body.rubrics?.length
            ? {
                create: body.rubrics.map((item) => ({
                  rubricId: item.rubricId,
                  weight: item.weight
                }))
              }
            : undefined
        },
        include: caseAnalysisInclude
      });

      res.status(201).json({ analysis });
    })
  );

  router.get(
    '/doctor/case-analyses/:analysisId',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const analysis = await loadCaseAnalysisForDoctor(req, res, analysisIdFromReq(req));
      if (!analysis) return;
      const { consultation: _consultation, ...payload } = analysis;
      res.json({ analysis: payload });
    })
  );

  router.patch(
    '/doctor/case-analyses/:analysisId',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const analysisId = analysisIdFromReq(req);
      const existing = await loadCaseAnalysisForDoctor(req, res, analysisId);
      if (!existing) return;

      const body = updateAnalysisSchema.parse(req.body);

      if (body.sourceId) {
        const source = await prisma.repertorySource.findUnique({ where: { id: body.sourceId } });
        if (!source) {
          return res.status(400).json({ message: 'Invalid repertory source.' });
        }
      }

      if (body.methodOptionId) {
        const method = await assertMethodOptionId(body.methodOptionId);
        if (!method) {
          return res.status(400).json({ message: 'Invalid prescribing approach.' });
        }
      }

      const analysis = await prisma.$transaction(async (tx) => {
        if (body.rubrics) {
          await tx.caseAnalysisRubric.deleteMany({ where: { analysisId } });
          if (body.rubrics.length) {
            await tx.caseAnalysisRubric.createMany({
              data: body.rubrics.map((item) => ({
                analysisId,
                rubricId: item.rubricId,
                weight: item.weight
              }))
            });
          }
          await tx.caseAnalysisResult.deleteMany({ where: { analysisId } });
        }

        return tx.caseAnalysis.update({
          where: { id: analysisId },
          data: {
            notes: body.notes === undefined ? undefined : body.notes || null,
            caseSheet: body.caseSheet === undefined ? undefined : body.caseSheet,
            approachData:
              body.approachData === undefined
                ? undefined
                : (body.approachData as Prisma.InputJsonValue),
            status: body.status,
            sourceId: body.sourceId,
            methodOptionId: body.methodOptionId === undefined ? undefined : body.methodOptionId,
            methodRationale:
              body.methodRationale === undefined ? undefined : body.methodRationale || null
          },
          include: caseAnalysisInclude
        });
      });

      res.json({ analysis });
    })
  );

  router.post(
    '/doctor/case-analyses/:analysisId/repertorize',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const analysisId = analysisIdFromReq(req);
      const existing = await loadCaseAnalysisForDoctor(req, res, analysisId);
      if (!existing) return;

      if (!existing.rubrics.length) {
        return res.status(400).json({ message: 'Add at least one rubric before repertorizing.' });
      }

      const rubricIds = existing.rubrics.map((item) => item.rubricId);
      const rubricMeta = await prisma.repertoryRubric.findMany({
        where: { id: { in: rubricIds } },
        select: { id: true, chapter: true }
      });
      const chapterByRubricId = new Map(rubricMeta.map((item) => [item.id, item.chapter]));

      const weightedRubrics = applyApproachRubricWeights(
        existing.methodOption?.label,
        existing.rubrics.map((item) => ({
          rubricId: item.rubricId,
          weight: item.weight,
          chapter: chapterByRubricId.get(item.rubricId)
        }))
      );
      const weightByRubricId = new Map(weightedRubrics.map((item) => [item.rubricId, item.weight]));

      const remedyLinks = await prisma.repertoryRubricRemedy.findMany({
        where: { rubricId: { in: rubricIds } },
        select: { rubricId: true, remedyId: true, grade: true }
      });

      const linksByRubric = new Map<string, Array<{ remedyId: string; grade: number }>>();
      for (const link of remedyLinks) {
        const bucket = linksByRubric.get(link.rubricId) || [];
        bucket.push({ remedyId: link.remedyId, grade: link.grade });
        linksByRubric.set(link.rubricId, bucket);
      }

      const ranked = computeRepertorization(
        existing.rubrics.map((item) => ({
          rubricId: item.rubricId,
          weight: weightByRubricId.get(item.rubricId) || item.weight,
          remedyGrades: linksByRubric.get(item.rubricId) || []
        }))
      ).slice(0, 25);

      const analysis = await prisma.$transaction(async (tx) => {
        await tx.caseAnalysisResult.deleteMany({ where: { analysisId } });
        if (ranked.length) {
          await tx.caseAnalysisResult.createMany({
            data: ranked.map((item, index) => ({
              analysisId,
              remedyId: item.remedyId,
              totalScore: item.totalScore,
              coverage: item.coverage,
              rank: index + 1
            }))
          });
        }

        return tx.caseAnalysis.update({
          where: { id: analysisId },
          data: { status: CaseAnalysisStatus.DRAFT },
          include: caseAnalysisInclude
        });
      });

      res.json({ analysis, meta: { rubricCount: existing.rubrics.length, resultCount: ranked.length } });
    })
  );

  router.patch(
    '/doctor/case-analyses/:analysisId/select-remedy',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const analysisId = analysisIdFromReq(req);
      const existing = await loadCaseAnalysisForDoctor(req, res, analysisId);
      if (!existing) return;

      const body = z.object({ remedyId: z.string().min(1) }).parse(req.body);
      const remedy = await prisma.homeopathicRemedy.findUnique({ where: { id: body.remedyId } });
      if (!remedy) {
        return res.status(400).json({ message: 'Invalid remedy.' });
      }

      const analysis = await prisma.caseAnalysis.update({
        where: { id: analysisId },
        data: {
          selectedRemedyId: remedy.id,
          status: CaseAnalysisStatus.FINALIZED
        },
        include: caseAnalysisInclude
      });

      res.json({ analysis });
    })
  );
}
