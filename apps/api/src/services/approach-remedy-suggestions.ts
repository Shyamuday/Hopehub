import { prisma } from '../db.js';
import { RepertorySourceCode } from '@prisma/client';
import { applyApproachRubricWeights } from './approach-repertory-weights.js';
import { computeRepertorization } from './repertorization.js';
import { searchRepertoryRubrics, scoreRubricMatch, tokenizeRepertoryQuery } from './repertory-search.js';
import {
  isOorepSourceId,
  oorepAbbrevFromSourceId,
  searchOorepRepertory,
  type OorepRubricResult
} from './oorep-client.js';
import {
  collectApproachSearchPhrases,
  defaultRubricWeightForChapter,
  resolveApproachByMethodOption,
  type ApproachDefinition,
  type ApproachSearchPhrase
} from '@vitalis/homeopathy-approaches';

export type SuggestedRubricMatch = {
  rubricId: string;
  weight: number;
  sourceField: string;
  sourceLabel: string;
  sourcePhrase: string;
  rubric: {
    id: string;
    chapter: string;
    subchapter: string | null;
    text: string;
    parentPath: string | null;
  };
};

export type SuggestedRemedyResult = {
  rank: number;
  totalScore: number;
  coverage: number;
  remedy: {
    id: string;
    name: string;
    abbreviation: string;
  };
};

export type ApproachRemedySuggestionResponse = {
  summary: string;
  suggestedRubrics: SuggestedRubricMatch[];
  results: SuggestedRemedyResult[];
};

type RubricCandidate = SuggestedRubricMatch & { matchScore: number };

async function resolveRepertorySourceId(preferredSourceId?: string | null) {
  if (preferredSourceId && !isOorepSourceId(preferredSourceId)) {
    const source = await prisma.repertorySource.findUnique({
      where: { id: preferredSourceId },
      select: { id: true, _count: { select: { rubrics: true } } }
    });
    if (source && source._count.rubrics > 0) return source.id;
  }

  const imported =
    (await prisma.repertorySource.findFirst({
      where: { isActive: true, code: RepertorySourceCode.OOREP_PUBLICUM },
      select: { id: true, _count: { select: { rubrics: true } } }
    })) ||
    (await prisma.repertorySource.findFirst({
      where: { isActive: true, code: RepertorySourceCode.REPERTORIUM_PUBLICUM },
      select: { id: true, _count: { select: { rubrics: true } } }
    }));

  const importedSource = imported && '_count' in imported ? imported : null;
  if (importedSource && importedSource._count.rubrics > 0) return importedSource.id;

  if (preferredSourceId && isOorepSourceId(preferredSourceId)) return preferredSourceId;
  return importedSource?.id || preferredSourceId || null;
}

async function resolveLocalRubricId(localSourceId: string, rubricId: string, oorepRubric?: OorepRubricResult) {
  const existing = await prisma.repertoryRubric.findUnique({
    where: { id: rubricId },
    select: { id: true, chapter: true, subchapter: true, text: true, parentPath: true }
  });
  if (existing) return existing;

  const externalMatch = rubricId.match(/oorep-rubric-[^-]+-(\d+)$/);
  const externalId = externalMatch ? Number(externalMatch[1]) : null;
  if (externalId == null) return null;

  return prisma.repertoryRubric.findFirst({
    where: { sourceId: localSourceId, externalId },
    select: { id: true, chapter: true, subchapter: true, text: true, parentPath: true }
  });
}

async function searchPhraseForRubrics(
  phrase: ApproachSearchPhrase,
  sourceId: string,
  localSourceId: string | null,
  approach: ApproachDefinition
): Promise<RubricCandidate[]> {
  const matches: RubricCandidate[] = [];

  if (localSourceId) {
    const rows = await searchRepertoryRubrics(prisma, {
      q: phrase.phrase,
      sourceId: localSourceId,
      limit: 3,
      mode: 'search'
    });
    const tokens = tokenizeRepertoryQuery(phrase.phrase);
    for (const row of rows) {
      const matchScore = scoreRubricMatch(row, tokens);
      if (matchScore < 0) continue;
      matches.push({
        rubricId: row.id,
        weight: defaultRubricWeightForChapter(approach, row.chapter),
        sourceField: phrase.sourceKey,
        sourceLabel: phrase.sourceLabel,
        sourcePhrase: phrase.phrase,
        rubric: {
          id: row.id,
          chapter: row.chapter,
          subchapter: row.subchapter,
          text: row.text,
          parentPath: row.parentPath
        },
        matchScore: matchScore + phrase.priority
      });
    }
  }

  if (!matches.length && isOorepSourceId(sourceId)) {
    const abbrev = oorepAbbrevFromSourceId(sourceId);
    const result = await searchOorepRepertory({
      symptom: phrase.phrase,
      repertory: abbrev,
      limit: 3
    });
    for (const row of result.rubrics) {
      const local = localSourceId ? await resolveLocalRubricId(localSourceId, row.id, row) : null;
      if (!local) continue;
      matches.push({
        rubricId: local.id,
        weight: defaultRubricWeightForChapter(approach, local.chapter),
        sourceField: phrase.sourceKey,
        sourceLabel: phrase.sourceLabel,
        sourcePhrase: phrase.phrase,
        rubric: {
          id: local.id,
          chapter: local.chapter,
          subchapter: local.subchapter,
          text: local.text,
          parentPath: local.parentPath
        },
        matchScore: 100 + phrase.priority
      });
    }
  }

  return matches;
}

