import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { CONSUMER_CONCERN_FLOW_DEFINITIONS } from '../constants/consumer-concern-flows.js';
import { prisma } from '../db.js';
import { asyncRoute } from '../utils/helpers.js';

export const consumerFlowsRouter = Router();

type ActiveAssessmentSummary = {
  id: string;
  title: string;
  type: string;
  category: string;
};

consumerFlowsRouter.get(
  '/hope-hub/consumer-flows',
  asyncRoute(async (_req, res) => {
    const assessmentIds = CONSUMER_CONCERN_FLOW_DEFINITIONS.map((flow) => flow.assessmentId);
    const assessments = await prisma.$queryRaw<ActiveAssessmentSummary[]>(Prisma.sql`
      SELECT "id", "title", "type", "category"
      FROM "AssessmentDefinition"
      WHERE "id" IN (${Prisma.join(assessmentIds)}) AND "isActive" = true
    `);
    const assessmentById = new Map(assessments.map((assessment) => [assessment.id, assessment]));

    const flows = CONSUMER_CONCERN_FLOW_DEFINITIONS.map((flow) => {
      const assessment = assessmentById.get(flow.assessmentId) ?? null;
      return {
        ...flow,
        assessmentAvailable: Boolean(assessment),
        assessmentTitle: assessment?.title ?? null,
        routes: {
          assessment: `/assessments/${encodeURIComponent(flow.assessmentId)}`,
          careTeam: '/care-team',
          booking: '/contact'
        },
        queryParams: {
          careTeam: {
            concern: flow.label,
            roleGroup: flow.supportPath
          },
          booking: {
            concern: flow.label,
            supportPath: flow.supportPath,
            source: 'concern-flow'
          }
        }
      };
    });

    const missingAssessments = flows
      .filter((flow) => !flow.assessmentAvailable)
      .map((flow) => ({
        concernKey: flow.key,
        assessmentId: flow.assessmentId,
        issue: 'AssessmentDefinition is missing or inactive.'
      }));

    res.json({
      flows,
      issues: missingAssessments,
      meta: {
        source: 'backend',
        total: flows.length,
        healthy: missingAssessments.length === 0
      }
    });
  })
);
