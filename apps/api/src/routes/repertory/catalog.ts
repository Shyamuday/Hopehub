import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, queryPositiveInt, queryText } from '../../utils/helpers.js';
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
}
