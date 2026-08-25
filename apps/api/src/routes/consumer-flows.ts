import { Prisma, PracticeStatus, LifestyleTipStatus } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';

export const consumerFlowsRouter = Router();

type ActiveAssessmentSummary = { id: string; title: string; type: string; category: string };
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

async function loadFlowContext() {
  const concerns = await prisma.consumerConcern.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }]
  });
  const assessmentIds = [...new Set(concerns.map((flow) => flow.assessmentId))];
  const [assessments, services] = await Promise.all([
    assessmentIds.length
      ? prisma.$queryRaw<ActiveAssessmentSummary[]>(Prisma.sql`
          SELECT "id", "title", "type", "category"
          FROM "AssessmentDefinition"
          WHERE "id" IN (${Prisma.join(assessmentIds)}) AND "isActive" = true
        `)
      : Promise.resolve([]),
    prisma.$queryRaw<ActiveServiceSummary[]>(Prisma.sql`
      SELECT "id", "slug", "name", "description", "publicDescription", "publicPageContent"
      FROM "Disease"
      WHERE "isActive" = true AND "publicCategory" = 'Hope Hub'
      ORDER BY "name" ASC
    `)
  ]);
  return { concerns, assessments, services };
}

function hydrateFlow(
  flow: Awaited<ReturnType<typeof loadFlowContext>>['concerns'][number],
  assessments: ActiveAssessmentSummary[],
  services: ActiveServiceSummary[]
) {
  const assessment = assessments.find((item) => item.id === flow.assessmentId) ?? null;
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
      concern: `/concerns/${encodeURIComponent(flow.slug)}`,
      assessment: `/assessments/${encodeURIComponent(flow.assessmentId)}`,
      services: '/services',
      careTeam: '/care-team',
      booking: '/contact'
    },
    queryParams: {
      services: { concern: flow.label, q: flow.serviceSearchTerms[0] || flow.label },
      careTeam: { concern: flow.label, roleGroup: flow.supportPath },
      booking: { concern: flow.label, supportPath: flow.supportPath, source: 'concern-flow' }
    }
  };
}

consumerFlowsRouter.get(
  '/hope-hub/consumer-flows',
  asyncRoute(async (_req, res) => {
    const { concerns, assessments, services } = await loadFlowContext();
    const flows = concerns.map((flow) => hydrateFlow(flow, assessments, services));
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
        source: 'database',
        total: flows.length,
        healthy: missingAssessments.length === 0 && missingServices.length === 0
      }
    });
  })
);

consumerFlowsRouter.get(
  '/hope-hub/resource-hub',
  asyncRoute(async (_req, res) => {
    const concerns = await prisma.consumerConcern.findMany({
      where: { isActive: true, showInResourceHub: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }]
    });
    res.json({
      concerns,
      sections: [
        {
          key: 'assessments',
          label: 'Self-checks',
          description: 'Private tools that help you understand what you may be experiencing.',
          path: '/assessments'
        },
        {
          key: 'practices',
          label: 'Guided exercises',
          description: 'Simple breathing, grounding and reflection practices you can try now.',
          path: '/exercises'
        },
        {
          key: 'lifestyle',
          label: 'Lifestyle guides',
          description: 'Practical steps for sleep, routine, movement and everyday wellbeing.',
          path: '/lifestyle-tips'
        },
        {
          key: 'articles',
          label: 'Articles',
          description: 'Clear, reviewed reading for common emotional and mental-health concerns.',
          path: '/articles'
        },
        {
          key: 'recordings',
          label: 'Recorded sessions',
          description: 'Replay Hope Hub audio and video sessions at your own pace.',
          path: '/recorded-sessions'
        }
      ]
    });
  })
);

consumerFlowsRouter.get(
  '/hope-hub/concerns/:slug',
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug').trim();
    const concern = await prisma.consumerConcern.findFirst({
      where: { isActive: true, OR: [{ slug }, { key: slug }] }
    });
    if (!concern) return res.status(404).json({ message: 'Concern not found.' });

    const [assessment, practices, lifestyleTips, articles] = await Promise.all([
      prisma.assessmentDefinition.findFirst({
        where: { id: concern.assessmentId, isActive: true },
        select: { id: true, title: true, description: true, category: true, accessMode: true }
      }),
      prisma.practice.findMany({
        where: { status: PracticeStatus.PUBLISHED, concernSlugs: { has: concern.key } },
        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          durationLabel: true,
          durationMinutes: true,
          type: true,
          thumbnailUrl: true
        },
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        take: 4
      }),
      prisma.lifestyleTip.findMany({
        where: { status: LifestyleTipStatus.PUBLISHED, concernSlugs: { has: concern.key } },
        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          timeToImplement: true,
          type: true,
          thumbnailUrl: true
        },
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        take: 4
      }),
      prisma.blogPost.findMany({
        where: { isPublished: true, isHidden: false, concernSlugs: { has: concern.key } },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          readTime: true,
          authorName: true,
          publishedAt: true
        },
        orderBy: [{ sortOrder: 'asc' }, { publishedAt: { sort: 'desc', nulls: 'last' } }],
        take: 4
      })
    ]);

    res.json({
      concern,
      assessment,
      practices,
      lifestyleTips,
      articles,
      routes: {
        assessment: `/assessments/${encodeURIComponent(concern.assessmentId)}`,
        practices: `/exercises?concern=${encodeURIComponent(concern.key)}`,
        lifestyleTips: `/lifestyle-tips?concern=${encodeURIComponent(concern.key)}`,
        articles: `/articles?concern=${encodeURIComponent(concern.key)}`,
        talk: '/support',
        careTeam: `/care-team?concern=${encodeURIComponent(concern.label)}&roleGroup=${encodeURIComponent(concern.supportPath)}`,
        booking: `/contact?concern=${encodeURIComponent(concern.label)}&supportPath=${encodeURIComponent(concern.supportPath)}&source=concern-page`
      }
    });
  })
);
