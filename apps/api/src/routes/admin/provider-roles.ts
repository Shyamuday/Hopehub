import { Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  invalidateProviderRoleCache,
  listProviderRoles,
  syncProviderRoleAssignments
} from '../../services/provider-taxonomy.service.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';

const roleCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z][A-Z0-9_]{2,63}$/);
const roleBodySchema = z.object({
  code: roleCodeSchema.optional(),
  domain: z.enum(['HOMEOPATHY', 'HOPE_HUB']).default('HOPE_HUB'),
  label: z.string().trim().min(2).max(100),
  shortLabel: z.string().trim().min(2).max(50),
  category: z.string().trim().min(2).max(50),
  tone: z.string().trim().min(2).max(30),
  description: z.string().trim().min(2).max(1000),
  scope: z.string().trim().min(2).max(1000),
  bestFor: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  notFor: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  ctaLabel: z.string().trim().min(2).max(80),
  requiresCredentials: z.boolean().default(false),
  requiresListenerScreening: z.boolean().default(false),
  isClinicalCare: z.boolean().default(false),
  supportedModes: z.array(z.enum(['CHAT', 'VOICE', 'VIDEO'])).min(1),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10_000).default(0)
});

export function registerAdminProviderRoleRoutes(router: Router) {
  router.get(
    '/admin/provider-roles',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const includeInactive = req.query.includeInactive === 'true';
      res.json({ roles: await listProviderRoles(includeInactive) });
    })
  );

  router.post(
    '/admin/provider-roles',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = roleBodySchema.extend({ code: roleCodeSchema }).parse(req.body);
      const role = await prisma.providerRoleDefinition.create({ data: body });
      invalidateProviderRoleCache();
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'provider_role.create',
        targetType: 'ProviderRoleDefinition',
        targetId: role.code,
        summary: `Created provider role ${role.label}.`,
        metadata: body
      });
      res.status(201).json({ role });
    })
  );

  router.patch(
    '/admin/provider-roles/:code',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const code = roleCodeSchema.parse(routeParam(req, 'code'));
      const body = roleBodySchema.partial().omit({ code: true }).parse(req.body);
      const before = await prisma.providerRoleDefinition.findUniqueOrThrow({ where: { code } });
      const role = await prisma.$transaction(async (tx) => {
        const updated = await tx.providerRoleDefinition.update({
          where: { code },
          data: { ...body, version: { increment: 1 } }
        });
        if (body.isActive === false) {
          await tx.providerRoleAssignment.updateMany({
            where: { roleCode: code },
            data: { status: 'INACTIVE', isPrimary: false }
          });
          await tx.careTeamService.updateMany({
            where: { providerRoleCode: code },
            data: { isActive: false }
          });
        }
        return updated;
      });
      invalidateProviderRoleCache();
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'provider_role.update',
        targetType: 'ProviderRoleDefinition',
        targetId: code,
        summary: `${role.label} updated (definition v${role.version}).`,
        metadata: {
          before: {
            ...before,
            createdAt: before.createdAt.toISOString(),
            updatedAt: before.updatedAt.toISOString()
          },
          changes: body
        }
      });
      res.json({ role });
    })
  );

  router.delete(
    '/admin/provider-roles/:code',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      res.status(409).json({
        message:
          'Provider role codes are permanent because historical sessions may reference them. Deactivate the role instead.'
      });
    })
  );

  router.patch(
    '/admin/doctors/:doctorId/provider-roles',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const requestedId = routeParam(req, 'doctorId');
      const body = z
        .object({
          roleCodes: z.array(roleCodeSchema).min(1),
          primaryRoleCode: roleCodeSchema
        })
        .parse(req.body);
      const doctor = await prisma.doctor.findFirst({
        where: { OR: [{ id: requestedId }, { userId: requestedId }] },
        select: { id: true }
      });
      if (!doctor) return res.status(404).json({ message: 'Provider not found.' });
      await syncProviderRoleAssignments({
        doctorId: doctor.id,
        roleCodes: body.roleCodes,
        primaryRoleCode: body.primaryRoleCode,
        actorId: req.user!.id
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'provider_role.assign',
        targetType: 'Doctor',
        targetId: doctor.id,
        summary: `Updated provider roles; primary role is ${body.primaryRoleCode}.`,
        metadata: body
      });
      const assignments = await prisma.providerRoleAssignment.findMany({
        where: { doctorId: doctor.id },
        include: { role: true },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }]
      });
      res.json({ assignments });
    })
  );

  router.patch(
    '/admin/doctors/:doctorId/provider-roles/:roleCode',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const requestedId = routeParam(req, 'doctorId');
      const roleCode = roleCodeSchema.parse(routeParam(req, 'roleCode'));
      const body = z
        .object({
          status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
          credentialStatus: z
            .enum(['NOT_REQUIRED', 'PENDING', 'VERIFIED', 'EXPIRED', 'REJECTED'])
            .optional(),
          isPrimary: z.boolean().optional()
        })
        .parse(req.body);
      const doctor = await prisma.doctor.findFirst({
        where: { OR: [{ id: requestedId }, { userId: requestedId }] },
        select: { id: true }
      });
      if (!doctor) return res.status(404).json({ message: 'Provider not found.' });

      const assignment = await prisma.$transaction(async (tx) => {
        if (body.isPrimary) {
          await tx.providerRoleAssignment.updateMany({
            where: { doctorId: doctor.id },
            data: { isPrimary: false }
          });
        }
        return tx.providerRoleAssignment.update({
          where: { doctorId_roleCode: { doctorId: doctor.id, roleCode } },
          data: {
            ...body,
            verifiedAt: body.credentialStatus === 'VERIFIED' ? new Date() : undefined,
            verifiedById: body.credentialStatus === 'VERIFIED' ? req.user!.id : undefined
          },
          include: { role: true }
        });
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'provider_role.assignment_update',
        targetType: 'ProviderRoleAssignment',
        targetId: assignment.id,
        summary: `Updated ${roleCode} assignment for provider ${doctor.id}.`,
        metadata: body
      });
      res.json({ assignment });
    })
  );
}
