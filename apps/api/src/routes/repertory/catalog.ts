import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryPositiveInt, queryText, routeParam } from '../../utils/helpers.js';
import { normalizeRepertoryText } from '../../services/repertorization.js';

export function registerRepertoryCatalogRoutes(router: Router) {
  router.get(
    '/doctor/repertory/sources',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const sources = await prisma.repertorySource.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          _count: { select: { rubrics: true } }
        }
      });
      res.json({
        sources: sources.map(({ _count, ...source }) => ({
          ...source,
          rubricCount: _count.rubrics
        }))
      });
    })
  );

  router.get(
    '/doctor/repertory/rubrics/search',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const query = z
        .object({
          q: z.string().min(2),
          sourceId: z.string().optional(),
          chapter: z.string().optional()
        })
        .parse({
          q: queryText(req, 'q'),
          sourceId: queryText(req, 'sourceId') || undefined,
          chapter: queryText(req, 'chapter') || undefined
        });

      const limit = queryPositiveInt(req, 'limit', 25, 1, 50);
      const normalized = normalizeRepertoryText(query.q);
      const tokens = normalized.split(' ').filter(Boolean);

      const rubrics = await prisma.repertoryRubric.findMany({
        where: {
          ...(query.sourceId ? { sourceId: query.sourceId } : {}),
          ...(query.chapter ? { chapter: { equals: query.chapter, mode: 'insensitive' } } : {}),
          AND: tokens.map((token) => ({
            normalizedText: { contains: token }
          }))
        },
        take: limit,
        orderBy: [{ chapter: 'asc' }, { text: 'asc' }],
        select: {
          id: true,
          chapter: true,
          subchapter: true,
          text: true,
          parentPath: true,
          source: { select: { id: true, name: true, code: true } },
          remedies: {
            take: 6,
            orderBy: { grade: 'desc' },
            select: {
              grade: true,
              remedy: { select: { id: true, name: true, abbreviation: true } }
            }
          }
        }
      });

      res.json({ rubrics });
    })
  );

  router.get(
    '/doctor/repertory/remedies/search',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const q = queryText(req, 'q');
      if (q.length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters.' });
      }

      const limit = queryPositiveInt(req, 'limit', 20, 1, 50);
      const normalized = normalizeRepertoryText(q);

      const remedies = await prisma.homeopathicRemedy.findMany({
        where: {
          OR: [
            { normalizedName: { contains: normalized } },
            { abbreviation: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } }
          ]
        },
        take: limit,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, abbreviation: true }
      });

      res.json({ remedies });
    })
  );

  router.get(
    '/doctor/repertory/remedies/:remedyId/materia-medica',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const remedyId = routeParam(req, 'remedyId');
      const analysisId = queryText(req, 'analysisId') || undefined;
      const repertorySourceId = queryText(req, 'repertorySourceId') || undefined;
      const mmSourceId = queryText(req, 'mmSourceId') || undefined;
      const rubricLimit = queryPositiveInt(req, 'rubricLimit', 12, 1, 30);

      const remedy = await prisma.homeopathicRemedy.findUnique({
        where: { id: remedyId },
        select: { id: true, name: true, abbreviation: true, oorepRemedyId: true }
      });

      if (!remedy) {
        return res.status(404).json({ message: 'Remedy not found.' });
      }

      const mmSource = mmSourceId
        ? await prisma.materiaMedicaSource.findFirst({ where: { id: mmSourceId, isActive: true } })
        : await prisma.materiaMedicaSource.findFirst({ where: { isActive: true }, orderBy: { name: 'asc' } });

      const sections = mmSource
        ? await prisma.materiaMedicaSection.findMany({
            where: { remedyId, sourceId: mmSource.id },
            orderBy: { sortOrder: 'asc' },
            take: 40,
            select: { id: true, depth: true, heading: true, content: true, sortOrder: true }
          })
        : [];

      let caseRubrics: Array<{
        rubricId: string;
        weight: number;
        grade: number;
        rubric: {
          id: string;
          chapter: string;
          subchapter: string | null;
          text: string;
          parentPath: string | null;
        };
      }> = [];
      let analysisRepertorySourceId: string | undefined;

      if (analysisId) {
        const analysis = await prisma.caseAnalysis.findUnique({
          where: { id: analysisId },
          select: {
            id: true,
            sourceId: true,
            rubrics: {
              select: {
                rubricId: true,
                weight: true,
                rubric: {
                  select: {
                    id: true,
                    chapter: true,
                    subchapter: true,
                    text: true,
                    parentPath: true,
                    remedies: {
                      where: { remedyId },
                      select: { grade: true }
                    }
                  }
                }
              }
            }
          }
        });

        analysisRepertorySourceId = analysis?.sourceId || undefined;
        caseRubrics =
          analysis?.rubrics
            .filter((item) => item.rubric.remedies.length > 0)
            .map((item) => ({
              rubricId: item.rubricId,
              weight: item.weight,
              grade: item.rubric.remedies[0]?.grade ?? 0,
              rubric: {
                id: item.rubric.id,
                chapter: item.rubric.chapter,
                subchapter: item.rubric.subchapter,
                text: item.rubric.text,
                parentPath: item.rubric.parentPath
              }
            })) ?? [];
      }

      const rubricSourceFilter = repertorySourceId || analysisRepertorySourceId;

      const keyRubrics =
        caseRubrics.length > 0
          ? caseRubrics
          : (
              await prisma.repertoryRubricRemedy.findMany({
                where: {
                  remedyId,
                  ...(rubricSourceFilter ? { rubric: { sourceId: rubricSourceFilter } } : {})
                },
                orderBy: { grade: 'desc' },
                take: rubricLimit,
                select: {
                  grade: true,
                  rubric: {
                    select: {
                      id: true,
                      chapter: true,
                      subchapter: true,
                      text: true,
                      parentPath: true,
                      source: { select: { id: true, name: true } }
                    }
                  }
                }
              })
            ).map((item) => ({
              rubricId: item.rubric.id,
              weight: null as number | null,
              grade: item.grade,
              rubric: item.rubric
            }));

      res.json({
        remedy,
        source: mmSource
          ? {
              id: mmSource.id,
              code: mmSource.code,
              name: mmSource.name,
              author: mmSource.author,
              year: mmSource.year
            }
          : null,
        sections,
        caseRubrics: caseRubrics.length ? caseRubrics : undefined,
        keyRubrics
      });
    })
  );
}
