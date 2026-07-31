import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { asyncRoute, queryPositiveInt, queryText, routeParam } from '../utils/helpers.js';

const CATEGORIES = [
  'COGNITIVE_INTELLIGENCE',
  'ACHIEVEMENT',
  'PSYCHOLOGICAL_PROCESS',
  'VISUAL_MOTOR_GRAPHOMOTOR',
  'BEHAVIOR_RATING',
  'ADAPTIVE_BEHAVIOR',
  'NEUROPSYCHOLOGICAL',
  'AUTISM_ASD',
  'PSYCHOLOGICAL_EMOTIONAL',
  'OBSERVATION_RECORD_REVIEW',
  'ADDITIONAL_SERVICE',
  'OPEN_RESEARCH_SCALE'
] as const;

const ACCESS_LEVELS = [
  'METADATA_ONLY',
  'LICENSED_PROFESSIONAL',
  'OPEN_RESEARCH',
  'PUBLIC_DOMAIN',
  'INTERNAL_SERVICE'
] as const;

const SOURCE_REPOSITORIES = [
  'APA_PSYCTESTS',
  'ETS_TESTLINK',
  'PSYTOOLKIT',
  'IPIP',
  'OPEN_SOURCE_PSYCHOMETRICS',
  'PUBLISHER',
  'CLINICAL_SERVICE',
  'SCHOOL_RECORD',
  'CUSTOM'
] as const;

type PsychologicalTestRow = {
  id: string;
  slug: string;
  name: string;
  abbreviation: string | null;
  edition: string | null;
  category: string;
  sourceRepository: string;
  sourceUrl: string | null;
  accessLevel: string;
  ageRange: string | null;
  administrationMode: string | null;
  domains: string[];
  purpose: string;
  licenseNote: string;
  canAdministerInApp: boolean;
  requiresProfessional: boolean;
  sortOrder: number;
  metadata: unknown;
};

type CategoryCountRow = {
  category: string;
  count: bigint | number;
};

export const psychologicalTestsRouter = Router();

function optionalEnum<T extends readonly string[]>(value: string, allowed: T) {
  const normalized = value.trim().toUpperCase();
  return allowed.includes(normalized) ? normalized : undefined;
}

function optionalBoolean(value: string) {
  if (!value) return undefined;
  if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
  if (['false', '0', 'no'].includes(value.toLowerCase())) return false;
  return undefined;
}

function serializeTest(row: PsychologicalTestRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    abbreviation: row.abbreviation,
    edition: row.edition,
    category: row.category,
    source: {
      repository: row.sourceRepository,
      url: row.sourceUrl
    },
    accessLevel: row.accessLevel,
    ageRange: row.ageRange,
    administrationMode: row.administrationMode,
    domains: row.domains,
    purpose: row.purpose,
    licenseNote: row.licenseNote,
    canAdministerInApp: row.canAdministerInApp,
    requiresProfessional: row.requiresProfessional,
    sortOrder: row.sortOrder,
    metadata: row.metadata
  };
}

function joinConditions(conditions: Prisma.Sql[]) {
  if (conditions.length === 0) return Prisma.empty;
  return Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;
}

