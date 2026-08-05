import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { DEFAULT_REMINDER_PREFERENCE } from '../../constants/reminder-preferences.constants.js';
import {
  asyncRoute,
  patientProfileSelect,
  routeParam,
  writeAuditLog
} from '../../utils/helpers.js';
import { parseMultipartForm } from '../../utils/multipart.js';
import { assetAccessUrl } from '../../services/asset-storage.js';
import { buildPatientIdCard } from '../../services/patient-identity.js';
import { normalizeMobile } from '../../services/patient-identity.js';
import {
  formatDateOfBirth,
  mapProfileUpdateToUserData,
  patientPasswordSchema,
  patientProfileUpdateSchema,
  reminderPreferencesSchema
} from '../../services/patient-profile.js';
import {
  capabilitiesForRole,
  defaultRouteForRole,
  portalForRole,
  sessionPayloadForUser
} from '../../constants/rbac-helpers.js';
import { attachStaffProfile } from '../../staff-profile.js';
import {
  enrichWithProfileImageAccessUrl,
  enrichWithProfileImageUrl,
  userProfileImagePath
} from '../../utils/profile-image-url.js';
import {
  deletePatientDailyPlanImage,
  patientDailyPlanImagePath,
  readPatientDailyPlanImage,
  savePatientDailyPlanImage
} from '../../services/patient-daily-plan-storage.js';

async function serializePatientProfile(user: {
  passwordHash?: string | null;
  dateOfBirth?: Date | null;
  profileImageKey?: string | null;
  profileImageUrl?: string | null;
  [key: string]: unknown;
}) {
  const { passwordHash, dateOfBirth, profileImageKey, profileImageUrl, ...rest } = user;
  return {
    ...(await enrichWithProfileImageAccessUrl(
      { ...rest, id: String(rest.id), profileImageKey, profileImageUrl },
      userProfileImagePath
    )),
    dateOfBirth: formatDateOfBirth(dateOfBirth ?? null),
    hasPassword: Boolean(passwordHash)
  };
}

const dailyPlanInclude = {
  tasks: {
    orderBy: { sortOrder: 'asc' as const },
    include: { images: { orderBy: { createdAt: 'desc' as const } } }
  },
  images: { where: { taskId: null }, orderBy: { createdAt: 'desc' as const } }
};

const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(1000).optional().nullable(),
  sortOrder: z.number().int().min(0).max(1000).optional()
});

const dailyPlanCreateSchema = z.object({
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().trim().min(1).max(160),
  focus: z.string().trim().max(300).optional().nullable(),
  summary: z.string().trim().max(2000).optional().nullable(),
  tasks: z.array(taskInputSchema).max(20).optional()
});

const dailyPlanUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  focus: z.string().trim().max(300).optional().nullable(),
  summary: z.string().trim().max(2000).optional().nullable(),
  reviewNote: z.string().trim().max(2000).optional().nullable(),
  reviewed: z.boolean().optional()
});

const dailyPlanTaskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  completed: z.boolean().optional(),
  reviewTick: z.boolean().optional(),
  reviewNote: z.string().trim().max(1000).optional().nullable()
});

const MAX_DAILY_PLAN_IMAGE_BYTES = 4 * 1024 * 1024;

async function parseDailyPlanImageUpload(req: import('express').Request) {
  const form = await parseMultipartForm(req, { maxFileBytes: MAX_DAILY_PLAN_IMAGE_BYTES });
  if (!form.file) {
    throw new Error('EMPTY_FILE');
  }
  return {
    taskId: cleanText(form.fields['taskId']),
    mimeType: form.file.mimeType,
    fileName: form.fields['fileName'] || form.file.fileName,
    data: form.file.buffer,
    caption: cleanText(form.fields['caption'])
  };
}

function parsePlanDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function cleanText(value: string | null | undefined) {
  return value?.trim() || null;
}

