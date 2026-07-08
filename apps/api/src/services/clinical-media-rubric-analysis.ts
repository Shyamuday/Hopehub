import { RepertorySourceCode } from '@prisma/client';
import {
  CLINICAL_MEDIA_TYPE_LABELS,
  suggestRubricSearchPhrases,
  type ClinicalMediaType
} from '../lib/homeopathy-approaches.js';
import { prisma } from '../db.js';
import { readClinicalMediaFile } from './clinical-media-storage.js';
import {
  extractClinicalSymptomsFromImage,
  isOllamaVisionAvailable,
  ollamaVisionConfig
} from './clinical-media-vision.js';
import { searchRepertoryRubrics, scoreRubricMatch, tokenizeRepertoryQuery } from './repertory-search.js';
import { isOorepSourceId } from './oorep-client.js';

export type ClinicalMediaPhraseSearchLog = {
  phrase: string;
  sourceKey: string;
  sourceLabel: string;
  priority: number;
  reasoning: string;
};

export type ClinicalMediaRubricMatch = {
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

export type ClinicalMediaImageAnalysis = {
  isSuggestionOnly: true;
  disclaimer: string;
  mediaId: string;
  mediaType: string;
  mediaTypeLabel: string;
  visionModel: string;
  visionAvailable: boolean;
  extractedSymptoms: string;
  symptomPhrases: string[];
  phrasesSearched: ClinicalMediaPhraseSearchLog[];
  suggestedRubrics: ClinicalMediaRubricMatch[];
  summary: string;
  generatedAt: string;
};

const DISCLAIMER =
  'Vision-based rubric suggestions are preliminary. Doctor review is required before adding rubrics to the case.';

type RubricCandidate = ClinicalMediaRubricMatch & { matchScore: number };

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

  return imported ? { id: imported.id, name: imported.name } : null;
}

function rubricPathLabel(rubric: ClinicalMediaRubricMatch['rubric']) {
  return [rubric.chapter, rubric.subchapter, rubric.text].filter(Boolean).join(' · ');
}

function collectPhrases(input: {
  mediaType: ClinicalMediaType;
  bodyRegion?: string | null;
  visionPhrases: string[];
  existingObservations?: string | null;
}) {
  const ontologyPhrases = suggestRubricSearchPhrases({
    mediaType: input.mediaType,
    observations: input.existingObservations,
    bodyRegion: input.bodyRegion ?? undefined
  });

  const entries: Array<{ phrase: string; sourceKey: string; sourceLabel: string; priority: number }> = [];

  for (const phrase of input.visionPhrases) {
    entries.push({
      phrase,
      sourceKey: 'vision',
      sourceLabel: 'AI vision extraction',
      priority: 100
    });
  }

  for (const phrase of ontologyPhrases) {
    entries.push({
      phrase,
      sourceKey: 'ontology',
      sourceLabel: 'Clinical media ontology',
      priority: 70
    });
  }

  const seen = new Set<string>();
  const unique: typeof entries = [];
  for (const entry of entries.sort((a, b) => b.priority - a.priority)) {
    const key = entry.phrase.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }

  return unique.slice(0, 12);
}

