import { PrismaClient, RepertorySourceCode, type Prisma } from '@prisma/client';
import { normalizeRepertoryText } from './repertorization.js';
import {
  iterateSqlCopyRows,
  parseInfoRow,
  parseRemedyRow,
  parseRubricRemedyRow,
  parseRubricRow,
  splitFullPath,
  type OorepInfoRow
} from './oorep-sql-parser.js';
import { importMateriaMedicaFromOorep } from './oorep-mm-importer.js';

const SOURCE_CODE_BY_ABBREV: Record<string, RepertorySourceCode> = {
  publicum: RepertorySourceCode.OOREP_PUBLICUM,
  'kent-de': RepertorySourceCode.OOREP_KENT_DE
};

const DEFAULT_SOURCES = ['publicum', 'kent-de'];

type ImportOptions = {
  sqlPath: string;
  sources?: string[];
  rubricBatchSize?: number;
  linkBatchSize?: number;
};

function remedyKey(name: string) {
  return normalizeRepertoryText(name);
}

function sourceCodeForAbbrev(abbrev: string) {
  return SOURCE_CODE_BY_ABBREV[abbrev];
}

async function loadInfoRows(sqlPath: string) {
  const rows = new Map<string, OorepInfoRow>();
  for await (const fields of iterateSqlCopyRows(sqlPath, 'info')) {
    const parsed = parseInfoRow(fields);
    if (parsed) rows.set(parsed.abbrev, parsed);
  }
  return rows;
}

async function importRemedies(prisma: PrismaClient, sqlPath: string) {
  let batch: Prisma.HomeopathicRemedyCreateManyInput[] = [];
  let count = 0;
  const seen = new Set<number>();

  const flush = async () => {
    if (!batch.length) return;
    await prisma.homeopathicRemedy.createMany({ data: batch, skipDuplicates: true });
    count += batch.length;
    batch = [];
    if (count % 1000 === 0) {
      console.log(`[oorep-import] remedies: ${count}`);
    }
  };

  for await (const fields of iterateSqlCopyRows(sqlPath, 'remedy')) {
    const parsed = parseRemedyRow(fields);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    batch.push({
      oorepRemedyId: parsed.id,
      name: parsed.name,
      abbreviation: parsed.abbreviation,
      normalizedName: remedyKey(parsed.name)
    });
    if (batch.length >= 500) {
      await flush();
    }
  }

  await flush();
  console.log(`[oorep-import] remedies imported: ${count}`);
}

async function ensureSource(prisma: PrismaClient, abbrev: string, infoRows: Map<string, OorepInfoRow>) {
  const code = sourceCodeForAbbrev(abbrev);
  if (!code) {
    throw new Error(`Unsupported OOREP repertory abbrev: ${abbrev}`);
  }
  const info = infoRows.get(abbrev);
  return prisma.repertorySource.upsert({
    where: { code },
    update: {
      name: info?.displayTitle || info?.title || abbrev,
      description: info?.license || 'Imported from OOREP SQL dump (GPL).',
      isActive: true
    },
    create: {
      code,
      name: info?.displayTitle || info?.title || abbrev,
      description: info?.license || 'Imported from OOREP SQL dump (GPL).',
      isActive: true
    }
  });
}

async function clearSourceData(prisma: PrismaClient, sourceId: string) {
  await prisma.caseAnalysisRubric.deleteMany({
    where: { rubric: { sourceId } }
  });
  await prisma.repertoryRubricRemedy.deleteMany({
    where: { rubric: { sourceId } }
  });
  await prisma.repertoryRubric.deleteMany({ where: { sourceId } });
}