async function serializeDailyPlanImage(image: {
  id: string;
  taskId?: string | null;
  storageKey?: string | null;
  imageUrl?: string | null;
  mimeType: string;
  fileName?: string | null;
  byteSize: number;
  caption?: string | null;
  createdAt: Date;
}) {
  return {
    id: image.id,
    taskId: image.taskId ?? null,
    mimeType: image.mimeType,
    fileName: image.fileName ?? null,
    byteSize: image.byteSize,
    caption: image.caption ?? null,
    imageUrl: await assetAccessUrl(
      image.storageKey,
      image.imageUrl || patientDailyPlanImagePath(image.id)
    ),
    createdAt: image.createdAt.toISOString()
  };
}

async function serializeDailyPlan(plan: {
  id: string;
  userId: string;
  planDate: Date;
  title: string;
  focus?: string | null;
  summary?: string | null;
  reviewNote?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tasks: Array<{
    id: string;
    title: string;
    notes?: string | null;
    sortOrder: number;
    completed: boolean;
    completedAt?: Date | null;
    reviewTick: boolean;
    reviewNote?: string | null;
    createdAt: Date;
    updatedAt: Date;
    images: Array<Parameters<typeof serializeDailyPlanImage>[0]>;
  }>;
  images: Array<Parameters<typeof serializeDailyPlanImage>[0]>;
}) {
  return {
    id: plan.id,
    planDate: plan.planDate.toISOString().slice(0, 10),
    title: plan.title,
    focus: plan.focus ?? null,
    summary: plan.summary ?? null,
    reviewNote: plan.reviewNote ?? null,
    reviewedAt: plan.reviewedAt?.toISOString() ?? null,
    tasks: await Promise.all(
      plan.tasks.map(async (task) => ({
        id: task.id,
        title: task.title,
        notes: task.notes ?? null,
        sortOrder: task.sortOrder,
        completed: task.completed,
        completedAt: task.completedAt?.toISOString() ?? null,
        reviewTick: task.reviewTick,
        reviewNote: task.reviewNote ?? null,
        images: await Promise.all(task.images.map(serializeDailyPlanImage))
      }))
    ),
    images: await Promise.all(plan.images.map(serializeDailyPlanImage)),
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString()
  };
}

async function getOwnedDailyPlan(planId: string, userId: string) {
  return prisma.patientDailyPlan.findFirst({
    where: { id: planId, userId },
    include: dailyPlanInclude
  });
}

function mapImageUploadError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  if (code === 'UNSUPPORTED_MIME') {
    return { status: 400, message: 'Only JPEG, PNG, and WebP images are allowed.' };
  }
  if (code === 'EMPTY_FILE') return { status: 400, message: 'Image file is empty.' };
  if (code === 'FILE_TOO_LARGE') return { status: 400, message: 'Image must be 4 MB or smaller.' };
  return { status: 500, message: 'Could not save daily plan image.' };
}

