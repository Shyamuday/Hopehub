import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

export type AssessmentQuestionDefinition = {
  id: number;
  text: string;
  category?: string;
  subcategory?: string;
};

export type AssessmentResponseOptionDefinition = {
  value: number;
  label: string;
};

export type AssessmentScoringBandDefinition = {
  min: number;
  max: number;
  level: string;
  color: string;
  description: string;
  suggestions: string[];
};

export type AssessmentConfigDefinition = {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  instructions: string;
  timeframe?: string;
  duration: string;
  questions: AssessmentQuestionDefinition[];
  responseOptions: AssessmentResponseOptionDefinition[];
  scoring: AssessmentScoringBandDefinition[];
  disclaimer: string;
  emergencyHelplines: { name: string; number: string }[];
  safetyQuestionIndex?: number;
  references?: string[];
};

export type AssessmentDefinitionRecord = {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  version: string;
  config: AssessmentConfigDefinition;
  isActive: boolean;
  sortOrder: number;
};

export type AssessmentScoreResult = {
  assessmentId: string;
  assessmentType: string;
  category: string;
  title: string;
  version: string;
  total: number;
  maxScore: number;
  level: string;
  color: string;
  description: string;
  suggestions: string[];
  safetyFlag: boolean;
  answers: number[];
};

type AssessmentDefinitionRow = Omit<AssessmentDefinitionRecord, 'config'> & {
  config: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateAssessmentConfig(config: unknown): string[] {
  const errors: string[] = [];
  if (!isPlainObject(config)) return ['Config must be an object.'];

  for (const key of [
    'id',
    'type',
    'category',
    'title',
    'description',
    'instructions',
    'duration',
    'disclaimer'
  ]) {
    if (!hasText(config[key])) errors.push(`${key} is required.`);
  }

  const questions = config['questions'];
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push('At least one question is required.');
  } else {
    const ids = new Set<number>();
    questions.forEach((question, index) => {
      if (!isPlainObject(question)) {
        errors.push(`Question ${index + 1} must be an object.`);
        return;
      }
      const id = question['id'];
      if (!Number.isInteger(id) || Number(id) <= 0)
        errors.push(`Question ${index + 1} needs a positive numeric id.`);
      if (Number.isInteger(id)) {
        if (ids.has(Number(id))) errors.push(`Question id ${id} is duplicated.`);
        ids.add(Number(id));
      }
      if (!hasText(question['text'])) errors.push(`Question ${index + 1} text is required.`);
    });
  }

  const responseOptions = config['responseOptions'];
  if (!Array.isArray(responseOptions) || responseOptions.length < 2) {
    errors.push('At least two response options are required.');
  } else {
    const values = new Set<number>();
    responseOptions.forEach((option, index) => {
      if (!isPlainObject(option)) {
        errors.push(`Response option ${index + 1} must be an object.`);
        return;
      }
      const value = option['value'];
      if (!Number.isInteger(value) || Number(value) < 0)
        errors.push(`Response option ${index + 1} needs a non-negative numeric value.`);
      if (Number.isInteger(value)) {
        if (values.has(Number(value))) errors.push(`Response option value ${value} is duplicated.`);
        values.add(Number(value));
      }
      if (!hasText(option['label'])) errors.push(`Response option ${index + 1} label is required.`);
    });
  }

  const scoring = config['scoring'];
  if (!Array.isArray(scoring) || scoring.length === 0) {
    errors.push('At least one scoring band is required.');
  } else {
    scoring.forEach((band, index) => {
      if (!isPlainObject(band)) {
        errors.push(`Scoring band ${index + 1} must be an object.`);
        return;
      }
      if (!Number.isInteger(band['min']) || Number(band['min']) < 0)
        errors.push(`Scoring band ${index + 1} needs a non-negative min.`);
      if (!Number.isInteger(band['max']) || Number(band['max']) < Number(band['min'] ?? 0))
        errors.push(`Scoring band ${index + 1} needs max greater than or equal to min.`);
      if (!hasText(band['level'])) errors.push(`Scoring band ${index + 1} level is required.`);
      if (!hasText(band['color'])) errors.push(`Scoring band ${index + 1} color is required.`);
      if (!hasText(band['description']))
        errors.push(`Scoring band ${index + 1} description is required.`);
      if (!Array.isArray(band['suggestions']))
        errors.push(`Scoring band ${index + 1} suggestions must be an array.`);
    });
  }

  if (config['safetyQuestionIndex'] !== undefined) {
    const safetyQuestionIndex = config['safetyQuestionIndex'];
    const questionCount = Array.isArray(questions) ? questions.length : 0;
    if (
      !Number.isInteger(safetyQuestionIndex) ||
      Number(safetyQuestionIndex) < 0 ||
      Number(safetyQuestionIndex) >= questionCount
    ) {
      errors.push('safetyQuestionIndex must point to an existing zero-based question index.');
    }
  }

  return errors;
}

function normalizeDefinition(row: AssessmentDefinitionRow): AssessmentDefinitionRecord {
  return {
    ...row,
    config: row.config as AssessmentConfigDefinition
  };
}

export async function getAssessmentDefinition(id: string, includeInactive = false) {
  const rows = await prisma.$queryRaw<AssessmentDefinitionRow[]>(Prisma.sql`
    SELECT
      "id",
      "type",
      "category",
      "title",
      "description",
      "version",
      "config",
      "isActive",
      "sortOrder"
    FROM "AssessmentDefinition"
    WHERE "id" = ${id} ${includeInactive ? Prisma.empty : Prisma.sql`AND "isActive" = true`}
    LIMIT 1
  `);
  return rows[0] ? normalizeDefinition(rows[0]) : null;
}

export function scoreAssessment(
  definition: AssessmentDefinitionRecord,
  answers: number[]
): AssessmentScoreResult {
  const config = definition.config;
  if (answers.length !== config.questions.length) {
    throw new Error(`Expected ${config.questions.length} answers, received ${answers.length}.`);
  }

  const allowedValues = new Set(config.responseOptions.map((option) => option.value));
  const normalizedAnswers = answers.map((answer, index) => {
    const normalized = Number(answer);
    if (!Number.isInteger(normalized) || !allowedValues.has(normalized)) {
      throw new Error(`Answer ${index + 1} is not a valid response option.`);
    }
    return normalized;
  });

  const total = normalizedAnswers.reduce((sum, answer) => sum + answer, 0);
  const maxOption = Math.max(...config.responseOptions.map((option) => option.value));
  const maxScore = maxOption * config.questions.length;
  const scoring = config.scoring.find((band) => total >= band.min && total <= band.max);
  if (!scoring) {
    throw new Error('No scoring band matches this total score.');
  }

  return {
    assessmentId: definition.id,
    assessmentType: definition.type,
    category: definition.category,
    title: definition.title,
    version: definition.version,
    total,
    maxScore,
    level: scoring.level,
    color: scoring.color,
    description: scoring.description,
    suggestions: scoring.suggestions,
    safetyFlag:
      config.safetyQuestionIndex !== undefined &&
      Number(normalizedAnswers[config.safetyQuestionIndex]) > 0,
    answers: normalizedAnswers
  };
}
