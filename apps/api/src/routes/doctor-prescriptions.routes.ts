import type express from 'express';
import {
  ConsultationStatus,
  PaymentStatus,
  PrescriptionOptionType,
  PrescriptionStatus,
  Role
} from '@prisma/client';
import { z } from 'zod';
import { allowRoles, authRequired } from '../auth.js';
import { prisma } from '../db.js';
import { includePrescriptionRelations } from '../db/prisma-includes.js';
import { normalizeOptionLabel, buildDoseScheduleEvents } from '../domain/prescription-scheduling.js';
import { asyncRoute } from '../middleware/async-route.js';
import { routeParam } from '../lib/http-params.js';
import { enabledNotificationChannels, notificationService } from '../server/config.js';

const templateItemSchema = z.object({
  medicineName: z.string().min(1),
  strength: z.string().optional(),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  instructions: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0)
});

const templateInputSchema = z.object({
  name: z.string().min(1).max(120),
  diagnosis: z.string().max(500).default(''),
  advice: z.string().max(2000).optional(),
  notes: z.string().max(2000).default(''),
  items: z.array(templateItemSchema).min(1)
});

const prescriptionItemInputSchema = z.object({
  medicineName: z.string().min(2),
  strength: z.string().min(1).optional(),
  dose: z.string().min(1).optional(),
  frequency: z.string().min(1).optional(),
  duration: z.string().min(1).optional(),
  instructions: z.string().min(1).optional(),
  durationDays: z.number().int().min(1).max(120).optional(),
  intakeTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1).max(6).optional()
});

const prescriptionInputSchema = z.object({
  methodOptionId: z.string().min(1),
  diagnosedDiseaseOptionId: z.string().min(1),
  diagnosis: z.string().min(3),
  advice: z.string().min(3).optional(),
  notes: z.string().min(5),
  methodIntakeAnswers: z.record(z.string(), z.string()).optional(),
  fileUrl: z.string().url().optional().or(z.literal('')),
  followUpDate: z.coerce.date().optional(),
  status: z.nativeEnum(PrescriptionStatus).default(PrescriptionStatus.DRAFT),
  items: z.array(prescriptionItemInputSchema).min(1)
});