export function registerAuthProfileRoutes(router: Router) {
  router.get(
    '/me',
    authRequired,
    asyncRoute(async (req, res) => {
      const userRow = await prisma.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
          mobile: true,
          patientCode: true,
          profileImageKey: true,
          profileImageUrl: true
        }
      });
      const withProfile = await attachStaffProfile(userRow);
      const payload = sessionPayloadForUser(withProfile);
      payload.user = await enrichWithProfileImageAccessUrl(withProfile, userProfileImagePath);
      res.json(payload);
    })
  );

  router.get(
    '/capabilities',
    authRequired,
    asyncRoute(async (req, res) => {
      const withProfile = await attachStaffProfile(req.user!);
      const role = withProfile.role;
      const roleCaps = capabilitiesForRole(role);
      const capabilities = sessionPayloadForUser(withProfile).capabilities;
      res.json({
        role,
        capabilities,
        portal: portalForRole(role),
        defaultRoute: defaultRouteForRole(role, capabilities)
      });
    })
  );

  router.get(
    '/patient/profile',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const [user, reminderPreferences] = await Promise.all([
        prisma.user.findUniqueOrThrow({
          where: { id: req.user!.id },
          select: patientProfileSelect
        }),
        prisma.reminderPreference.findUnique({
          where: { userId: req.user!.id },
          select: {
            inApp: true,
            sms: true,
            whatsapp: true,
            push: true,
            quietHoursStart: true,
            quietHoursEnd: true
          }
        })
      ]);

      res.json({
        profile: await serializePatientProfile(user),
        reminderPreferences: reminderPreferences || DEFAULT_REMINDER_PREFERENCE
      });
    })
  );

  router.get(
    '/patient/card',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const card = await buildPatientIdCard(req.user!.id);
      if (!card) {
        return res.status(404).json({ message: 'Patient ID card is not available yet.' });
      }
      res.json({ card });
    })
  );

  router.post(
    '/patient/push-token',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          token: z.string().min(1),
          platform: z.enum(['ios', 'android', 'web']).optional()
        })
        .parse(req.body);
      res.json({ ok: true, token: body.token.slice(0, 8) + '…' });
    })
  );

  router.post(
    '/staff/push-token',
    authRequired,
    asyncRoute(async (req, res) => {
      const role = req.user!.role;
      if (role === Role.PATIENT || role === Role.DOCTOR) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const body = z
        .object({
          token: z.string().min(1),
          platform: z.enum(['ios', 'android', 'web']).optional()
        })
        .parse(req.body);
      res.json({ ok: true, token: body.token.slice(0, 8) + '…' });
    })
  );

  router.put(
    '/patient/profile',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = patientProfileUpdateSchema.parse(req.body);

      if (body.email) {
        const emailTaken = await prisma.user.findFirst({
          where: { email: body.email, role: Role.PATIENT, NOT: { id: req.user!.id } },
          select: { id: true }
        });
        if (emailTaken) {
          return res
            .status(409)
            .json({ message: 'This email is already linked to another account.' });
        }
      }

      const alternateMobile = body.alternateMobile ? normalizeMobile(body.alternateMobile) : null;
      if (body.alternateMobile && !alternateMobile) {
        return res.status(400).json({ message: 'Invalid alternate mobile number.' });
      }

      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: mapProfileUpdateToUserData(body, alternateMobile),
        select: patientProfileSelect
      });

      res.json({ profile: await serializePatientProfile(updated) });
    })
  );

  router.put(
    '/patient/profile/password',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = patientPasswordSchema.parse(req.body);
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        select: { id: true, passwordHash: true }
      });

      if (user.passwordHash) {
        if (!body.currentPassword) {
          return res.status(400).json({ message: 'Current password is required.' });
        }
        const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
        if (!valid) {
          return res.status(401).json({ message: 'Current password is incorrect.' });
        }
      }

      const passwordHash = await bcrypt.hash(body.newPassword, 10);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
      res.json({ message: 'Password saved.' });
    })
  );

  router.get(
    '/patient/daily-plans',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const plans = await prisma.patientDailyPlan.findMany({
        where: { userId: req.user!.id },
        include: dailyPlanInclude,
        orderBy: { planDate: 'desc' },
        take: 30
      });

      res.json({ plans: await Promise.all(plans.map(serializeDailyPlan)) });
    })
  );

  router.post(
    '/patient/daily-plans',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = dailyPlanCreateSchema.parse(req.body);
      const userId = req.user!.id;

      let plan;
      try {
        plan = await prisma.patientDailyPlan.create({
          data: {
            userId,
            planDate: parsePlanDate(body.planDate),
            title: body.title,
            focus: cleanText(body.focus),
            summary: cleanText(body.summary),
            tasks: {
              create: (body.tasks || []).map((task, index) => ({
                title: task.title,
                notes: cleanText(task.notes),
                sortOrder: task.sortOrder ?? index
              }))
            }
          },
          include: dailyPlanInclude
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return res.status(409).json({ message: 'You already have a daily plan for this date.' });
        }
        throw error;
      }

      res.status(201).json({ plan: await serializeDailyPlan(plan) });
    })
  );

  router.patch(
    '/patient/daily-plans/:planId',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const planId = routeParam(req, 'planId');
      const body = dailyPlanUpdateSchema.parse(req.body);
      const existing = await getOwnedDailyPlan(planId, req.user!.id);
      if (!existing) return res.status(404).json({ message: 'Daily plan not found.' });

      const plan = await prisma.patientDailyPlan.update({
        where: { id: planId },
        data: {
          title: body.title,
          focus: body.focus === undefined ? undefined : cleanText(body.focus),
          summary: body.summary === undefined ? undefined : cleanText(body.summary),
          reviewNote: body.reviewNote === undefined ? undefined : cleanText(body.reviewNote),
          reviewedAt: body.reviewed === undefined ? undefined : body.reviewed ? new Date() : null
        },
        include: dailyPlanInclude
      });

      res.json({ plan: await serializeDailyPlan(plan) });
    })
  );

  router.delete(
    '/patient/daily-plans/:planId',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const planId = routeParam(req, 'planId');
      const existing = await prisma.patientDailyPlan.findFirst({
        where: { id: planId, userId: req.user!.id },
        include: { images: true, tasks: { include: { images: true } } }
      });
      if (!existing) return res.status(404).json({ message: 'Daily plan not found.' });

      await prisma.patientDailyPlan.delete({ where: { id: planId } });
      await Promise.all(
        [...existing.images, ...existing.tasks.flatMap((task) => task.images)].map((image) =>
          deletePatientDailyPlanImage(image.storageKey)
        )
      );
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'daily_plan.delete',
        targetType: 'PatientDailyPlan',
        targetId: planId,
        summary: 'Daily plan and attached images removed.',
        metadata: {
          imageCount: existing.images.length + existing.tasks.flatMap((task) => task.images).length
        }
      });
      res.json({ message: 'Daily plan deleted.' });
    })
  );

  router.post(
    '/patient/daily-plans/:planId/tasks',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const planId = routeParam(req, 'planId');
      const body = taskInputSchema.parse(req.body);
      const existing = await getOwnedDailyPlan(planId, req.user!.id);
      if (!existing) return res.status(404).json({ message: 'Daily plan not found.' });

      const nextSortOrder = body.sortOrder ?? existing.tasks.length;
      await prisma.patientDailyPlanTask.create({
        data: {
          planId,
          title: body.title,
          notes: cleanText(body.notes),
          sortOrder: nextSortOrder
        }
      });

      const plan = await getOwnedDailyPlan(planId, req.user!.id);
      res.status(201).json({ plan: await serializeDailyPlan(plan!) });
    })
  );

  router.patch(
    '/patient/daily-plans/:planId/tasks/:taskId',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const planId = routeParam(req, 'planId');
      const taskId = routeParam(req, 'taskId');
      const body = dailyPlanTaskUpdateSchema.parse(req.body);
      const existing = await prisma.patientDailyPlanTask.findFirst({
        where: { id: taskId, plan: { id: planId, userId: req.user!.id } }
      });
      if (!existing) return res.status(404).json({ message: 'Daily plan task not found.' });

      await prisma.patientDailyPlanTask.update({
        where: { id: taskId },
        data: {
          title: body.title,
          notes: body.notes === undefined ? undefined : cleanText(body.notes),
          sortOrder: body.sortOrder,
          completed: body.completed,
          completedAt:
            body.completed === undefined
              ? undefined
              : body.completed
                ? existing.completedAt || new Date()
                : null,
          reviewTick: body.reviewTick,
          reviewNote: body.reviewNote === undefined ? undefined : cleanText(body.reviewNote)
        }
      });

      const plan = await getOwnedDailyPlan(planId, req.user!.id);
      res.json({ plan: await serializeDailyPlan(plan!) });
    })
  );

  router.delete(
    '/patient/daily-plans/:planId/tasks/:taskId',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const planId = routeParam(req, 'planId');
      const taskId = routeParam(req, 'taskId');
      const task = await prisma.patientDailyPlanTask.findFirst({
        where: { id: taskId, plan: { id: planId, userId: req.user!.id } },
        include: { images: true }
      });
      if (!task) return res.status(404).json({ message: 'Daily plan task not found.' });

      await prisma.patientDailyPlanImage.deleteMany({ where: { taskId } });
      await prisma.patientDailyPlanTask.delete({ where: { id: taskId } });
      await Promise.all(task.images.map((image) => deletePatientDailyPlanImage(image.storageKey)));
      const plan = await getOwnedDailyPlan(planId, req.user!.id);
      res.json({ plan: await serializeDailyPlan(plan!) });
    })
  );

  router.post(
    '/patient/daily-plans/:planId/images',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const planId = routeParam(req, 'planId');
      const plan = await getOwnedDailyPlan(planId, req.user!.id);
      if (!plan) return res.status(404).json({ message: 'Daily plan not found.' });

      try {
        const body = await parseDailyPlanImageUpload(req);
        if (body.taskId && !plan.tasks.some((task) => task.id === body.taskId)) {
          return res.status(400).json({ message: 'Selected task does not belong to this plan.' });
        }

        const saved = await savePatientDailyPlanImage({
          userId: req.user!.id,
          planId,
          mimeType: body.mimeType,
          fileName: body.fileName,
          data: body.data,
          taskId: body.taskId || null,
          uploadedById: req.user!.id
        });

        const image = await prisma.patientDailyPlanImage.create({
          data: {
            userId: req.user!.id,
            planId,
            taskId: body.taskId || null,
            storageKey: saved.storageKey,
            imageUrl: '',
            mimeType: saved.mimeType,
            fileName: body.fileName || null,
            byteSize: saved.byteSize,
            caption: cleanText(body.caption)
          }
        });
        await prisma.patientDailyPlanImage.update({
          where: { id: image.id },
          data: { imageUrl: patientDailyPlanImagePath(image.id) }
        });

        await writeAuditLog({
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'daily_plan_image.upload',
          targetType: 'PatientDailyPlanImage',
          targetId: image.id,
          summary: 'Daily plan image uploaded.',
          metadata: {
            planId,
            taskId: body.taskId || null,
            storageKey: saved.storageKey,
            byteSize: saved.byteSize,
            mimeType: saved.mimeType
          }
        });

        const updated = await getOwnedDailyPlan(planId, req.user!.id);
        res.status(201).json({ plan: await serializeDailyPlan(updated!) });
      } catch (error) {
        const mapped = mapImageUploadError(error);
        return res.status(mapped.status).json({ message: mapped.message });
      }
    })
  );

  router.get(
    '/patient/daily-plan-images/:imageId',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const imageId = routeParam(req, 'imageId');
      const image = await prisma.patientDailyPlanImage.findFirst({
        where: { id: imageId, userId: req.user!.id }
      });
      if (!image) return res.status(404).json({ message: 'Daily plan image not found.' });

      try {
        const buffer = await readPatientDailyPlanImage(image.storageKey);
        res.setHeader('Content-Type', image.mimeType);
        res.setHeader('Cache-Control', 'private, max-age=300');
        return res.send(buffer);
      } catch {
        return res.status(404).json({ message: 'Daily plan image not found.' });
      }
    })
  );

  router.delete(
    '/patient/daily-plans/:planId/images/:imageId',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const planId = routeParam(req, 'planId');
      const imageId = routeParam(req, 'imageId');
      const image = await prisma.patientDailyPlanImage.findFirst({
        where: { id: imageId, planId, userId: req.user!.id }
      });
      if (!image) return res.status(404).json({ message: 'Daily plan image not found.' });

      await prisma.patientDailyPlanImage.delete({ where: { id: imageId } });
      await deletePatientDailyPlanImage(image.storageKey);
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'daily_plan_image.delete',
        targetType: 'PatientDailyPlanImage',
        targetId: imageId,
        summary: 'Daily plan image removed.',
        metadata: { planId, storageKey: image.storageKey }
      });
      const plan = await getOwnedDailyPlan(planId, req.user!.id);
      res.json({ plan: await serializeDailyPlan(plan!) });
    })
  );

  router.post(
    '/patient/daily-plan-images/refresh',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const plans = await prisma.patientDailyPlan.findMany({
        where: { userId: req.user!.id },
        include: dailyPlanInclude,
        orderBy: { planDate: 'desc' },
        take: 30
      });
      res.json({ plans: await Promise.all(plans.map(serializeDailyPlan)) });
    })
  );

  router.put(
    '/patient/reminder-preferences',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = reminderPreferencesSchema.parse(req.body);

      await prisma.reminderPreference.upsert({
        where: { userId: req.user!.id },
        create: { userId: req.user!.id, ...body },
        update: body
      });

      res.json({ preferences: body, message: 'Reminder preferences saved.' });
    })
  );
}
