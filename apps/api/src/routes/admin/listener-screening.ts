import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  adminListenerScreeningQuestionSet,
  listenerScreeningQuestionSetWriteSchema,
  sanitizeListenerScreeningQuestions
} from '../../services/listener-screening-question-sets.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';

const listenerScreeningQuestionSetUpdateSchema = listenerScreeningQuestionSetWriteSchema.partial();

function validatePassScore(questions: unknown, passScore: number) {
  const parsedQuestions = sanitizeListenerScreeningQuestions(questions);
  if (passScore > parsedQuestions.length) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ['passScore'],
        message: 'Pass score cannot be higher than total questions.'
      }
    ]);
  }
  return parsedQuestions;
}

async function activateOnlyThisQuestionSet(id: string, actorId?: string) {
  return prisma.$transaction(async (tx) => {
    await tx.listenerScreeningQuestionSet.updateMany({
      where: { id: { not: id }, isActive: true },
      data: { isActive: false, updatedById: actorId || null }
    });
    return tx.listenerScreeningQuestionSet.update({
      where: { id },
      data: {
        isActive: true,
        publishedAt: new Date(),
        updatedById: actorId || null
      }
    });
  });
}

export function registerAdminListenerScreeningRoutes(router: Router) {
  router.get(
    '/admin/hope-hub/listener-screening',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const questionSets = await prisma.listenerScreeningQuestionSet.findMany({
        orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }]
      });

      res.json({ questionSets: questionSets.map(adminListenerScreeningQuestionSet) });
    })
  );

  router.post(
    '/admin/hope-hub/listener-screening',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = listenerScreeningQuestionSetWriteSchema.parse(req.body);
      const questions = validatePassScore(body.questions, body.passScore);
      const now = new Date();

      const questionSet = await prisma.$transaction(async (tx) => {
        if (body.isActive) {
          await tx.listenerScreeningQuestionSet.updateMany({
            where: { isActive: true },
            data: { isActive: false, updatedById: req.user?.id || null }
          });
        }
        return tx.listenerScreeningQuestionSet.create({
          data: {
            title: body.title,
            version: body.version,
            description: body.description || null,
            passScore: body.passScore,
            questions,
            isActive: body.isActive,
            publishedAt: body.isActive ? now : null,
            createdById: req.user?.id || null,
            updatedById: req.user?.id || null
          }
        });
      });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: body.isActive
          ? 'LISTENER_SCREENING_QUESTION_SET_CREATED_AND_PUBLISHED'
          : 'LISTENER_SCREENING_QUESTION_SET_CREATED',
        targetType: 'ListenerScreeningQuestionSet',
        targetId: questionSet.id,
        summary: `Created listener screening question set ${questionSet.version}.`,
        metadata: { version: questionSet.version, questionCount: questions.length }
      });

      res.status(201).json({ questionSet: adminListenerScreeningQuestionSet(questionSet) });
    })
  );

  router.patch(
    '/admin/hope-hub/listener-screening/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = listenerScreeningQuestionSetUpdateSchema.parse(req.body);
      const existing = await prisma.listenerScreeningQuestionSet.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Listener test not found.' });

      const mergedQuestions =
        body.questions ?? sanitizeListenerScreeningQuestions(existing.questions);
      const mergedPassScore = body.passScore ?? existing.passScore;
      const questions = validatePassScore(mergedQuestions, mergedPassScore);

      const questionSet = await prisma.$transaction(async (tx) => {
        if (body.isActive) {
          await tx.listenerScreeningQuestionSet.updateMany({
            where: { id: { not: id }, isActive: true },
            data: { isActive: false, updatedById: req.user?.id || null }
          });
        }
        return tx.listenerScreeningQuestionSet.update({
          where: { id },
          data: {
            ...(body.title !== undefined ? { title: body.title } : {}),
            ...(body.version !== undefined ? { version: body.version } : {}),
            ...(body.description !== undefined ? { description: body.description || null } : {}),
            ...(body.passScore !== undefined ? { passScore: body.passScore } : {}),
            ...(body.questions !== undefined ? { questions } : {}),
            ...(body.isActive !== undefined
              ? { isActive: body.isActive, publishedAt: body.isActive ? new Date() : null }
              : {}),
            updatedById: req.user?.id || null
          }
        });
      });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: body.isActive
          ? 'LISTENER_SCREENING_QUESTION_SET_UPDATED_AND_PUBLISHED'
          : 'LISTENER_SCREENING_QUESTION_SET_UPDATED',
        targetType: 'ListenerScreeningQuestionSet',
        targetId: questionSet.id,
        summary: `Updated listener screening question set ${questionSet.version}.`,
        metadata: { version: questionSet.version, questionCount: questions.length }
      });

      res.json({ questionSet: adminListenerScreeningQuestionSet(questionSet) });
    })
  );

  router.post(
    '/admin/hope-hub/listener-screening/:id/publish',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const existing = await prisma.listenerScreeningQuestionSet.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ message: 'Listener test not found.' });

      const questions = validatePassScore(existing.questions, existing.passScore);
      const questionSet = await activateOnlyThisQuestionSet(id, req.user?.id);

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'LISTENER_SCREENING_QUESTION_SET_PUBLISHED',
        targetType: 'ListenerScreeningQuestionSet',
        targetId: questionSet.id,
        summary: `Published listener screening question set ${questionSet.version}.`,
        metadata: { version: questionSet.version, questionCount: questions.length }
      });

      res.json({ questionSet: adminListenerScreeningQuestionSet(questionSet) });
    })
  );
}
