import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { asyncRoute, queryPositiveInt, queryText, routeParam } from '../utils/helpers.js';

type AssessmentDefinitionRow = {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  version: string;
  config: unknown;
  sortOrder: number;
};

export const assessmentDefinitionsRouter = Router();

function serializeDefinition(row: AssessmentDefinitionRow) {
  return {
    id: row.id,
    type: row.type,
    category: row.category,
    title: row.title,
    description: row.description,
    version: row.version,
    sortOrder: row.sortOrder,
    config: row.config
  };
}

assessmentDefinitionsRouter.get(
  '/assessment-definitions',
  asyncRoute(async (req, res) => {
    const q = queryText(req, 'q').trim();
    const category = queryText(req, 'category').trim();
    const page = queryPositiveInt(req, 'page', 1, 1, 500);
    const pageSize = queryPositiveInt(req, 'pageSize', 100, 1, 200);
    const offset = (page - 1) * pageSize;

    const conditions: Prisma.Sql[] = [Prisma.sql`"isActive" = true`];
    if (q) {
      const search = `%${q}%`;
      conditions.push(Prisma.sql`(
        "title" ILIKE ${search}
        OR "description" ILIKE ${search}
        OR "type" ILIKE ${search}
        OR "category" ILIKE ${search}
      )`);
    }
    if (category) {
      conditions.push(Prisma.sql`"category" = ${category}`);
    }

    const where = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<AssessmentDefinitionRow[]>(Prisma.sql`
        SELECT
          "id",
          "type",
          "category",
          "title",
          "description",
          "version",
          "config",
          "sortOrder"
        FROM "AssessmentDefinition"
        ${where}
        ORDER BY "sortOrder" ASC, "title" ASC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `),
      prisma.$queryRaw<{ count: bigint | number }[]>(Prisma.sql`
        SELECT COUNT(*) AS "count"
        FROM "AssessmentDefinition"
        ${where}
      `)
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    res.json({
      assessments: rows.map((row) => row.config),
      definitions: rows.map(serializeDefinition),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  })
);

assessmentDefinitionsRouter.get(
  '/assessment-definitions/:id',
  asyncRoute(async (req, res) => {
    const id = routeParam(req, 'id');
    const rows = await prisma.$queryRaw<AssessmentDefinitionRow[]>(Prisma.sql`
      SELECT
        "id",
        "type",
        "category",
        "title",
        "description",
        "version",
        "config",
        "sortOrder"
      FROM "AssessmentDefinition"
      WHERE "id" = ${id} AND "isActive" = true
      LIMIT 1
    `);

    const definition = rows[0];
    if (!definition) {
      res.status(404).json({ error: 'Assessment definition not found' });
      return;
    }

    res.json({
      assessment: definition.config,
      definition: serializeDefinition(definition)
    });
  })
);
