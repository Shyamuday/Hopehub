import type { PrismaClient, Prisma } from '@prisma/client';
import {
  iterateSqlCopyRows,
  parseMmChapterRow,
  parseMmInfoRow,
  parseMmSectionRow,
  type OorepMmInfoRow
} from './oorep-sql-parser.js';

const DEFAULT_MM_ABBREV = 'boericke';

function authorName(last: string | null, first: string | null) {
  const parts = [first, last].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

async function loadMmChapters(sqlPath: string) {
  const chapters = new Map<number, { mmInfoId: number; remedyOorepId: number; heading: string }>();
  for await (const fields of iterateSqlCopyRows(sqlPath, 'mmchapter')) {
    const parsed = parseMmChapterRow(fields);
    if (!parsed) continue;
    chapters.set(parsed.id, {
      mmInfoId: parsed.mmInfoId,
      remedyOorepId: parsed.remedyId,
      heading: parsed.heading
    });
  }
  return chapters;
}

async function ensureMmSource(
  prisma: PrismaClient,
  sqlPath: string,
  abbrev: string
) {
  let sourceMeta: OorepMmInfoRow | null = null;
  for await (const fields of iterateSqlCopyRows(sqlPath, 'mminfo')) {
    const parsed = parseMmInfoRow(fields);
    if (parsed?.abbrev === abbrev) {
      sourceMeta = parsed;
      break;
    }
  }

  if (!sourceMeta) {
    throw new Error(`Materia medica source not found in dump: ${abbrev}`);
  }

  const code = abbrev.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return prisma.materiaMedicaSource.upsert({
    where: { code },
    update: {
      oorepMmInfoId: sourceMeta.id,
      name: sourceMeta.displayTitle || sourceMeta.fullTitle,
      author: authorName(sourceMeta.authorLastName, sourceMeta.authorFirstName),
      year: sourceMeta.year,
      license: sourceMeta.license,
      isActive: true
    },
    create: {
      oorepMmInfoId: sourceMeta.id,
      code,
      name: sourceMeta.displayTitle || sourceMeta.fullTitle,
      author: authorName(sourceMeta.authorLastName, sourceMeta.authorFirstName),
      year: sourceMeta.year,
      license: sourceMeta.license,
      isActive: true
    }
  });
}

export async function importMateriaMedicaFromOorep(
  prisma: PrismaClient,
  sqlPath: string,
  options?: { abbrev?: string; batchSize?: number }
) {
  const abbrev = options?.abbrev ?? DEFAULT_MM_ABBREV;
  const batchSize = options?.batchSize ?? 500;

  console.log(`[oorep-import] loading materia medica chapters (${abbrev})...`);
  const chapters = await loadMmChapters(sqlPath);
  const source = await ensureMmSource(prisma, sqlPath, abbrev);

  await prisma.materiaMedicaSection.deleteMany({ where: { sourceId: source.id } });

  const remedyIdByOorep = new Map(
    (await prisma.homeopathicRemedy.findMany({
      where: { oorepRemedyId: { not: null } },
      select: { id: true, oorepRemedyId: true }
    })).map((item) => [item.oorepRemedyId!, item.id])
  );

  let batch: Prisma.MateriaMedicaSectionCreateManyInput[] = [];
  let count = 0;
  let skipped = 0;

  const flush = async () => {
    if (!batch.length) return;
    await prisma.materiaMedicaSection.createMany({ data: batch, skipDuplicates: true });
    count += batch.length;
    batch = [];
    if (count % 2000 === 0) {
      console.log(`[oorep-import] materia medica sections: ${count}`);
    }
  };

  for await (const fields of iterateSqlCopyRows(sqlPath, 'mmsection')) {
    const parsed = parseMmSectionRow(fields);
    if (!parsed) continue;

    const chapter = chapters.get(parsed.mmChapterId);
    if (!chapter || chapter.mmInfoId !== source.oorepMmInfoId) continue;

    const remedyId = remedyIdByOorep.get(chapter.remedyOorepId);
    if (!remedyId) {
      skipped += 1;
      continue;
    }

    batch.push({
      sourceId: source.id,
      remedyId,
      oorepSectionId: parsed.id,
      depth: parsed.depth,
      heading: parsed.heading,
      content: parsed.content,
      sortOrder: parsed.id
    });

    if (batch.length >= batchSize) {
      await flush();
    }
  }

  await flush();
  console.log(`[oorep-import] materia medica sections imported: ${count} (skipped ${skipped})`);
}
