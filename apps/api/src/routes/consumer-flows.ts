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

type ActiveServiceSummary = {
  id: string;
  slug: string | null;
  name: string;
  description: string;
  publicDescription: string | null;
  publicPageContent: unknown;
};

function searchableServiceText(service: ActiveServiceSummary): string {
  return [
    service.id,
    service.slug,
    service.name,
    service.description,
    service.publicDescription,
    JSON.stringify(service.publicPageContent ?? {})
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

consumerFlowsRouter.get(
  '/hope-hub/consumer-flows',
  asyncRoute(async (_req, res) => {
    const assessmentIds = CONSUMER_CONCERN_FLOW_DEFINITIONS.map((flow) => flow.assessmentId);
    const [assessments, services] = await Promise.all([
      prisma.$queryRaw<ActiveAssessmentSummary[]>(Prisma.sql`
        SELECT "id", "title", "type", "category"
        FROM "AssessmentDefinition"
        WHERE "id" IN (${Prisma.join(assessmentIds)}) AND "isActive" = true
      `),
      prisma.$queryRaw<ActiveServiceSummary[]>(Prisma.sql`
        SELECT
          "id",
          "slug",
          "name",
          "description",
          "publicDescription",
          "publicPageContent"
        FROM "Disease"
        WHERE "isActive" = true AND "publicCategory" = 'Hope Hub'
        ORDER BY "name" ASC
      `)
    ]);
    const assessmentById = new Map(assessments.map((assessment) => [assessment.id, assessment]));

    const flows = CONSUMER_CONCERN_FLOW_DEFINITIONS.map((flow) => {
      const assessment = assessmentById.get(flow.assessmentId) ?? null;
      const serviceMatches = services
        .filter((service) => {
          const text = searchableServiceText(service);
          return flow.serviceSearchTerms.some((term) => text.includes(term.toLowerCase()));
        })
        .map((service) => ({
          id: service.slug || service.id,
          diseaseId: service.id,
          slug: service.slug,
          name: service.name
        }));
      return {
        ...flow,
        assessmentAvailable: Boolean(assessment),
        assessmentTitle: assessment?.title ?? null,
        serviceMatches,
        serviceAvailable: serviceMatches.length > 0,
        routes: {
          assessment: `/assessments/${encodeURIComponent(flow.assessmentId)}`,
          services: '/services',
          careTeam: '/care-team',
          booking: '/contact'
        },
        queryParams: {
          services: {
            concern: flow.label,
            q: flow.serviceSearchTerms[0] || flow.label
          },
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
    const missingServices = flows
      .filter((flow) => !flow.serviceAvailable)
      .map((flow) => ({
        concernKey: flow.key,
        serviceSearchTerms: flow.serviceSearchTerms,
        issue: 'No active Hope Hub service matched this concern.'
      }));

    res.json({
      flows,
      issues: [...missingAssessments, ...missingServices],
      meta: {
        source: 'backend',
        total: flows.length,
        healthy: missingAssessments.length === 0 && missingServices.length === 0
      }
    });
  })
);
