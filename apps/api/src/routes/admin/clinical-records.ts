import { Router } from 'express';
import { CaseAnalysisStatus, PrescriptionOptionType, PrescriptionStatus, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  asyncRoute,
  includePrescriptionRelations,
  publicUserSelect,
  queryPositiveInt,
  queryText,
  routeParam
} from '../../utils/helpers.js';
import { caseAnalysisInclude } from '../repertory/shared.js';

function paginationMeta(page: number, pageSize: number, total: number) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function registerAdminClinicalRecordsRoutes(router: Router) {
  router.get(
    '/admin/clinical-records/method-options',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const options = await prisma.prescriptionOption.findMany({
        where: { type: PrescriptionOptionType.METHOD },
        select: { id: true, label: true, normalizedLabel: true },
        orderBy: { label: 'asc' }
      });
      res.json({ options });
    })
  );

  router.get(
    '/admin/prescriptions',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = Math.min(queryPositiveInt(req, 'pageSize', 20), 50);
      const doctorId = queryText(req, 'doctorId').trim();
      const patientId = queryText(req, 'patientId').trim();
      const methodOptionId = queryText(req, 'methodOptionId').trim();
      const consultationId = queryText(req, 'consultationId').trim();
      const status = queryText(req, 'status').trim() as PrescriptionStatus | '';
      const latestOnly = queryText(req, 'latestOnly').trim() !== 'false';
      const q = queryText(req, 'q').trim().toLowerCase();

      const where = {
        ...(latestOnly ? { isLatest: true } : {}),
        ...(patientId ? { patientId } : {}),
        ...(doctorId ? { uploadedById: doctorId } : {}),
        ...(methodOptionId ? { methodOptionId } : {}),
        ...(consultationId ? { consultationId } : {}),
        ...(status ? { status: status as PrescriptionStatus } : {}),
        ...(q
          ? {
              OR: [
                { diagnosis: { contains: q, mode: 'insensitive' as const } },
                { notes: { contains: q, mode: 'insensitive' as const } },
                { patient: { name: { contains: q, mode: 'insensitive' as const } } },
                { patient: { patientCode: { contains: q, mode: 'insensitive' as const } } },
                { uploadedBy: { name: { contains: q, mode: 'insensitive' as const } } },
                { methodOption: { label: { contains: q, mode: 'insensitive' as const } } }
              ]
            }
          : {})
      };

      const [total, prescriptions] = await Promise.all([
        prisma.prescription.count({ where }),
        prisma.prescription.findMany({
          where,
          include: {
            ...includePrescriptionRelations(),
            caseAnalysis: {
              select: {
                id: true,
                status: true,
                methodOption: { select: { id: true, label: true } }
              }
            },
            _count: { select: { items: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      res.json({
        prescriptions: prescriptions.map((item) => ({
          id: item.id,
          consultationId: item.consultationId,
          patientId: item.patientId,
          uploadedById: item.uploadedById,
          caseAnalysisId: item.caseAnalysisId,
          version: item.version,
          isLatest: item.isLatest,
          status: item.status,
          diagnosis: item.diagnosis,
          advice: item.advice,
          notes: item.notes,
          followUpDate: item.followUpDate,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          patient: item.patient,
          doctor: item.uploadedBy,
          methodOption: item.methodOption,
          diagnosedDiseaseOption: item.diagnosedDiseaseOption,
          consultation: item.consultation,
          caseAnalysis: item.caseAnalysis,
          itemCount: item._count.items
        })),
        pagination: paginationMeta(page, pageSize, total)
      });
    })
  );

  router.get(
    '/admin/prescriptions/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const prescription = await prisma.prescription.findUnique({
        where: { id },
        include: {
          ...includePrescriptionRelations(),
          caseAnalysis: {
            include: {
              methodOption: { select: { id: true, label: true } },
              selectedRemedy: { select: { id: true, name: true, abbreviation: true } },
              source: { select: { id: true, name: true } }
            }
          }
        }
      });
      if (!prescription) return res.status(404).json({ message: 'Prescription not found' });

      const assignedDoctor = prescription.consultation?.assignedDoctorId
        ? await prisma.user.findUnique({
            where: { id: prescription.consultation.assignedDoctorId },
            select: publicUserSelect
          })
        : null;

      res.json({ prescription: { ...prescription, assignedDoctor } });
    })
  );

  router.get(
    '/admin/case-analyses',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = Math.min(queryPositiveInt(req, 'pageSize', 20), 50);
      const doctorId = queryText(req, 'doctorId').trim();
      const patientId = queryText(req, 'patientId').trim();
      const methodOptionId = queryText(req, 'methodOptionId').trim();
      const consultationId = queryText(req, 'consultationId').trim();
      const status = queryText(req, 'status').trim() as CaseAnalysisStatus | '';
      const q = queryText(req, 'q').trim().toLowerCase();

      const where = {
        ...(doctorId ? { doctorId } : {}),
        ...(methodOptionId ? { methodOptionId } : {}),
        ...(consultationId ? { consultationId } : {}),
        ...(status ? { status: status as CaseAnalysisStatus } : {}),
        ...(patientId ? { consultation: { patientId } } : {}),
        ...(q
          ? {
              OR: [
                { notes: { contains: q, mode: 'insensitive' as const } },
                { doctor: { name: { contains: q, mode: 'insensitive' as const } } },
                { methodOption: { label: { contains: q, mode: 'insensitive' as const } } },
                { selectedRemedy: { name: { contains: q, mode: 'insensitive' as const } } },
                {
                  consultation: {
                    patient: { name: { contains: q, mode: 'insensitive' as const } }
                  }
                },
                {
                  consultation: {
                    patient: { patientCode: { contains: q, mode: 'insensitive' as const } }
                  }
                }
              ]
            }
          : {})
      };

      const [total, analyses] = await Promise.all([
        prisma.caseAnalysis.count({ where }),
        prisma.caseAnalysis.findMany({
          where,
          include: {
            methodOption: { select: { id: true, label: true } },
            selectedRemedy: { select: { id: true, name: true, abbreviation: true } },
            source: { select: { id: true, name: true } },
            doctor: { select: publicUserSelect },
            consultation: {
              select: {
                id: true,
                status: true,
                patientId: true,
                assignedDoctorId: true,
                disease: { select: { id: true, name: true } },
                patient: { select: publicUserSelect }
              }
            },
            _count: { select: { rubrics: true, results: true, prescriptions: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      res.json({
        analyses: analyses.map((item) => ({
          id: item.id,
          consultationId: item.consultationId,
          doctorId: item.doctorId,
          status: item.status,
          notes: item.notes,
          methodOptionId: item.methodOptionId,
          selectedRemedyId: item.selectedRemedyId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          methodOption: item.methodOption,
          selectedRemedy: item.selectedRemedy,
          source: item.source,
          doctor: item.doctor,
          consultation: item.consultation,
          rubricCount: item._count.rubrics,
          resultCount: item._count.results,
          prescriptionCount: item._count.prescriptions
        })),
        pagination: paginationMeta(page, pageSize, total)
      });
    })
  );

  router.get(
    '/admin/case-analyses/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const analysis = await prisma.caseAnalysis.findUnique({
        where: { id },
        include: {
          ...caseAnalysisInclude,
          doctor: { select: publicUserSelect },
          consultation: {
            select: {
              id: true,
              status: true,
              intakeAnswers: true,
              assignedDoctorId: true,
              disease: { select: { id: true, name: true } },
              patient: { select: publicUserSelect }
            }
          },
          prescriptions: {
            where: { isLatest: true },
            select: {
              id: true,
              diagnosis: true,
              status: true,
              createdAt: true,
              methodOption: { select: { id: true, label: true } }
            }
          }
        }
      });
      if (!analysis) return res.status(404).json({ message: 'Case analysis not found' });

      const assignedDoctor = analysis.consultation?.assignedDoctorId
        ? await prisma.user.findUnique({
            where: { id: analysis.consultation.assignedDoctorId },
            select: publicUserSelect
          })
        : null;

      res.json({ analysis: { ...analysis, assignedDoctor } });
    })
  );
}