async function searchPhraseForRubrics(
  phrase: { phrase: string; sourceKey: string; sourceLabel: string; priority: number },
  sourceId: string
): Promise<RubricCandidate[]> {
  const rows = await searchRepertoryRubrics(prisma, {
    q: phrase.phrase,
    sourceId,
    limit: 3,
    mode: 'search'
  });
  const tokens = tokenizeRepertoryQuery(phrase.phrase);
  const matches: RubricCandidate[] = [];

  for (const row of rows) {
    const matchScore = scoreRubricMatch(row, tokens);
    if (matchScore < 0) continue;
    const weight = phrase.sourceKey === 'vision' ? 3 : 2;
    matches.push({
      rubricId: row.id,
      weight,
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

  return matches;
}

export async function analyzeClinicalMediaImage(input: {
  analysisId: string;
  mediaId: string;
  saveObservations?: boolean;
}): Promise<ClinicalMediaImageAnalysis | null> {
  const [analysis, media] = await Promise.all([
    prisma.caseAnalysis.findUnique({
      where: { id: input.analysisId },
      select: { id: true, sourceId: true }
    }),
    prisma.clinicalMedia.findFirst({
      where: { id: input.mediaId, caseAnalysisId: input.analysisId },
      select: {
        id: true,
        mediaType: true,
        bodyRegion: true,
        observations: true,
        storageKey: true,
        mimeType: true
      }
    })
  ]);

  if (!analysis || !media) return null;

  const visionAvailable = await isOllamaVisionAvailable();
  if (!visionAvailable) {
    throw new Error('OLLAMA_UNAVAILABLE');
  }

  const source = await resolveRepertorySource(analysis.sourceId);
  if (!source) return null;

  const bytes = await readClinicalMediaFile(media.storageKey);
  const imageBase64 = bytes.toString('base64');
  const mediaType = media.mediaType as ClinicalMediaType;
  const mediaTypeLabel = CLINICAL_MEDIA_TYPE_LABELS[mediaType] ?? media.mediaType;

  const vision = await extractClinicalSymptomsFromImage({
    imageBase64,
    mediaTypeLabel,
    bodyRegion: media.bodyRegion
  });

  if (input.saveObservations) {
    const merged = [media.observations?.trim(), vision.rawText].filter(Boolean).join('\n\n');
    await prisma.clinicalMedia.update({
      where: { id: media.id },
      data: { observations: merged || null }
    });
  }

  const phraseEntries = collectPhrases({
    mediaType,
    bodyRegion: media.bodyRegion,
    visionPhrases: vision.phrases,
    existingObservations: media.observations
  });

  const phrasesSearched: ClinicalMediaPhraseSearchLog[] = phraseEntries.map((entry) => ({
    phrase: entry.phrase,
    sourceKey: entry.sourceKey,
    sourceLabel: entry.sourceLabel,
    priority: entry.priority,
    reasoning:
      entry.sourceKey === 'vision'
        ? `Local vision model (${vision.model}) extracted “${entry.phrase}” from the clinical image.`
        : `Ontology phrase derived from ${mediaTypeLabel}${media.bodyRegion ? ` (${media.bodyRegion})` : ''}.`
  }));

  const rubricCandidates: RubricCandidate[] = [];
  for (const phrase of phraseEntries) {
    rubricCandidates.push(...(await searchPhraseForRubrics(phrase, source.id)));
  }

  const byRubric = new Map<string, RubricCandidate>();
  for (const candidate of rubricCandidates.sort((a, b) => b.matchScore - a.matchScore)) {
    const existing = byRubric.get(candidate.rubricId);
    if (!existing || candidate.matchScore > existing.matchScore) {
      byRubric.set(candidate.rubricId, candidate);
    }
  }

  const suggestedRubrics: ClinicalMediaRubricMatch[] = [...byRubric.values()]
    .slice(0, 15)
    .map((item) => ({
      rubricId: item.rubricId,
      weight: item.weight,
      sourceField: item.sourceField,
      sourceLabel: item.sourceLabel,
      sourcePhrase: item.sourcePhrase,
      reasoning: `Repertory match for “${item.sourcePhrase}” from ${item.sourceLabel} → ${rubricPathLabel(item.rubric)} (weight ${item.weight}).`,
      rubric: item.rubric
    }));

  const config = ollamaVisionConfig();
  const summary = suggestedRubrics.length
    ? `Vision found ${vision.phrases.length} symptom phrase(s) → ${suggestedRubrics.length} rubric match(es) in ${source.name}. Doctor review required.`
    : `Vision extracted symptoms but no rubric matches were found in ${source.name}. Try manual search phrases.`;

  return {
    isSuggestionOnly: true,
    disclaimer: DISCLAIMER,
    mediaId: media.id,
    mediaType: media.mediaType,
    mediaTypeLabel,
    visionModel: config.model,
    visionAvailable: true,
    extractedSymptoms: vision.rawText,
    symptomPhrases: vision.phrases,
    phrasesSearched,
    suggestedRubrics,
    summary,
    generatedAt: new Date().toISOString()
  };
}
