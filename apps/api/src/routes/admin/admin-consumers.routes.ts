import type express from 'express';
import { DoseEventStatus, Role } from '@prisma/client';
import { allowRoles, authRequired } from '../../auth.js';
import { hydrateConsultationsAttachments } from '../../consultation-attachments.js';
import { prisma } from '../../db.js';
import { includeConsultationRelations, publicUserSelect } from '../../db/prisma-includes.js';
import { asyncRoute } from '../../middleware/async-route.js';
import { queryPositiveInt, queryText, routeParam } from '../../lib/http-params.js';
import { apiPublicBaseUrl } from '../../server/config.js';
import { PERMISSIONS, requirePermissions } from '../../staff-permissions.js';

export function registerAdminConsumerRoutes(app: express.Application) {
  app.get(
    '/admin/consumers',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.CONSUMERS_READ),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 10);
      const query = queryText(req, 'q').trim().toLowerCase();
      const sortBy = queryText(req, 'sortBy');
      const sortDirection = queryText(req, 'sortDirection').toLowerCase() === 'asc' ? 'asc' : 'desc';

      const consultations = await prisma.consultation.findMany({
        select: {
          patient: { select: publicUserSelect }
        }
      });

      const grouped = new Map<
        string,
        { id: string; name: string; email: string; mobile: string; consultations: number }
      >();
      for (const row of consultations) {
        const patient = row.patient;
        if (!patient?.id) {
          continue;
        }

        const existing = grouped.get(patient.id);
        if (existing) {
          existing.consultations += 1;
          continue;
        }

        grouped.set(patient.id, {
          id: patient.id,
          name: patient.name || 'Unknown',
          email: patient.email || '',
          mobile: patient.mobile || '',
          consultations: 1
        });
      }

      const filtered = Array.from(grouped.values()).filter((consumer) => {
        if (!query) {
          return true;
        }

        return [consumer.name, consumer.email, consumer.mobile].join(' ').toLowerCase().includes(query);
      });

      filtered.sort((a, b) => {
        if (sortBy === 'name') {
          const compare = a.name.localeCompare(b.name);
          return sortDirection === 'asc' ? compare : -compare;
        }

        const compare = a.consultations - b.consultations;
        return sortDirection === 'asc' ? compare : -compare;
      });

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const consumers = filtered.slice(start, start + pageSize);

      res.json({
        consumers,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    })
  );

  app.get(
    '/admin/consumers/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.CONSUMERS_READ),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'id');
      const patient = await prisma.user.findFirst({
        where: { id: patientId, role: Role.PATIENT },
        select: {
          ...publicUserSelect,
          deliveryAddressLine1: true,
          deliveryAddressLine2: true,
          deliveryCity: true,
          deliveryState: true,
          deliveryPincode: true
        }
      });

      if (!patient) {
        return res.status(404).json({ message: 'Consumer not found' });
      }

      const consultations = await prisma.consultation.findMany({
        where: { patientId },
        include: includeConsultationRelations(),
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      const [totalDoseEvents, takenDoseEvents, skippedDoseEvents, missedDoseEvents] = await Promise.all([
        prisma.medicineDoseEvent.count({ where: { patientId } }),
        prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.TAKEN } }),
        prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.SKIPPED } }),
        prisma.medicineDoseEvent.count({ where: { patientId, status: DoseEventStatus.MISSED } })
      ]);

      const adherencePercent = totalDoseEvents
        ? Math.round((takenDoseEvents / totalDoseEvents) * 100)
        : 0;
      res.json({
        consumer: patient,
        consultations: await hydrateConsultationsAttachments(consultations, apiPublicBaseUrl()),
        adherence: {
          total: totalDoseEvents,
          taken: takenDoseEvents,
          skipped: skippedDoseEvents,
          missed: missedDoseEvents,
          percent: adherencePercent
        }
      });
    })
  );
}
