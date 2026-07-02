import { Router } from 'express';
import { z } from 'zod';
import { ConsultationStatus, PrescriptionOptionType, PrescriptionStatus, Role } from '@prisma/client';
import type { Server as SocketIoServer } from 'socket.io';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import {
  asyncRoute,
  routeParam,
  includePrescriptionRelations,
  buildDoseScheduleEvents
} from '../../utils/helpers.js';
import { enabledNotificationChannels, notificationService } from '../../services/notification-service.js';
import { prescriptionInputSchema } from './shared.js';
import { analyzePrescriptionSafety } from '../../services/prescription-safety.js';

function assertPrescriptionSafetyAcknowledged(
  items: Array<{ medicineName: string; strength?: string; dose?: string; frequency?: string }>,
  safetyAcknowledged: boolean
) {
  const safety = analyzePrescriptionSafety(items);
  if (safety.requiresConfirmation && !safetyAcknowledged) {
    return { ok: false as const, safety };
  }
  return { ok: true as const, safety };
}

export function registerDoctorPrescriptionRoutes(router: Router, io: SocketIoServer) {
  // ─── Prescriptions (doctor) ────────────────────────────────────────────────────

  router.get(
    '/doctor/appointments/:id/prescriptions',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const consultation = await prisma.consultation.findUnique({
        where: { id: routeParam(req, 'id') },
        select: { id: true, assignedDoctorId: true, status: true }
      });

      if (!consultation) return res.status(404).json({ message: 'Consultation not found' });
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

  router.post(
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
        prisma.prescriptionOption.findFirst({ where: { id: body.methodOptionId, type: PrescriptionOptionType.METHOD } }),
        prisma.prescriptionOption.findFirst({ where: { id: body.diagnosedDiseaseOptionId, type: PrescriptionOptionType.DIAGNOSED_DISEASE } })
      ]);

      if (!methodOption || !diagnosedDiseaseOption) {
        return res.status(400).json({ message: 'Invalid prescription method or diagnosed disease option.' });
      }

      const safetyCheck = assertPrescriptionSafetyAcknowledged(body.items, body.safetyAcknowledged);
      if (!safetyCheck.ok) {
        return res.status(409).json({
          message: 'Prescription has safety warnings. Review and confirm to proceed.',
          safety: safetyCheck.safety
        });
      }

      const prescription = await prisma.$transaction(async (tx) => {
        const previous = await tx.prescription.findFirst({
          where: { consultationId: consultation.id },
          orderBy: { version: 'desc' }
        });
        const nextVersion = (previous?.version || 0) + 1;
        await tx.prescription.updateMany({ where: { consultationId: consultation.id, isLatest: true }, data: { isLatest: false } });

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
            fileUrl: body.fileUrl || null,
            followUpDate: body.followUpDate || null,
            status: body.status
          }
        });

        const createdItems = [];
        for (const [index, item] of body.items.entries()) {
          const createdItem = await tx.prescriptionItem.create({
            data: { prescriptionId: created.id, medicineName: item.medicineName, strength: item.strength, dose: item.dose, frequency: item.frequency, duration: item.duration, instructions: item.instructions, durationDays: item.durationDays, intakeTimes: item.intakeTimes, sortOrder: index }
          });
          createdItems.push(createdItem);
        }

        if (body.status === PrescriptionStatus.PUBLISHED) {
          const scheduleEvents = buildDoseScheduleEvents({ patientId: consultation.patientId, prescriptionId: created.id, prescriptionItems: createdItems });
          if (scheduleEvents.length) await tx.medicineDoseEvent.createMany({ data: scheduleEvents });
        }

        return tx.prescription.findUniqueOrThrow({ where: { id: created.id }, include: includePrescriptionRelations() });
      });

      await prisma.consultation.update({
        where: { id: consultation.id },
        data: { status: body.status === PrescriptionStatus.PUBLISHED ? ConsultationStatus.PRESCRIPTION_UPLOADED : consultation.status }
      });

      if (body.status === PrescriptionStatus.PUBLISHED) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rxPatient = (prescription as any).patient;
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
          io.to(`user:${rxPatient.id}`).emit('prescription:new', { prescriptionId: prescription.id, consultationId: consultation.id });
        }
      }

      res.status(201).json({ prescription });
    })
  );

  router.put(
    '/doctor/prescriptions/:id',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = prescriptionInputSchema.parse(req.body);
      const prescription = await prisma.prescription.findUnique({
        where: { id: routeParam(req, 'id') },
        include: { consultation: { select: { assignedDoctorId: true } } }
      });

      if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
      if (!prescription.isLatest) return res.status(400).json({ message: 'Only the latest version can be edited.' });
      if (prescription.status === PrescriptionStatus.PUBLISHED) {
        return res.status(400).json({ message: 'Published prescriptions cannot be edited. Create follow-up version.' });
      }
      if (req.user!.role === Role.DOCTOR && prescription.consultation.assignedDoctorId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const [methodOption, diagnosedDiseaseOption] = await Promise.all([
        prisma.prescriptionOption.findFirst({ where: { id: body.methodOptionId, type: PrescriptionOptionType.METHOD } }),
        prisma.prescriptionOption.findFirst({ where: { id: body.diagnosedDiseaseOptionId, type: PrescriptionOptionType.DIAGNOSED_DISEASE } })
      ]);

      if (!methodOption || !diagnosedDiseaseOption) {
        return res.status(400).json({ message: 'Invalid prescription method or diagnosed disease option.' });
      }

      const safetyCheck = assertPrescriptionSafetyAcknowledged(body.items, body.safetyAcknowledged);
      if (!safetyCheck.ok) {
        return res.status(409).json({
          message: 'Prescription has safety warnings. Review and confirm to proceed.',
          safety: safetyCheck.safety
        });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedRx = await tx.prescription.update({
          where: { id: prescription.id },
          data: { methodOptionId: methodOption.id, diagnosedDiseaseOptionId: diagnosedDiseaseOption.id, diagnosis: body.diagnosis, advice: body.advice || null, notes: body.notes, fileUrl: body.fileUrl || null, followUpDate: body.followUpDate || null, status: body.status, uploadedById: req.user!.id }
        });

        await tx.prescriptionItem.deleteMany({ where: { prescriptionId: updatedRx.id } });

        const createdItems = [];
        for (const [index, item] of body.items.entries()) {
          const ci = await tx.prescriptionItem.create({
            data: { prescriptionId: updatedRx.id, medicineName: item.medicineName, strength: item.strength, dose: item.dose, frequency: item.frequency, duration: item.duration, instructions: item.instructions, durationDays: item.durationDays, intakeTimes: item.intakeTimes, sortOrder: index }
          });
          createdItems.push(ci);
        }

        await tx.medicineDoseEvent.deleteMany({ where: { prescriptionId: updatedRx.id } });
        if (body.status === PrescriptionStatus.PUBLISHED) {
          const events = buildDoseScheduleEvents({ patientId: updatedRx.patientId, prescriptionId: updatedRx.id, prescriptionItems: createdItems });
          if (events.length) await tx.medicineDoseEvent.createMany({ data: events });
        }

        return tx.prescription.findUniqueOrThrow({ where: { id: updatedRx.id }, include: includePrescriptionRelations() });
      });

      if (body.status === PrescriptionStatus.PUBLISHED) {
        await prisma.consultation.update({
          where: { id: updated.consultation.id },
          data: { status: ConsultationStatus.PRESCRIPTION_UPLOADED }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedPatient = (updated as any).patient;
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
          io.to(`user:${updatedPatient.id}`).emit('prescription:new', { prescriptionId: updated.id, consultationId: updated.consultation.id });
        }
      }

      res.json({ prescription: updated });
    })
  );

  router.get(
    '/doctor/prescriptions/:id',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const prescription = await prisma.prescription.findUnique({
        where: { id: routeParam(req, 'id') },
        include: includePrescriptionRelations()
      });

      if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
      if (req.user!.role === Role.DOCTOR && prescription.consultation.assignedDoctorId !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      res.json({ prescription });
    })
  );

}
