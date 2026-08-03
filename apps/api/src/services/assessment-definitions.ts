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

export type AssessmentAccessMode = 'FREE' | 'LOGIN_REQUIRED' | 'PAID';
export type AssessmentCouponDiscountType = 'FREE' | 'PERCENT' | 'FLAT';

export type AssessmentDefinitionRecord = {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  version: string;
  config: AssessmentConfigDefinition;
  accessMode: AssessmentAccessMode;
  priceInPaise: number | null;
  couponCode: string | null;
  couponLabel: string | null;
  couponDiscountType: AssessmentCouponDiscountType;
  couponDiscountValue: number | null;
  couponStartsAt: Date | null;
  couponEndsAt: Date | null;
  couponMaxRedemptions: number | null;
  accessNote: string | null;
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

export type AssessmentAccessStatus = {
  accessMode: AssessmentAccessMode;
  canAccess: boolean;
  reason: 'FREE' | 'SIGNED_IN' | 'GRANTED' | 'SIGN_IN_REQUIRED' | 'PAYMENT_REQUIRED';
  priceInPaise: number | null;
  couponLabel: string | null;
  couponDiscountType: AssessmentCouponDiscountType;
  couponDiscountValue: number | null;
  accessNote: string | null;
};

export type AssessmentCouponQuote = {
  couponCode: string;
  couponLabel: string | null;
  discountType: AssessmentCouponDiscountType;
  discountValue: number | null;
  originalAmountInPaise: number;
  discountInPaise: number;
  payableAmountInPaise: number;
  unlocksFully: boolean;
};

type ResolvedAssessmentCoupon = {
  code: string;
  label: string | null;
  discountType: AssessmentCouponDiscountType;
  discountValue: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxRedemptions: number | null;
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
    accessMode: normalizeAssessmentAccessMode(row.accessMode),
    couponDiscountType: normalizeAssessmentCouponDiscountType(row.couponDiscountType),
    config: row.config as AssessmentConfigDefinition
  };
}

export function normalizeAssessmentAccessMode(value: unknown): AssessmentAccessMode {
  if (value === 'LOGIN_REQUIRED' || value === 'PAID') return value;
  return 'FREE';
}

export function normalizeAssessmentCouponDiscountType(
  value: unknown
): AssessmentCouponDiscountType {
  if (value === 'PERCENT' || value === 'FLAT') return value;
  return 'FREE';
}

export function serializeAssessmentAccess(
  definition: Pick<
    AssessmentDefinitionRecord,
    | 'accessMode'
    | 'priceInPaise'
    | 'couponLabel'
    | 'couponDiscountType'
    | 'couponDiscountValue'
    | 'accessNote'
  >
): Pick<
  AssessmentAccessStatus,
  | 'accessMode'
  | 'priceInPaise'
  | 'couponLabel'
  | 'couponDiscountType'
  | 'couponDiscountValue'
  | 'accessNote'
