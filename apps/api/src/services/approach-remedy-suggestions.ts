import { prisma } from '../db.js';
import { RepertorySourceCode, type Prisma } from '@prisma/client';
import { applyApproachRubricWeights } from './approach-repertory-weights.js';
import { computeRepertorization } from './repertorization.js';
import { searchRepertoryRubrics, scoreRubricMatch, tokenizeRepertoryQuery } from './repertory-search.js';
import {
  isOorepSourceId,
  oorepAbbrevFromSourceId,
  searchOorepRepertory
} from './oorep-client.js';
import {
  collectApproachSearchPhrases,
  defaultRubricWeightForChapter,
  resolveApproachByMethodOption,
  type ApproachDefinition,
  type ApproachSearchPhrase
} from '@hopehub/homeopathy-approaches';

export type PhraseSearchLog = {
  phrase: string;
  sourceKey: string;
  sourceLabel: string;
  priority: number;
  reasoning: string;
};

export type SuggestedRubricMatch = {
  rubricId: string;
  weight: number;
  sourceField: string;
  sourceLabel: string;
  sourcePhrase: string;
  reasoning: string;
  rubric: {
    id: string;
    chapter: string;
    subchapter: string | null;
    text: string;
    parentPath: string | null;
  };
};

export type RemedySupportingRubric = {
  rubricId: string;
  text: string;
  chapter: string;
  weight: number;
  grade: number;
  partialScore: number;
  sourceLabel: string;
  sourcePhrase: string;
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
  reasoning: string;
  supportingRubrics: RemedySupportingRubric[];
};

export type ApproachRemedySuggestionResponse = {
  isSuggestionOnly: true;
  disclaimer: string;
  approachTitle: string;
  repertorySourceName: string;
  phrasesSearched: PhraseSearchLog[];
  suggestedRubrics: SuggestedRubricMatch[];
  results: SuggestedRemedyResult[];
  summary: string;
  generatedAt: string;
};

export function topSuggestedRemedyId(snapshot: ApproachRemedySuggestionResponse | null | undefined) {
  return snapshot?.results?.[0]?.remedy?.id ?? null;
}

export async function persistRemedySuggestionSnapshot(
  analysisId: string,
  suggestion: ApproachRemedySuggestionResponse
) {
  await prisma.caseAnalysis.update({
    where: { id: analysisId },
    data: {
      remedySuggestionSnapshot: suggestion as unknown as Prisma.InputJsonValue
    }
  });
}

type RubricCandidate = SuggestedRubricMatch & { matchScore: number };

const SUGGESTION_DISCLAIMER =
  'These are preliminary suggestions from automated rubric matching — not a final prescription. Review each rubric and remedy before applying to the case.';

function rubricPathLabel(rubric: SuggestedRubricMatch['rubric']) {
  return [rubric.chapter, rubric.subchapter, rubric.text].filter(Boolean).join(' · ');
}

function phraseReasoning(phrase: ApproachSearchPhrase) {
  return `Extracted from ${phrase.sourceLabel} (${phrase.sourceKey}): “${phrase.phrase}”.`;
}

function rubricMatchReasoning(candidate: RubricCandidate, baseWeight: number, finalWeight: number) {
  const path = rubricPathLabel(candidate.rubric);
  const weightNote =
    finalWeight !== baseWeight
      ? ` Approach weight adjusted ${baseWeight} → ${finalWeight} for ${candidate.rubric.chapter} chapter.`
      : ` Assigned weight ${finalWeight} for ${candidate.rubric.chapter} chapter.`;
  return `Repertory match for “${candidate.sourcePhrase}” from ${candidate.sourceLabel} → ${path}.${weightNote}`;
}

function buildRemedyReasoning(
  remedyId: string,
  totalScore: number,
  coverage: number,
  rubricTotal: number,
  supporting: RemedySupportingRubric[]
) {
  const top = supporting.slice(0, 3);
  const topSummary = top
    .map(
      (item) =>
        `${item.text} (grade ${item.grade} × weight ${item.weight} = ${item.partialScore}, from ${item.sourceLabel})`
    )
    .join('; ');
  return `Covers ${coverage}/${rubricTotal} suggested rubrics with total score ${totalScore}. Strongest support: ${topSummary || 'no direct rubric grades found'}.`;
}

async function resolveRepertorySource(preferredSourceId?: string | null) {
  if (preferredSourceId && !isOorepSourceId(preferredSourceId)) {
    const source = await prisma.repertorySource.findUnique({
      where: { id: preferredSourceId },
      select: { id: true, name: true, _count: { select: { rubrics: true } } }
    });
    if (source && source._count.rubrics > 0) return { id: source.id, name: source.name };
  }

  const imported =
    (await prisma.repertorySource.findFirst({
      where: { isActive: true, code: RepertorySourceCode.OOREP_PUBLICUM },
      select: { id: true, name: true, _count: { select: { rubrics: true } } }
    })) ||
    (await prisma.repertorySource.findFirst({
      where: { isActive: true, code: RepertorySourceCode.REPERTORIUM_PUBLICUM },
      select: { id: true, name: true, _count: { select: { rubrics: true } } }
    }));

  if (imported && imported._count.rubrics > 0) {
    return { id: imported.id, name: imported.name };
  }

  if (preferredSourceId && isOorepSourceId(preferredSourceId)) {
    return { id: preferredSourceId, name: oorepAbbrevFromSourceId(preferredSourceId) };
  }

  return imported ? { id: imported.id, name: imported.name } : null;
}

