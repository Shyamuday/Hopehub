import { z } from 'zod';

export type ListenerScreeningQuestionOption = {
  id: string;
  text: string;
};

export type ListenerScreeningQuestion = {
  id: string;
  text: string;
  correctOptionId: string;
  options: ListenerScreeningQuestionOption[];
};

export type ListenerScreeningQuestionSetLike = {
  id: string;
  title: string;
  version: string;
  description: string | null;
  passScore: number;
  questions: unknown;
  isActive: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const listenerScreeningQuestionOptionSchema = z.object({
  id: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Option id must use lowercase letters, numbers, and hyphens.'),
  text: z.string().trim().min(2).max(500)
});

export const listenerScreeningQuestionSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9-]+$/, 'Question id must use lowercase letters, numbers, and hyphens.'),
    text: z.string().trim().min(10).max(1000),
    correctOptionId: z.string().trim().min(1).max(80),
    options: z.array(listenerScreeningQuestionOptionSchema).min(2).max(6)
  })
  .superRefine((question, ctx) => {
    const optionIds = question.options.map((option) => option.id);
    const uniqueOptionIds = new Set(optionIds);
    if (uniqueOptionIds.size !== optionIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Option ids must be unique inside a question.'
      });
    }
    if (!uniqueOptionIds.has(question.correctOptionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctOptionId'],
        message: 'Correct option id must match one of this question options.'
      });
    }
  });

export const listenerScreeningQuestionsSchema = z
  .array(listenerScreeningQuestionSchema)
  .min(1)
  .max(60)
  .superRefine((questions, ctx) => {
    const ids = questions.map((question) => question.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Question ids must be unique.'
      });
    }
  });

export const listenerScreeningQuestionSetWriteSchema = z.object({
  title: z.string().trim().min(2).max(160).default('Listener screening test'),
  version: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      'Version can only contain letters, numbers, dot, underscore, and hyphen.'
    ),
  description: z.string().trim().max(3000).nullable().optional(),
  passScore: z.number().int().min(1).max(60).default(16),
  questions: listenerScreeningQuestionsSchema,
  isActive: z.boolean().optional().default(false)
});

export function sanitizeListenerScreeningQuestions(raw: unknown): ListenerScreeningQuestion[] {
  return listenerScreeningQuestionsSchema.parse(raw);
}

export function publicListenerScreeningQuestionSet(set: ListenerScreeningQuestionSetLike) {
  const questions = sanitizeListenerScreeningQuestions(set.questions);
  return {
    id: set.id,
    title: set.title,
    version: set.version,
    description: set.description,
    passScore: set.passScore,
    isActive: set.isActive,
    publishedAt: set.publishedAt?.toISOString() ?? null,
    updatedAt: set.updatedAt.toISOString(),
    questions: questions.map(({ correctOptionId: _correctOptionId, ...question }) => question)
  };
}

export function adminListenerScreeningQuestionSet(set: ListenerScreeningQuestionSetLike) {
  return {
    id: set.id,
    title: set.title,
    version: set.version,
    description: set.description,
    passScore: set.passScore,
    isActive: set.isActive,
    publishedAt: set.publishedAt?.toISOString() ?? null,
    createdAt: set.createdAt.toISOString(),
    updatedAt: set.updatedAt.toISOString(),
    questions: sanitizeListenerScreeningQuestions(set.questions)
  };
}

export function scoreListenerScreening(
  questions: ListenerScreeningQuestion[],
  answers: Array<{ questionId: string; optionId: string }>,
  passScore: number
): {
  score: number;
  maxScore: number;
  passed: boolean;
} {
  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer.optionId]));
  const score = questions.reduce(
    (total, question) =>
      total + (answerByQuestion.get(question.id) === question.correctOptionId ? 1 : 0),
    0
  );
  return {
    score,
    maxScore: questions.length,
    passed: score >= passScore
  };
}