async function importRubricsForSource(
  prisma: PrismaClient,
  sqlPath: string,
  abbrev: string,
  sourceId: string,
  batchSize: number
) {
  let batch: Prisma.RepertoryRubricCreateManyInput[] = [];
  let count = 0;

  const flush = async () => {
    if (!batch.length) return;
    await prisma.repertoryRubric.createMany({ data: batch, skipDuplicates: true });
    count += batch.length;
    batch = [];
    if (count % 5000 === 0) {
      console.log(`[oorep-import] ${abbrev} rubrics: ${count}`);
    }
  };

  for await (const fields of iterateSqlCopyRows(sqlPath, 'rubric')) {
    const parsed = parseRubricRow(fields);
    if (!parsed || parsed.abbrev !== abbrev) continue;

    const pathParts = splitFullPath(parsed.fullPath);
    batch.push({
      sourceId,
      externalId: parsed.id,
      chapter: pathParts.chapter,
      subchapter: pathParts.text !== pathParts.displayText ? pathParts.text : null,
      text: pathParts.displayText,
      normalizedText: normalizeRepertoryText(parsed.fullPath),
      parentPath: pathParts.parentPath
    });

    if (batch.length >= batchSize) {
      await flush();
    }
  }

  await flush();
  console.log(`[oorep-import] ${abbrev} rubrics imported: ${count}`);

  const rubricRows = await prisma.repertoryRubric.findMany({
    where: { sourceId, externalId: { not: null } },
    select: { id: true, externalId: true }
  });

  return new Map(
    rubricRows
      .filter((row): row is { id: string; externalId: number } => row.externalId != null)
      .map((row) => [row.externalId, row.id])
  );
}

async function importRubricRemediesForSource(
  prisma: PrismaClient,
  sqlPath: string,
  abbrev: string,
  rubricIdMap: Map<number, string>,
  remedyIdByOorep: Map<number, string>,
  batchSize: number
) {
  let batch: Prisma.RepertoryRubricRemedyCreateManyInput[] = [];
  let count = 0;
  let skipped = 0;

  const flush = async () => {
    if (!batch.length) return;
    await prisma.repertoryRubricRemedy.createMany({ data: batch, skipDuplicates: true });
    count += batch.length;
    batch = [];
    if (count % 25000 === 0) {
      console.log(`[oorep-import] ${abbrev} rubric-remedy links: ${count}`);
    }
  };

  for await (const fields of iterateSqlCopyRows(sqlPath, 'rubricremedy')) {
    const parsed = parseRubricRemedyRow(fields);
    if (!parsed || parsed.abbrev !== abbrev) continue;

    const rubricId = rubricIdMap.get(parsed.rubricId);
    const remedyId = remedyIdByOorep.get(parsed.remedyId);
    if (!rubricId || !remedyId) {
      skipped += 1;
      continue;
    }

    batch.push({
      rubricId,
      remedyId,
      grade: parsed.weight
    });

    if (batch.length >= batchSize) {
      await flush();
    }
  }

  await flush();
  console.log(`[oorep-import] ${abbrev} rubric-remedy links imported: ${count} (skipped ${skipped})`);
}

export async function importOorepSqlDump(prisma: PrismaClient, options: ImportOptions) {
  const sources = (options.sources?.length ? options.sources : DEFAULT_SOURCES).map((item) => item.trim());
  const rubricBatchSize = options.rubricBatchSize ?? 1000;
  const linkBatchSize = options.linkBatchSize ?? 5000;

  console.log(`[oorep-import] loading metadata from ${options.sqlPath}`);
  const infoRows = await loadInfoRows(options.sqlPath);

  console.log('[oorep-import] importing remedies...');
  await importRemedies(prisma, options.sqlPath);

  const remedyIdByOorep = new Map(
    (await prisma.homeopathicRemedy.findMany({
      where: { oorepRemedyId: { not: null } },
      select: { id: true, oorepRemedyId: true }
    })).map((item) => [item.oorepRemedyId!, item.id])
  );

  for (const abbrev of sources) {
    console.log(`[oorep-import] importing repertory: ${abbrev}`);
    const source = await ensureSource(prisma, abbrev, infoRows);
    await clearSourceData(prisma, source.id);
    const rubricIdMap = await importRubricsForSource(prisma, options.sqlPath, abbrev, source.id, rubricBatchSize);
    await importRubricRemediesForSource(
      prisma,
      options.sqlPath,
      abbrev,
      rubricIdMap,
      remedyIdByOorep,
      linkBatchSize
    );
  }

  console.log('[oorep-import] importing materia medica...');
  await importMateriaMedicaFromOorep(prisma, options.sqlPath);

  console.log('[oorep-import] complete');
}