psychologicalTestsRouter.get(
  '/psychological-tests',
  asyncRoute(async (req, res) => {
    const page = queryPositiveInt(req, 'page', 1, 1, 500);
    const pageSize = queryPositiveInt(req, 'pageSize', 50, 1, 100);
    const offset = (page - 1) * pageSize;
    const q = queryText(req, 'q').trim();
    const category = optionalEnum(queryText(req, 'category'), CATEGORIES);
    const accessLevel = optionalEnum(queryText(req, 'accessLevel'), ACCESS_LEVELS);
    const sourceRepository = optionalEnum(queryText(req, 'sourceRepository'), SOURCE_REPOSITORIES);
    const canAdministerInApp = optionalBoolean(queryText(req, 'canAdministerInApp'));

    const conditions: Prisma.Sql[] = [Prisma.sql`"isActive" = true`];
    if (q) {
      const search = `%${q}%`;
      conditions.push(Prisma.sql`(
        "name" ILIKE ${search}
        OR COALESCE("abbreviation", '') ILIKE ${search}
        OR COALESCE("edition", '') ILIKE ${search}
        OR EXISTS (
          SELECT 1
          FROM unnest("domains") AS domain
          WHERE domain ILIKE ${search}
        )
      )`);
    }
    if (category) {
      conditions.push(Prisma.sql`"category" = ${category}::"PsychologicalTestCategory"`);
    }
    if (accessLevel) {
      conditions.push(Prisma.sql`"accessLevel" = ${accessLevel}::"PsychologicalTestAccessLevel"`);
    }
    if (sourceRepository) {
      conditions.push(
        Prisma.sql`"sourceRepository" = ${sourceRepository}::"PsychologicalTestSourceRepository"`
      );
    }
    if (typeof canAdministerInApp === 'boolean') {
      conditions.push(Prisma.sql`"canAdministerInApp" = ${canAdministerInApp}`);
    }

    const where = joinConditions(conditions);
    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<PsychologicalTestRow[]>(Prisma.sql`
        SELECT
          "id",
          "slug",
          "name",
          "abbreviation",
          "edition",
          "category"::text AS "category",
          "sourceRepository"::text AS "sourceRepository",
          "sourceUrl",
          "accessLevel"::text AS "accessLevel",
          "ageRange",
          "administrationMode",
          "domains",
          "purpose",
          "licenseNote",
          "canAdministerInApp",
          "requiresProfessional",
          "sortOrder",
          "metadata"
        FROM "PsychologicalTestCatalog"
        ${where}
        ORDER BY "sortOrder" ASC, "name" ASC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `),
      prisma.$queryRaw<{ count: bigint | number }[]>(Prisma.sql`
        SELECT COUNT(*) AS "count"
        FROM "PsychologicalTestCatalog"
        ${where}
      `)
    ]);

    const total = Number(countRows[0]?.count ?? 0);
    res.json({
      tests: rows.map(serializeTest),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize))
      },
      filters: {
        categories: CATEGORIES,
        accessLevels: ACCESS_LEVELS,
        sourceRepositories: SOURCE_REPOSITORIES
      }
    });
  })
);

psychologicalTestsRouter.get(
  '/psychological-tests/categories',
  asyncRoute(async (_req, res) => {
    const rows = await prisma.$queryRaw<CategoryCountRow[]>(Prisma.sql`
      SELECT "category"::text AS "category", COUNT(*) AS "count"
      FROM "PsychologicalTestCatalog"
      WHERE "isActive" = true
      GROUP BY "category"
      ORDER BY "category" ASC
    `);

    res.json({
      categories: rows.map((row) => ({
        category: row.category,
        count: Number(row.count)
      }))
    });
  })
);

psychologicalTestsRouter.get(
  '/psychological-tests/:slug',
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug');
    const rows = await prisma.$queryRaw<PsychologicalTestRow[]>(Prisma.sql`
      SELECT
        "id",
        "slug",
        "name",
        "abbreviation",
        "edition",
        "category"::text AS "category",
        "sourceRepository"::text AS "sourceRepository",
        "sourceUrl",
        "accessLevel"::text AS "accessLevel",
        "ageRange",
        "administrationMode",
        "domains",
        "purpose",
        "licenseNote",
        "canAdministerInApp",
        "requiresProfessional",
        "sortOrder",
        "metadata"
      FROM "PsychologicalTestCatalog"
      WHERE "slug" = ${slug} AND "isActive" = true
      LIMIT 1
    `);

    const test = rows[0];
    if (!test) {
      res.status(404).json({ error: 'Psychological test not found' });
      return;
    }

    res.json({ test: serializeTest(test) });
  })
);