export function registerDoctorPrescriptionRoutes(app: express.Application) {
  app.post(
    '/doctor/prescription-options',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          type: z.nativeEnum(PrescriptionOptionType),
          label: z.string().min(2)
        })
        .parse(req.body);

      const normalizedLabel = normalizeOptionLabel(body.label);

      const option = await prisma.prescriptionOption.upsert({
        where: {
          type_normalizedLabel: {
            type: body.type,
            normalizedLabel
          }
        },
        update: {
          label: body.label.trim()
        },
        create: {
          type: body.type,
          label: body.label.trim(),
          normalizedLabel,
          isSystem: false,
          createdById: req.user!.id
        }
      });

      res.status(201).json({ option });
    })
  );

  app.get(
    '/doctor/prescription-options',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const query = z
        .object({
          type: z.nativeEnum(PrescriptionOptionType)
        })
        .parse(req.query);

      const options = await prisma.prescriptionOption.findMany({
        where: { type: query.type },
        orderBy: [{ isSystem: 'desc' }, { label: 'asc' }]
      });

      res.json({ options });
    })
  );

  app.get(
    '/doctor/prescription-templates',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const templates = await prisma.prescriptionTemplate.findMany({
        where: { doctorId: req.user!.id },
        include: { items: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { updatedAt: 'desc' }
      });
      res.json({ templates });
    })
  );

  app.post(
    '/doctor/prescription-templates',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
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

  app.put(
    '/doctor/prescription-templates/:id',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = templateInputSchema.parse(req.body);
      const existing = await prisma.prescriptionTemplate.findUnique({ where: { id: routeParam(req, 'id') } });
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

  app.delete(
    '/doctor/prescription-templates/:id',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const existing = await prisma.prescriptionTemplate.findUnique({ where: { id: routeParam(req, 'id') } });
      if (!existing || existing.doctorId !== req.user!.id) {
        return res.status(404).json({ message: 'Template not found' });
      }
      await prisma.prescriptionTemplate.delete({ where: { id: existing.id } });
      res.json({ ok: true });
    })
  );

  app.get(
    '/doctor/appointments/:id/prescriptions',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const consultation = await prisma.consultation.findUnique({
        where: { id: routeParam(req, 'id') },
        select: { id: true, assignedDoctorId: true, status: true }
      });

      if (!consultation) {
        return res.status(404).json({ message: 'Consultation not found' });
      }

      if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const prescriptions = await prisma.prescription.findMany({
        where: { consultationId: consultation.id },
        include: includePrescriptionRelations(),
        orderBy: { version: 'desc' }
      });

      res.json({ prescriptions, consultation: { status: consultation.status } });
    })
  );

  app.post(
    '/doctor/appointments/:id/prescriptions',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = prescriptionInputSchema.parse(req.body);

      const consultation = await prisma.consultation.findUniqueOrThrow({ where: { id: routeParam(req, 'id') } });
      if (req.user!.role === Role.DOCTOR && consultation.assignedDoctorId !== req.user!.id) {
        return res.status(403).json({ message: 'Only the assigned doctor can manage prescription' });
      }

      const [methodOption, diagnosedDiseaseOption] = await Promise.all([
        prisma.prescriptionOption.findFirst({
          where: { id: body.methodOptionId, type: PrescriptionOptionType.METHOD }
        }),
        prisma.prescriptionOption.findFirst({
          where: { id: body.diagnosedDiseaseOptionId, type: PrescriptionOptionType.DIAGNOSED_DISEASE }
        })
      ]);

      if (!methodOption || !diagnosedDiseaseOption) {
        return res.status(400).json({ message: 'Invalid prescription method or diagnosed disease option.' });
      }

      const prescription = await prisma.$transaction(async (tx) => {
        const previous = await tx.prescription.findFirst({
          where: { consultationId: consultation.id },
          orderBy: { version: 'desc' }
        });

        const nextVersion = (previous?.version || 0) + 1;
        await tx.prescription.updateMany({
          where: { consultationId: consultation.id, isLatest: true },
          data: { isLatest: false }
        });

        const created = await tx.prescription.create({
          data: {
            consultationId: consultation.id,
            uploadedById: req.user!.id,
            patientId: consultation.patientId,
            version: nextVersion,
            isLatest: true,
            methodOptionId: methodOption.id,
            diagnosedDiseaseOptionId: diagnosedDiseaseOption.id,
            diagnosis: body.diagnosis,
            advice: body.advice || null,
            notes: body.notes,
            methodIntakeAnswers: body.methodIntakeAnswers ?? undefined,
            fileUrl: body.fileUrl || null,
            followUpDate: body.followUpDate || null,
            status: body.status
          }
        });

        const createdItems = [];
        for (const [index, item] of body.items.entries()) {
          const createdItem = await tx.prescriptionItem.create({
            data: {
              prescriptionId: created.id,
              medicineName: item.medicineName,
              strength: item.strength,
              dose: item.dose,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.instructions,
              durationDays: item.durationDays,
              intakeTimes: item.intakeTimes,
              sortOrder: index
            }
          });

          createdItems.push(createdItem);
        }

        if (body.status === PrescriptionStatus.PUBLISHED) {
          const scheduleEvents = buildDoseScheduleEvents({
            patientId: consultation.patientId,
            prescriptionId: created.id,
            prescriptionItems: createdItems
          });

          if (scheduleEvents.length) {
            await tx.medicineDoseEvent.createMany({
              data: scheduleEvents
            });
          }
        }

        return tx.prescription.findUniqueOrThrow({
          where: { id: created.id },
          include: includePrescriptionRelations()
        });
      });

      await prisma.consultation.update({
        where: { id: consultation.id },
        data: {
          status:
            body.status === PrescriptionStatus.PUBLISHED
              ? ConsultationStatus.PRESCRIPTION_UPLOADED
              : consultation.status
        }
      });

      if (body.status === PrescriptionStatus.PUBLISHED) {
        const rxPatient = (prescription as { patient?: { id: string; name: string; mobile: string | null; email: string | null } }).patient;
        if (rxPatient) {
          void notificationService.sendBatch(
            enabledNotificationChannels.map((ch) => ({
              eventType: 'PRESCRIPTION_READY' as const,
              channel: ch,
              recipientId: rxPatient.id,
              recipientName: rxPatient.name,
              recipientMobile: rxPatient.mobile,
              recipientEmail: rxPatient.email,
              title: 'Your prescription is ready — Vitalis Care',
              body: `Your doctor has published a new prescription. Open the app to view your medicines and dosage schedule.`
            }))
          );
        }
      }

      res.status(201).json({ prescription });
    })
  );

  app.put(
    '/doctor/prescriptions/:id',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = prescriptionInputSchema.parse(req.body);
      const prescription = await prisma.prescription.findUnique({
        where: { id: routeParam(req, 'id') },
        include: { consultation: { select: { assignedDoctorId: true } } }
      });

      if (!prescription) {
        return res.status(404).json({ message: 'Prescription not found' });
      }

      if (!prescription.isLatest) {
        return res.status(400).json({ message: 'Only the latest version can be edited.' });
      }

      if (prescription.status === PrescriptionStatus.PUBLISHED) {
        return res.status(400).json({ message: 'Published prescriptions cannot be edited. Create follow-up version.' });
      }

      if (req.user!.role === Role.DOCTOR && prescription.consultation.assignedDoctorId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const [methodOption, diagnosedDiseaseOption] = await Promise.all([
        prisma.prescriptionOption.findFirst({
          where: { id: body.methodOptionId, type: PrescriptionOptionType.METHOD }
        }),
        prisma.prescriptionOption.findFirst({
          where: { id: body.diagnosedDiseaseOptionId, type: PrescriptionOptionType.DIAGNOSED_DISEASE }
        })
      ]);

      if (!methodOption || !diagnosedDiseaseOption) {
        return res.status(400).json({ message: 'Invalid prescription method or diagnosed disease option.' });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedPrescription = await tx.prescription.update({
          where: { id: prescription.id },
          data: {
            methodOptionId: methodOption.id,
            diagnosedDiseaseOptionId: diagnosedDiseaseOption.id,
            diagnosis: body.diagnosis,
            advice: body.advice || null,
            notes: body.notes,
            methodIntakeAnswers: body.methodIntakeAnswers ?? undefined,
            fileUrl: body.fileUrl || null,
            followUpDate: body.followUpDate || null,
            status: body.status,
            uploadedById: req.user!.id
          }
        });

        await tx.prescriptionItem.deleteMany({ where: { prescriptionId: updatedPrescription.id } });

        const createdItems = [];
        for (const [index, item] of body.items.entries()) {
          const createdItem = await tx.prescriptionItem.create({
            data: {
              prescriptionId: updatedPrescription.id,
              medicineName: item.medicineName,
              strength: item.strength,
              dose: item.dose,
              frequency: item.frequency,
              duration: item.duration,
              instructions: item.instructions,
              durationDays: item.durationDays,
              intakeTimes: item.intakeTimes,
              sortOrder: index
            }
          });
          createdItems.push(createdItem);
        }

        await tx.medicineDoseEvent.deleteMany({ where: { prescriptionId: updatedPrescription.id } });
        if (body.status === PrescriptionStatus.PUBLISHED) {
          const events = buildDoseScheduleEvents({
            patientId: updatedPrescription.patientId,
            prescriptionId: updatedPrescription.id,
            prescriptionItems: createdItems
          });
          if (events.length) {
            await tx.medicineDoseEvent.createMany({ data: events });
          }
        }

        return tx.prescription.findUniqueOrThrow({
          where: { id: updatedPrescription.id },
          include: includePrescriptionRelations()
        });
      });

      if (body.status === PrescriptionStatus.PUBLISHED) {
        await prisma.consultation.update({
          where: { id: updated.consultation.id },
          data: { status: ConsultationStatus.PRESCRIPTION_UPLOADED }
        });

        const updatedPatient = (updated as { patient?: { id: string; name: string; mobile: string | null; email: string | null } }).patient;
        if (updatedPatient) {
          void notificationService.sendBatch(
            enabledNotificationChannels.map((ch) => ({
              eventType: 'PRESCRIPTION_READY' as const,
              channel: ch,
              recipientId: updatedPatient.id,
              recipientName: updatedPatient.name,
              recipientMobile: updatedPatient.mobile,
              recipientEmail: updatedPatient.email,
              title: 'Your prescription is ready — Vitalis Care',
              body: `Your doctor has published a new prescription. Open the app to view your medicines and dosage schedule.`
            }))
          );
        }
      }

      res.json({ prescription: updated });
    })
  );

  app.get(
    '/doctor/prescriptions/:id',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const prescription = await prisma.prescription.findUnique({
        where: { id: routeParam(req, 'id') },
        include: includePrescriptionRelations()
      });

      if (!prescription) {
        return res.status(404).json({ message: 'Prescription not found' });
      }

      if (req.user!.role === Role.DOCTOR && prescription.consultation.assignedDoctorId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json({ prescription });
    })
  );

  app.get(
    '/doctor/payments/summary',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const doctorSharePercent = 60;
      const payments = await prisma.payment.findMany({
        where: {
          status: PaymentStatus.PAID,
          consultation: { assignedDoctorId: req.user!.id }
        },
        include: {
          consultation: {
            select: {
              id: true,
              status: true,
              disease: { select: { name: true } },
              patient: { select: { id: true, name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      const totals = payments.reduce(
        (acc, payment) => {
          acc.gross += payment.amountInPaise;
          acc.estimatedDoctorEarnings += Math.round((payment.amountInPaise * doctorSharePercent) / 100);
          return acc;
        },
        { gross: 0, estimatedDoctorEarnings: 0 }
      );

      res.json({
        doctorSharePercent,
        totals: {
          paidConsultations: payments.length,
          grossInPaise: totals.gross,
          estimatedDoctorEarningsInPaise: totals.estimatedDoctorEarnings
        },
        payments
      });
    })
  );
}
