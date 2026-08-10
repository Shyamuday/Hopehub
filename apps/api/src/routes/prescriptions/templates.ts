import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { requireDoctorCapability } from '../../doctor-capabilities.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam } from '../../utils/helpers.js';
import { templateInputSchema } from './shared.js';

export function registerPrescriptionTemplateRoutes(router: Router) {
  // ─── Prescription templates ────────────────────────────────────────────────────

  router.get(
    '/doctor/prescription-templates',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'prescribe',
      'Prescription templates are available only for homeopathy providers.'
    ),
    asyncRoute(async (req, res) => {
      const templates = await prisma.prescriptionTemplate.findMany({
        where: { doctorId: req.user!.id },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { updatedAt: 'desc' }
      });
      res.json({ templates });
    })
  );

  router.post(
    '/doctor/prescription-templates',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'prescribe',
      'Prescription templates are available only for homeopathy providers.'
    ),
    asyncRoute(async (req, res) => {
      const body = templateInputSchema.parse(req.body);
      const template = await prisma.prescriptionTemplate.create({
        data: {
          doctorId: req.user!.id,
          name: body.name,
          diagnosis: body.diagnosis,
          advice: body.advice,
          notes: body.notes,
          items: {
            create: body.items.map((item, i) => ({ ...item, sortOrder: item.sortOrder ?? i }))
          }
        },
        include: { items: { orderBy: { sortOrder: 'asc' } } }
      });
      res.status(201).json({ template });
    })
  );

  router.put(
    '/doctor/prescription-templates/:id',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'prescribe',
      'Prescription templates are available only for homeopathy providers.'
    ),
    asyncRoute(async (req, res) => {
      const body = templateInputSchema.parse(req.body);
      const existing = await prisma.prescriptionTemplate.findUnique({
        where: { id: routeParam(req, 'id') }
      });
      if (!existing || existing.doctorId !== req.user!.id) {
        return res.status(404).json({ message: 'Template not found' });
      }

      await prisma.prescriptionTemplateItem.deleteMany({ where: { templateId: existing.id } });
      const template = await prisma.prescriptionTemplate.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          diagnosis: body.diagnosis,
          advice: body.advice,
          notes: body.notes,
          items: {
            create: body.items.map((item, i) => ({ ...item, sortOrder: item.sortOrder ?? i }))
          }
        },
        include: { items: { orderBy: { sortOrder: 'asc' } } }
      });
      res.json({ template });
    })
  );

  router.delete(
    '/doctor/prescription-templates/:id',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    requireDoctorCapability(
      'prescribe',
      'Prescription templates are available only for homeopathy providers.'
    ),
    asyncRoute(async (req, res) => {
      const existing = await prisma.prescriptionTemplate.findUnique({
        where: { id: routeParam(req, 'id') }
      });
      if (!existing || existing.doctorId !== req.user!.id) {
        return res.status(404).json({ message: 'Template not found' });
      }
      await prisma.prescriptionTemplate.delete({ where: { id: existing.id } });
      res.json({ ok: true });
    })
  );
}
