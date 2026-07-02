import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import type { Server as SocketIoServer } from 'socket.io';
import bcrypt from 'bcryptjs';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { PaymentStatus } from '@prisma/client';
import {
  asyncRoute,
  routeParam,
  queryText,
  queryPositiveInt,
  publicUserSelect,
  writeAuditLog,
  includeConsultationRelations
} from '../utils/helpers.js';
import { enabledNotificationChannels, notificationService } from '../services/notification-service.js';

export function createAdminRouter(io: SocketIoServer) {
  const router = Router();

  // ─── Doctors ──────────────────────────────────────────────────────────────────

  router.get(
    '/admin/doctors',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 10);
      const query = queryText(req, 'q').trim();
      const status = queryText(req, 'status').toUpperCase();
      const sortBy = queryText(req, 'sortBy');
      const sortDirection = queryText(req, 'sortDirection').toLowerCase() === 'asc' ? 'asc' : 'desc';

      const where = {
        role: Role.DOCTOR,
        ...(status === 'ACTIVE' ? { isActive: true } : {}),
        ...(status === 'INACTIVE' ? { isActive: false } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' as const } },
                { email: { contains: query, mode: 'insensitive' as const } },
                { mobile: { contains: query, mode: 'insensitive' as const } },
                { doctorProfile: { specialty: { contains: query, mode: 'insensitive' as const } } }
              ]
            }
          : {})
      };

      const orderBy =
        sortBy === 'name'
          ? ({ name: sortDirection } as const)
          : sortBy === 'status'
            ? ({ isActive: sortDirection } as const)
            : ({ createdAt: sortDirection } as const);

      const total = await prisma.user.count({ where });
      const doctors = await prisma.user.findMany({
        where,
        select: { ...publicUserSelect, isActive: true, createdAt: true, doctorProfile: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      res.json({ doctors, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
    })
  );

  router.get(
    '/admin/doctors/pending',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 10);
      const query = queryText(req, 'q').trim();

      const where = {
        role: Role.DOCTOR,
        isActive: false,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' as const } },
                { email: { contains: query, mode: 'insensitive' as const } },
                { mobile: { contains: query, mode: 'insensitive' as const } },
                { doctorProfile: { specialty: { contains: query, mode: 'insensitive' as const } } }
              ]
            }
          : {})
      };

      const total = await prisma.user.count({ where });
      const pendingDoctors = await prisma.user.findMany({
        where,
        select: { ...publicUserSelect, isActive: true, createdAt: true, doctorProfile: true },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      res.json({ pendingDoctors, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
    })
  );

  router.post(
    '/admin/doctors/:id/approve',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const doctor = await prisma.user.update({
        where: { id: doctorId },
        data: { isActive: true },
        select: { ...publicUserSelect, isActive: true, doctorProfile: true }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.approve',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Doctor approved by admin.'
      });
      res.json({ doctor, message: 'Doctor approved successfully.' });
    })
  );

  router.post(
    '/admin/doctors/:id/reject',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const doctor = await prisma.user.update({
        where: { id: doctorId },
        data: { isActive: false },
        select: { ...publicUserSelect, isActive: true, doctorProfile: true }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.reject',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Doctor rejected by admin.'
      });
      res.json({ doctor, message: 'Doctor rejected.' });
    })
  );

  router.put(
    '/admin/doctors/:id/status',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const body = z.object({ isActive: z.boolean() }).parse(req.body);
      const doctor = await prisma.user.update({
        where: { id: doctorId },
        data: { isActive: body.isActive },
        select: { ...publicUserSelect, isActive: true, doctorProfile: true }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.status_change',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: body.isActive ? 'Doctor activated by admin.' : 'Doctor deactivated by admin.'
      });
      res.json({ doctor, message: body.isActive ? 'Doctor activated successfully.' : 'Doctor deactivated successfully.' });
    })
  );

  router.post(
    '/admin/doctors',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email(),
          mobile: z.string().min(8).optional(),
          password: z.string().min(8),
          specialty: z.string().min(2),
          registrationNo: z.string().optional()
        })
        .parse(req.body);

      const passwordHash = await bcrypt.hash(body.password, 10);
      const doctor = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          mobile: body.mobile,
          passwordHash,
          role: Role.DOCTOR,
          doctorProfile: { create: { specialty: body.specialty, registrationNo: body.registrationNo } }
        },
        select: { ...publicUserSelect, doctorProfile: true }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.create',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Doctor account created by admin.',
        metadata: { specialty: body.specialty }
      });
      res.status(201).json({ doctor });
    })
  );

  router.put(
    '/admin/doctors/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const doctorId = routeParam(req, 'id');
      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email(),
          mobile: z.string().min(8).optional().or(z.literal('')),
          specialty: z.string().min(2),
          registrationNo: z.string().optional().or(z.literal('')),
          isAvailable: z.boolean().optional().default(true)
        })
        .parse(req.body);

      const existing = await prisma.user.findFirst({ where: { id: doctorId, role: Role.DOCTOR }, select: { id: true } });
      if (!existing) return res.status(404).json({ message: 'Doctor not found' });

      const doctor = await prisma.user.update({
        where: { id: doctorId },
        data: {
          name: body.name,
          email: body.email,
          mobile: body.mobile || null,
          doctorProfile: {
            upsert: {
              create: { specialty: body.specialty, registrationNo: body.registrationNo || null, isAvailable: body.isAvailable },
              update: { specialty: body.specialty, registrationNo: body.registrationNo || null, isAvailable: body.isAvailable }
            }
          }
        },
        select: { ...publicUserSelect, isActive: true, doctorProfile: true }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'doctor.update',
        targetType: 'doctor',
        targetId: doctor.id,
        summary: 'Doctor profile updated by admin.',
        metadata: { isAvailable: body.isAvailable, specialty: body.specialty }
      });
      res.json({ doctor, message: 'Doctor profile updated successfully.' });
    })
  );

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

      const grouped = new Map<string, { id: string; name: string; email: string; mobile: string; consultations: number }>();
      for (const row of consultations) {
        const patient = row.patient;
        if (!patient?.id) continue;
        const existing = grouped.get(patient.id);
        if (existing) { existing.consultations += 1; continue; }
        grouped.set(patient.id, { id: patient.id, name: patient.name || 'Unknown', email: patient.email || '', mobile: patient.mobile || '', consultations: 1 });
      }

      const filtered = Array.from(grouped.values()).filter((c) =>
        !query || [c.name, c.email, c.mobile].join(' ').toLowerCase().includes(query)
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
      const patient = await prisma.user.findFirst({ where: { id: patientId, role: Role.PATIENT }, select: publicUserSelect });
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
      res.json({
        consumer: patient,
        consultations,
        adherence: { total: totalDoses, taken: takenDoses, skipped: skippedDoses, missed: missedDoses, percent: adherencePercent }
      });
    })
  );

  // ─── Audit logs ───────────────────────────────────────────────────────────────

  router.get(
    '/admin/audit-logs',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20);
      const total = await prisma.auditLog.count();
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });
      res.json({ logs, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
    })
  );

  // ─── Admin consultations ───────────────────────────────────────────────────────

  router.get(
    '/admin/consultations',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 20);
      const status = queryText(req, 'status');
      const assigned = queryText(req, 'assigned');
      const q = queryText(req, 'q').trim().toLowerCase();

      const where: Record<string, unknown> = {};
      if (status) where['status'] = status;
      if (assigned === 'no') where['assignedDoctorId'] = null;
      if (assigned === 'yes') where['assignedDoctorId'] = { not: null };

      const [consultations, total] = await Promise.all([
        prisma.consultation.findMany({
          where,
          include: {
            patient: { select: { id: true, name: true, mobile: true } },
            assignedDoctor: { select: { id: true, name: true } },
            disease: { select: { id: true, name: true } },
            payment: { select: { status: true, amountInPaise: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.consultation.count({ where })
      ]);

      const filtered = q
        ? consultations.filter((c) => {
            const text = [c.patient?.name, c.patient?.mobile, c.disease?.name].join(' ').toLowerCase();
            return text.includes(q);
          })
        : consultations;

      res.json({ consultations: filtered, total, page, pageSize });
    })
  );

  router.put(
    '/admin/consultations/:id/assign',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z.object({ doctorId: z.string().min(1) }).parse(req.body);
      const doctor = await prisma.user.findFirstOrThrow({
        where: { id: body.doctorId, role: Role.DOCTOR, isActive: true }
      });

      const consultation = await prisma.consultation.update({
        where: { id: routeParam(req, 'id') },
        data: { assignedDoctorId: doctor.id, status: 'ASSIGNED' as const },
        include: {
          patient: { select: { id: true, name: true, mobile: true, email: true } },
          disease: { select: { name: true } }
        }
      });

      const patient = consultation.patient;
      if (patient) {
        void notificationService.sendBatch(
          enabledNotificationChannels.map((ch) => ({
            eventType: 'DOCTOR_ASSIGNED' as const,
            channel: ch,
            recipientId: patient.id,
            recipientName: patient.name,
            recipientMobile: patient.mobile,
            recipientEmail: patient.email,
            title: 'Doctor assigned — Vitalis Care',
            body: `Dr. ${doctor.name} has been assigned to your consultation. You can now chat with your doctor in the app.`
          }))
        );
        io.to(`user:${patient.id}`).emit('consultation:updated', { consultationId: consultation.id, status: consultation.status });
      }

      res.json({ consultation, message: 'Doctor assigned successfully.' });
    })
  );

  // ─── Payments ─────────────────────────────────────────────────────────────────

  router.get(
    '/admin/payments',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1, 1, 1000);
      const pageSize = queryPositiveInt(req, 'pageSize', 20, 1, 100);
      const status = queryText(req, 'status').toUpperCase();
      const from = queryText(req, 'from');
      const to = queryText(req, 'to');
      const exportType = queryText(req, 'export').toLowerCase();

      const where = {
        ...(status === 'PAID' || status === 'FAILED' || status === 'CREATED' ? { status: status as PaymentStatus } : {}),
        ...(from || to
          ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {})
      };

      const [total, payments] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.findMany({
          where,
          include: {
            consultation: {
              select: {
                id: true,
                status: true,
                patient: { select: { id: true, name: true } },
                assignedDoctor: { select: { id: true, name: true } },
                disease: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ]);

      if (exportType === 'csv') {
        const lines = [
          'paymentId,consultationId,patientName,doctorName,disease,billingPlanCode,amountInPaise,status,providerOrderId,providerPaymentId,createdAt'
        ];
        for (const payment of payments) {
          lines.push(
            [
              payment.id,
              payment.consultationId,
              payment.consultation.patient?.name || '',
              payment.consultation.assignedDoctor?.name || '',
              payment.consultation.disease?.name || '',
              payment.billingPlanCode || '',
              String(payment.amountInPaise),
              payment.status,
              payment.providerOrderId || '',
              payment.providerPaymentId || '',
              payment.createdAt.toISOString()
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(',')
          );
        }
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="payments-${Date.now()}.csv"`);
        return res.send(lines.join('\n'));
      }

      res.json({ payments, total, page, pageSize });
    })
  );

  // ─── Reports ──────────────────────────────────────────────────────────────────

  router.get(
    '/admin/reports',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (_req, res) => {
      const [consultations, revenue, doctors] = await Promise.all([
        prisma.consultation.groupBy({ by: ['status'], _count: true }),
        prisma.payment.aggregate({ where: { status: PaymentStatus.PAID }, _sum: { amountInPaise: true } }),
        prisma.user.count({ where: { role: Role.DOCTOR, isActive: true } })
      ]);
      res.json({ revenueInPaise: revenue._sum.amountInPaise || 0, activeDoctors: doctors, consultations });
    })
  );

  return router;
}
