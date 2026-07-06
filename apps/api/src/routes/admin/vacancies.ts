import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';

const vacancySchema = z.object({
  title: z.string().min(2).max(120),
  department: z.string().min(1).max(80),
  jobType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']).default('FULL_TIME'),
  locationType: z.enum(['REMOTE', 'ON_SITE', 'HYBRID']).default('ON_SITE'),
  location: z.string().max(120).optional(),
  description: z.string().min(10),
  requirements: z.array(z.string().min(1)).default([]),
  responsibilities: z.array(z.string().min(1)).default([]),
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED']).default('DRAFT'),
  isUrgent: z.boolean().default(false),
  deadline: z.string().datetime({ offset: true }).optional().nullable(),
  salaryRange: z.string().max(80).optional().nullable()
});

export function registerAdminVacancyRoutes(router: Router) {
  router.get(
    '/admin/vacancies',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const { status, department } = req.query as { status?: string; department?: string };

      const vacancies = await prisma.jobVacancy.findMany({
        where: {
          ...(status ? { status: status as any } : {}),
          ...(department ? { department } : {})
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
      });

      const counts = await prisma.jobVacancy.groupBy({
        by: ['status'],
        _count: { id: true }
      });

      const summary = { DRAFT: 0, OPEN: 0, CLOSED: 0 };
      for (const row of counts) {
        summary[row.status as keyof typeof summary] = row._count.id;
      }

      res.json({ vacancies, summary });
    })
  );

  router.post(
    '/admin/vacancies',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = vacancySchema.parse(req.body);

      const vacancy = await prisma.jobVacancy.create({
        data: {
          title: body.title.trim(),
          department: body.department.trim(),
          jobType: body.jobType,
          locationType: body.locationType,
          location: body.location?.trim() || null,
          description: body.description.trim(),
          requirements: body.requirements.map((r) => r.trim()).filter(Boolean),
          responsibilities: body.responsibilities.map((r) => r.trim()).filter(Boolean),
          status: body.status,
          isUrgent: body.isUrgent,
          deadline: body.deadline ? new Date(body.deadline) : null,
          salaryRange: body.salaryRange?.trim() || null,
          createdById: req.user?.id || null
        }
      });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'VACANCY_CREATED',
        targetType: 'JobVacancy',
        targetId: vacancy.id,
        summary: `Created vacancy: ${vacancy.title} (${vacancy.department})`
      });

      res.status(201).json({ vacancy });
    })
  );

  router.patch(
    '/admin/vacancies/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = vacancySchema.partial().parse(req.body);

      const vacancy = await prisma.jobVacancy.update({
        where: { id },
        data: {
          ...(body.title !== undefined ? { title: body.title.trim() } : {}),
          ...(body.department !== undefined ? { department: body.department.trim() } : {}),
          ...(body.jobType !== undefined ? { jobType: body.jobType } : {}),
          ...(body.locationType !== undefined ? { locationType: body.locationType } : {}),
          ...(body.location !== undefined ? { location: body.location?.trim() || null } : {}),
          ...(body.description !== undefined ? { description: body.description.trim() } : {}),
          ...(body.requirements !== undefined ? { requirements: body.requirements.map((r) => r.trim()).filter(Boolean) } : {}),
          ...(body.responsibilities !== undefined ? { responsibilities: body.responsibilities.map((r) => r.trim()).filter(Boolean) } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.isUrgent !== undefined ? { isUrgent: body.isUrgent } : {}),
          ...(body.deadline !== undefined ? { deadline: body.deadline ? new Date(body.deadline) : null } : {}),
          ...(body.salaryRange !== undefined ? { salaryRange: body.salaryRange?.trim() || null } : {})
        }
      });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'VACANCY_UPDATED',
        targetType: 'JobVacancy',
        targetId: vacancy.id,
        summary: `Updated vacancy: ${vacancy.title}`
      });

      res.json({ vacancy });
    })
  );

  router.delete(
    '/admin/vacancies/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');

      const vacancy = await prisma.jobVacancy.update({
        where: { id },
        data: { status: 'CLOSED' }
      });

      await writeAuditLog({
        actorId: req.user?.id,
        actorRole: req.user?.role,
        action: 'VACANCY_CLOSED',
        targetType: 'JobVacancy',
        targetId: vacancy.id,
        summary: `Closed vacancy: ${vacancy.title}`
      });

      res.json({ vacancy });
    })
  );
}