> {
  return {
    accessMode: normalizeAssessmentAccessMode(definition.accessMode),
    priceInPaise: definition.priceInPaise ?? null,
    couponLabel: definition.couponLabel ?? null,
    couponDiscountType: normalizeAssessmentCouponDiscountType(definition.couponDiscountType),
    couponDiscountValue: definition.couponDiscountValue ?? null,
    accessNote: definition.accessNote ?? null
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
      "accessMode",
      "priceInPaise",
      "couponCode",
      "couponLabel",
      "couponDiscountType",
      "couponDiscountValue",
      "couponStartsAt",
      "couponEndsAt",
      "couponMaxRedemptions",
      "accessNote",
      "isActive",
      "sortOrder"
    FROM "AssessmentDefinition"
    WHERE "id" = ${id} ${includeInactive ? Prisma.empty : Prisma.sql`AND "isActive" = true`}
    LIMIT 1
  `);
  return rows[0] ? normalizeDefinition(rows[0]) : null;
}

async function resolveAssessmentCoupon(
  definition: AssessmentDefinitionRecord,
  couponCode: string
): Promise<ResolvedAssessmentCoupon> {
  const normalized = couponCode.trim().toUpperCase();
  const rows = await prisma.$queryRaw<
    Array<{
      code: string;
      label: string | null;
      discountType: string;
      discountValue: number | null;
      startsAt: Date | null;
      endsAt: Date | null;
      maxRedemptions: number | null;
    }>
  >(Prisma.sql`
    SELECT "code", "label", "discountType", "discountValue", "startsAt", "endsAt", "maxRedemptions"
    FROM "AssessmentCoupon"
    WHERE "assessmentId" = ${definition.id}
      AND "code" = ${normalized}
      AND "isActive" = true
    LIMIT 1
  `);
  const row = rows[0] ?? null;

  const legacyExpected = definition.couponCode?.trim().toUpperCase();
  const coupon: ResolvedAssessmentCoupon | null = row
    ? {
        code: row.code.trim().toUpperCase(),
        label: row.label,
        discountType: normalizeAssessmentCouponDiscountType(row.discountType),
        discountValue: row.discountValue,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        maxRedemptions: row.maxRedemptions
      }
    : legacyExpected === normalized
      ? {
          code: normalized,
          label: definition.couponLabel,
          discountType: normalizeAssessmentCouponDiscountType(definition.couponDiscountType),
          discountValue: definition.couponDiscountValue,
          startsAt: definition.couponStartsAt,
          endsAt: definition.couponEndsAt,
          maxRedemptions: definition.couponMaxRedemptions
        }
      : null;

  if (!coupon) {
    const error = new Error('Coupon code is not valid for this assessment.');
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    const error = new Error('This coupon is not active yet.');
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    const error = new Error('This coupon has expired.');
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }
  return coupon;
}

export async function buildAssessmentCouponQuote(
  definition: AssessmentDefinitionRecord,
  couponCode: string
): Promise<AssessmentCouponQuote> {
  const coupon = await resolveAssessmentCoupon(definition, couponCode);
  const originalAmountInPaise = Math.max(0, definition.priceInPaise ?? 0);
  const discountType = coupon.discountType;
  const discountValue = coupon.discountValue ?? null;
  const discountInPaise =
    discountType === 'FREE'
      ? originalAmountInPaise
      : discountType === 'PERCENT'
        ? Math.floor((originalAmountInPaise * Math.min(100, Math.max(0, discountValue ?? 0))) / 100)
        : Math.min(originalAmountInPaise, Math.max(0, discountValue ?? 0));
  const payableAmountInPaise =
    discountType === 'FREE'
      ? 0
      : Math.round(Math.max(0, originalAmountInPaise - discountInPaise) / 100) * 100;
  return {
    couponCode: coupon.code,
    couponLabel: coupon.label ?? null,
    discountType,
    discountValue,
    originalAmountInPaise,
    discountInPaise,
    payableAmountInPaise,
    unlocksFully: payableAmountInPaise === 0
  };
}

export async function assertAssessmentCouponUsageAvailable(
  definition: AssessmentDefinitionRecord,
  couponCode: string,
  userId: string
) {
  const coupon = await resolveAssessmentCoupon(definition, couponCode);
  const existing = await prisma.assessmentCouponRedemption.findUnique({
    where: {
      userId_assessmentId_couponCode: {
        userId,
        assessmentId: definition.id,
        couponCode: coupon.code
      }
    },
    select: { id: true }
  });
  if (existing) {
    const error = new Error('You have already used this coupon for this assessment.');
    (error as Error & { statusCode?: number }).statusCode = 409;
    throw error;
  }

  if (coupon.maxRedemptions !== null && coupon.maxRedemptions !== undefined) {
    const used = await prisma.assessmentCouponRedemption.count({
      where: { assessmentId: definition.id, couponCode: coupon.code }
    });
    if (used >= coupon.maxRedemptions) {
      const error = new Error('This coupon has reached its usage limit.');
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }
  }
  return coupon.code;
}

export async function getAssessmentAccessStatus(
  definition: AssessmentDefinitionRecord,
  userId?: string | null
): Promise<AssessmentAccessStatus> {
  const base = serializeAssessmentAccess(definition);
  const accessMode = normalizeAssessmentAccessMode(definition.accessMode);
  if (accessMode === 'FREE') {
    return { ...base, accessMode, canAccess: true, reason: 'FREE' };
  }
  if (!userId) {
    return { ...base, accessMode, canAccess: false, reason: 'SIGN_IN_REQUIRED' };
  }
  if (accessMode === 'LOGIN_REQUIRED') {
    return { ...base, accessMode, canAccess: true, reason: 'SIGNED_IN' };
  }

  const now = new Date();
  const grant = await prisma.assessmentAccessGrant.findFirst({
    where: {
      userId,
      assessmentId: definition.id,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
    },
    select: { id: true }
  });

  return {
    ...base,
    accessMode,
    canAccess: Boolean(grant),
    reason: grant ? 'GRANTED' : 'PAYMENT_REQUIRED'
  };
}

export async function assertAssessmentAccess(
  definition: AssessmentDefinitionRecord,
  userId?: string | null
): Promise<AssessmentAccessStatus> {
  const access = await getAssessmentAccessStatus(definition, userId);
  if (access.canAccess) return access;
  const error = new Error(
    access.reason === 'SIGN_IN_REQUIRED'
      ? 'Please sign in to access this assessment.'
      : 'This assessment is locked. Use a valid coupon or complete payment to continue.'
  );
  (error as Error & { statusCode?: number }).statusCode =
    access.reason === 'SIGN_IN_REQUIRED' ? 401 : 403;
  throw error;
}

export async function redeemAssessmentCoupon(
  definition: AssessmentDefinitionRecord,
  userId: string,
  couponCode: string
): Promise<{ access: AssessmentAccessStatus; alreadyRedeemed: boolean }> {
  const quote = await buildAssessmentCouponQuote(definition, couponCode);
  if (!quote.unlocksFully) {
    const error = new Error('This coupon gives a discount. Complete payment to unlock.');
    (error as Error & { statusCode?: number; quote?: AssessmentCouponQuote }).statusCode = 402;
    (error as Error & { statusCode?: number; quote?: AssessmentCouponQuote }).quote = quote;
    throw error;
  }
  const normalized = quote.couponCode;

  const existing = await prisma.assessmentCouponRedemption.findUnique({
    where: {
      userId_assessmentId_couponCode: {
        userId,
        assessmentId: definition.id,
        couponCode: normalized
      }
    },
    select: { id: true }
  });

  if (existing) {
    return {
      access: await getAssessmentAccessStatus(definition, userId),
      alreadyRedeemed: true
    };
  }

  await assertAssessmentCouponUsageAvailable(definition, normalized, userId);

  await prisma.$transaction([
    prisma.assessmentCouponRedemption.create({
      data: { userId, assessmentId: definition.id, couponCode: normalized }
    }),
    prisma.assessmentAccessGrant.create({
      data: {
        userId,
        assessmentId: definition.id,
        source: 'COUPON',
        couponCode: normalized
      }
    })
  ]);

  return {
    access: await getAssessmentAccessStatus(definition, userId),
    alreadyRedeemed: false
  };
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
