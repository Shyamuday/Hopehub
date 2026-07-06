import type { Request, Response } from 'express';
import { CaseAnalysisStatus, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { routeParam } from '../../utils/helpers.js';

export async function resolveDefaultRepertorySource(sourceId?: string) {
  if (sourceId) {
    return prisma.repertorySource.findUnique({ where: { id: sourceId } });
  }
  return (
    (await prisma.repertorySource.findFirst({ where: { isActive: true, code: 'OOREP_PUBLICUM' } })) ||
    (await prisma.repertorySource.findFirst({ where: { isActive: true, code: 'REPERTORIUM_PUBLICUM' } })) ||
    (await prisma.repertorySource.findFirst({ where: { isActive: true }, orderBy: { name: 'asc' } }))
  );
}

export async function assertDoctorConsultationAccess(req: Request, res: Response, consultationId: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    select: {
      id: true,
      assignedDoctorId: true,
      patientId: true,
      status: true,
      patient: { select: { id: true, name: true, patientCode: true } },
      disease: { select: { id: true, name: true } }
    }
  });

  if (!consultation) {
    res.status(404).json({ message: 'Consultation not found' });
    return null;
  }

  if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
    res.status(403).json({ message: 'Access denied' });
    return null;
  }

  return consultation;
}

export const caseAnalysisInclude = {
  source: { select: { id: true, code: true, name: true } },
  selectedRemedy: { select: { id: true, name: true, abbreviation: true } },
  rubrics: {
    orderBy: { weight: 'desc' as const },
    include: {
      rubric: {
        select: {
          id: true,
          chapter: true,
          subchapter: true,
          text: true,
          parentPath: true
        }
      }
    }
  },
  results: {
    orderBy: { rank: 'asc' as const },
    include: {
      remedy: { select: { id: true, name: true, abbreviation: true } }
    }
  }
} as const;

export async function loadCaseAnalysisForDoctor(req: Request, res: Response, analysisId: string) {
  const analysis = await prisma.caseAnalysis.findUnique({
    where: { id: analysisId },
    include: {
      ...caseAnalysisInclude,
      consultation: { select: { id: true, assignedDoctorId: true } }
    }
  });

  if (!analysis) {
    res.status(404).json({ message: 'Case analysis not found' });
    return null;
  }

  if (req.user!.role === Role.DOCTOR) {
    if (analysis.consultation) {
      if (analysis.consultation.assignedDoctorId !== req.user!.id) {
        res.status(403).json({ message: 'Access denied' });
        return null;
      }
    } else if (analysis.doctorId !== req.user!.id) {
      res.status(403).json({ message: 'Access denied' });
      return null;
    }
  }

  return analysis;
}

export function analysisIdFromReq(req: Request) {
  return routeParam(req, 'analysisId');
}

export function consultationIdFromReq(req: Request) {
  return routeParam(req, 'consultationId');
}
