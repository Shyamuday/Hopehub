import { Router } from 'express';
import { Role, DoseEventStatus } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, queryText, queryPositiveInt, publicUserSelect, patientProfileSelect, includeConsultationRelations } from '../../utils/helpers.js';

export function registerAdminConsumerRoutes(router: Router) {
  // ─── Consumers ────────────────────────────────────────────────────────────────

  router.get(
    '/admin/consumers',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 10);
      const query = queryText(req, 'q').trim().toLowerCase();
      const sortBy = queryText(req, 'sortBy');
      const sortDirection = queryText(req, 'sortDirection').toLowerCase() === 'asc' ? 'asc' : 'desc';

      const consultations = await prisma.consultation.findMany({ select: { patient: { select: publicUserSelect } } });

      const grouped = new Map<string, { id: string; name: string; email: string; mobile: string; patientCode: string; consultations: number }>();
      for (const row of consultations) {
        const patient = row.patient;
        if (!patient?.id) continue;
        const existing = grouped.get(patient.id);
        if (existing) { existing.consultations += 1; continue; }
        grouped.set(patient.id, { id: patient.id, name: patient.name || 'Unknown', email: patient.email || '', mobile: patient.mobile || '', patientCode: patient.patientCode || '', consultations: 1 });
      }

      const filtered = Array.from(grouped.values()).filter((c) =>
        !query || [c.name, c.email, c.mobile, c.patientCode, c.id].join(' ').toLowerCase().includes(query)
      );

      filtered.sort((a, b) => {
        if (sortBy === 'name') {
          const cmp = a.name.localeCompare(b.name);
          return sortDirection === 'asc' ? cmp : -cmp;
        }
        if (sortBy === 'consultations') {
          return sortDirection === 'asc' ? a.consultations - b.consultations : b.consultations - a.consultations;
        }
        return 0;
      });

      const total = filtered.length;
      const items = filtered.slice((page - 1) * pageSize, page * pageSize);
      res.json({ consumers: items, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
    })
  );

  router.get(
    '/admin/consumers/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'id');
      const patient = await prisma.user.findFirst({
        where: { id: patientId, role: Role.PATIENT },
        select: patientProfileSelect
      });
      if (!patient) return res.status(404).json({ message: 'Consumer not found' });

      const consultations = await prisma.consultation.findMany({
        where: { patientId },
        include: includeConsultationRelations(),
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      const [totalDoses, takenDoses, skippedDoses, missedDoses] = await Promise.all([
        prisma.medicineDoseEvent.count({ where: { patientId } }),
        prisma.medicineDoseEvent.count({ where: { patientId, status: 'TAKEN' } }),
        prisma.medicineDoseEvent.count({ where: { patientId, status: 'SKIPPED' } }),
        prisma.medicineDoseEvent.count({ where: { patientId, status: 'MISSED' } })
      ]);

      const adherencePercent = totalDoses ? Math.round((takenDoses / totalDoses) * 100) : 0;

      const since = new Date();
      since.setDate(since.getDate() - 7);
      since.setHours(0, 0, 0, 0);

      const doseNotes = await prisma.medicineDoseEvent.findMany({
        where: {
          patientId,
          status: { in: [DoseEventStatus.SKIPPED, DoseEventStatus.MISSED] },
          scheduledFor: { gte: since }
        },
        select: {
          id: true,
          status: true,
          scheduledFor: true,
          skippedAt: true,
          updatedAt: true,
          note: true,
          prescriptionItem: { select: { medicineName: true } }
        },
        orderBy: { scheduledFor: 'desc' },
        take: 20
      });

      res.json({
        consumer: patient,
        consultations,
        adherence: { total: totalDoses, taken: takenDoses, skipped: skippedDoses, missed: missedDoses, percent: adherencePercent },
        doseNotes: doseNotes.map((event) => ({
          id: event.id,
          status: event.status,
          scheduledFor: event.scheduledFor,
          interactedAt: event.skippedAt ?? (event.status === DoseEventStatus.MISSED ? event.updatedAt : null),
          note: event.note ?? null,
          medicineName: event.prescriptionItem.medicineName
        }))
      });
    })
  );
}