async function resolveLocalRubricId(localSourceId: string, rubricId: string) {
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
      const baseWeight = defaultRubricWeightForChapter(approach, row.chapter);
      matches.push({
        rubricId: row.id,
        weight: baseWeight,
        sourceField: phrase.sourceKey,
        sourceLabel: phrase.sourceLabel,
        sourcePhrase: phrase.phrase,
        reasoning: '',
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
      const local = localSourceId ? await resolveLocalRubricId(localSourceId, row.id) : null;
      if (!local) continue;
      const baseWeight = defaultRubricWeightForChapter(approach, local.chapter);
      matches.push({
        rubricId: local.id,
        weight: baseWeight,
        sourceField: phrase.sourceKey,
        sourceLabel: phrase.sourceLabel,
        sourcePhrase: phrase.phrase,
        reasoning: '',
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

  const source = await resolveRepertorySource(analysis.sourceId);
  if (!source) return null;
  const localSourceId = isOorepSourceId(source.id) ? (await resolveRepertorySource(null))?.id || null : source.id;

  const phrasesSearched: PhraseSearchLog[] = phrases.map((phrase) => ({
    phrase: phrase.phrase,
    sourceKey: phrase.sourceKey,
    sourceLabel: phrase.sourceLabel,
    priority: phrase.priority,
    reasoning: phraseReasoning(phrase)
  }));

  const rubricCandidates: RubricCandidate[] = [];
  for (const phrase of phrases) {
    const found = await searchPhraseForRubrics(phrase, source.id, localSourceId, approach);
    rubricCandidates.push(...found);
  }

  const byRubric = new Map<string, RubricCandidate>();
  for (const candidate of rubricCandidates.sort((a, b) => b.matchScore - a.matchScore)) {
    const existing = byRubric.get(candidate.rubricId);
    if (!existing || candidate.matchScore > existing.matchScore) {
      byRubric.set(candidate.rubricId, candidate);
    }
  }

  const rawRubrics = [...byRubric.values()].slice(0, input.maxRubrics ?? 18);
  if (!rawRubrics.length) return null;

  const weightedRubrics = applyApproachRubricWeights(
    analysis.methodOption?.label,
    rawRubrics.map((item) => ({
      rubricId: item.rubricId,
      weight: item.weight,
      chapter: item.rubric.chapter
    }))
  );
  const weightByRubricId = new Map(weightedRubrics.map((item) => [item.rubricId, item.weight]));

  const suggestedRubrics: SuggestedRubricMatch[] = rawRubrics.map((item) => {
    const finalWeight = weightByRubricId.get(item.rubricId) || item.weight;
    return {
      rubricId: item.rubricId,
      weight: finalWeight,
      sourceField: item.sourceField,
      sourceLabel: item.sourceLabel,
      sourcePhrase: item.sourcePhrase,
      reasoning: rubricMatchReasoning(item, item.weight, finalWeight),
      rubric: item.rubric
    };
  });

  const rubricIds = suggestedRubrics.map((item) => item.rubricId);
  const rubricById = new Map(suggestedRubrics.map((item) => [item.rubricId, item]));

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
      weight: item.weight,
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

      const supportingRubrics: RemedySupportingRubric[] = [];
      for (const link of remedyLinks) {
        if (link.remedyId !== item.remedyId) continue;
        const rubric = rubricById.get(link.rubricId);
        if (!rubric) continue;
        const weight = rubric.weight;
        const grade = Math.min(4, Math.max(1, link.grade));
        supportingRubrics.push({
          rubricId: rubric.rubricId,
          text: rubric.rubric.text,
          chapter: rubric.rubric.chapter,
          weight,
          grade,
          partialScore: grade * weight,
          sourceLabel: rubric.sourceLabel,
          sourcePhrase: rubric.sourcePhrase
        });
      }
      supportingRubrics.sort((a, b) => b.partialScore - a.partialScore);

      return {
        rank: index + 1,
        totalScore: item.totalScore,
        coverage: item.coverage,
        remedy,
        supportingRubrics,
        reasoning: buildRemedyReasoning(
          item.remedyId,
          item.totalScore,
          item.coverage,
          suggestedRubrics.length,
          supportingRubrics
        )
      };
    })
    .filter((item): item is SuggestedRemedyResult => !!item);

  const top = results[0];
  const summary = top
    ? `Preview only: ${phrases.length} phrases searched → ${suggestedRubrics.length} rubrics matched → top suggestion ${top.remedy.name} (score ${top.totalScore}, ${top.coverage}/${suggestedRubrics.length} rubrics). Doctor review required before applying.`
    : 'No remedy ranking produced.';

  return {
    isSuggestionOnly: true,
    disclaimer: SUGGESTION_DISCLAIMER,
    approachTitle: approach.title,
    repertorySourceName: source.name,
    phrasesSearched,
    suggestedRubrics,
    results,
    summary,
    generatedAt: new Date().toISOString()
  };
}

export async function applyApproachRemedySuggestions(input: {
  analysisId: string;
  maxPhrases?: number;
  maxRubrics?: number;
}) {
  const suggestion = await suggestRemediesFromApproach(input);
  if (!suggestion) return null;

  await persistRemedySuggestionSnapshot(input.analysisId, suggestion);

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