export async function suggestRemediesFromApproach(input: {
  analysisId: string;
  maxPhrases?: number;
  maxRubrics?: number;
}): Promise<ApproachRemedySuggestionResponse | null> {
  const analysis = await prisma.caseAnalysis.findUnique({
    where: { id: input.analysisId },
    include: {
      methodOption: { select: { id: true, label: true, normalizedLabel: true } },
      consultation: { select: { intakeAnswers: true } }
    }
  });
  if (!analysis) return null;

  const approach = resolveApproachByMethodOption(analysis.methodOption) as ApproachDefinition;
  const phrases = collectApproachSearchPhrases({
    approach,
    methodRationale: (analysis as { methodRationale?: string | null }).methodRationale,
    caseSheet: (analysis.caseSheet || null) as Record<string, string> | null,
    approachData: (analysis.approachData || null) as never,
    intakeAnswers: (analysis.consultation?.intakeAnswers || null) as Record<string, string> | null,
    maxPhrases: input.maxPhrases
  });

  if (!phrases.length) return null;

  const sourceId = await resolveRepertorySourceId(analysis.sourceId);
  if (!sourceId) return null;
  const localSourceId = isOorepSourceId(sourceId) ? await resolveRepertorySourceId(null) : sourceId;

  const rubricCandidates: RubricCandidate[] = [];
  for (const phrase of phrases) {
    const found = await searchPhraseForRubrics(phrase, sourceId, localSourceId, approach);
    rubricCandidates.push(...found);
  }

  const byRubric = new Map<string, RubricCandidate>();
  for (const candidate of rubricCandidates.sort((a, b) => b.matchScore - a.matchScore)) {
    const existing = byRubric.get(candidate.rubricId);
    if (!existing || candidate.matchScore > existing.matchScore) {
      byRubric.set(candidate.rubricId, candidate);
    }
  }

  const suggestedRubrics = [...byRubric.values()]
    .slice(0, input.maxRubrics ?? 18)
    .map(({ matchScore: _matchScore, ...item }) => item);

  if (!suggestedRubrics.length) return null;

  const weightedRubrics = applyApproachRubricWeights(
    analysis.methodOption?.label,
    suggestedRubrics.map((item) => ({
      rubricId: item.rubricId,
      weight: item.weight,
      chapter: item.rubric.chapter
    }))
  );
  const weightByRubricId = new Map(weightedRubrics.map((item) => [item.rubricId, item.weight]));
  const rubricIds = suggestedRubrics.map((item) => item.rubricId);

  const remedyLinks = await prisma.repertoryRubricRemedy.findMany({
    where: { rubricId: { in: rubricIds } },
    select: { rubricId: true, remedyId: true, grade: true }
  });
  const linksByRubric = new Map<string, Array<{ remedyId: string; grade: number }>>();
  for (const link of remedyLinks) {
    const bucket = linksByRubric.get(link.rubricId) || [];
    bucket.push({ remedyId: link.remedyId, grade: link.grade });
    linksByRubric.set(link.rubricId, bucket);
  }

  const ranked = computeRepertorization(
    suggestedRubrics.map((item) => ({
      rubricId: item.rubricId,
      weight: weightByRubricId.get(item.rubricId) || item.weight,
      remedyGrades: linksByRubric.get(item.rubricId) || []
    }))
  ).slice(0, 25);

  if (!ranked.length) return null;

  const remedies = await prisma.homeopathicRemedy.findMany({
    where: { id: { in: ranked.map((item) => item.remedyId) } },
    select: { id: true, name: true, abbreviation: true }
  });
  const remedyById = new Map(remedies.map((item) => [item.id, item]));

  const results: SuggestedRemedyResult[] = ranked
    .map((item, index) => {
      const remedy = remedyById.get(item.remedyId);
      if (!remedy) return null;
      return {
        rank: index + 1,
        totalScore: item.totalScore,
        coverage: item.coverage,
        remedy
      };
    })
    .filter((item): item is SuggestedRemedyResult => !!item);

  const top = results[0];
  const summary = top
    ? `${suggestedRubrics.length} rubrics from approach data → top remedy ${top.remedy.name} (score ${top.totalScore}, covers ${top.coverage}/${suggestedRubrics.length} rubrics).`
    : 'No remedy ranking produced.';

  return {
    summary,
    suggestedRubrics: suggestedRubrics.map((item) => ({
      ...item,
      weight: weightByRubricId.get(item.rubricId) || item.weight
    })),
    results
  };
}

export async function applyApproachRemedySuggestions(input: {
  analysisId: string;
  maxPhrases?: number;
  maxRubrics?: number;
}) {
  const suggestion = await suggestRemediesFromApproach(input);
  if (!suggestion) return null;

  await prisma.$transaction(async (tx) => {
    await tx.caseAnalysisRubric.deleteMany({ where: { analysisId: input.analysisId } });
    await tx.caseAnalysisRubric.createMany({
      data: suggestion.suggestedRubrics.map((item) => ({
        analysisId: input.analysisId,
        rubricId: item.rubricId,
        weight: item.weight
      }))
    });

    await tx.caseAnalysisResult.deleteMany({ where: { analysisId: input.analysisId } });
    if (suggestion.results.length) {
      await tx.caseAnalysisResult.createMany({
        data: suggestion.results.map((item) => ({
          analysisId: input.analysisId,
          remedyId: item.remedy.id,
          totalScore: item.totalScore,
          coverage: item.coverage,
          rank: item.rank
        }))
      });
    }
  });

  return suggestion;
}
