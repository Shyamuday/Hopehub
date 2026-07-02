import { Router } from 'express';
import { z } from 'zod';
import { ConsultationStatus, PrescriptionOptionType, PrescriptionStatus, Role } from '@prisma/client';
import type { Server as SocketIoServer } from 'socket.io';
import PDFDocument from 'pdfkit';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import {
  asyncRoute,
  routeParam,
  normalizeOptionLabel,
  includePrescriptionRelations,
  buildDoseScheduleEvents
} from '../utils/helpers.js';
import { enabledNotificationChannels, notificationService } from '../services/notification-service.js';

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
  fileUrl: z.string().url().optional().or(z.literal('')),
  followUpDate: z.coerce.date().optional(),
  status: z.nativeEnum(PrescriptionStatus).default(PrescriptionStatus.DRAFT),
  items: z.array(prescriptionItemInputSchema).min(1)
});

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

export function createPrescriptionsRouter(io: SocketIoServer) {
  const router = Router();

  // ─── Prescription options ──────────────────────────────────────────────────────

  router.post(
    '/doctor/prescription-options',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const body = z
        .object({ type: z.nativeEnum(PrescriptionOptionType), label: z.string().min(2) })
        .parse(req.body);

      const normalized = normalizeOptionLabel(body.label);
      const option = await prisma.prescriptionOption.upsert({
        where: { type_normalizedLabel: { type: body.type, normalizedLabel: normalized } },
        update: { label: body.label.trim() },
        create: { type: body.type, label: body.label.trim(), normalizedLabel: normalized, isSystem: false, createdById: req.user!.id }
      });

      res.status(201).json({ option });
    })
  );

  router.get(
    '/doctor/prescription-options',
    authRequired,
    allowRoles(Role.DOCTOR, Role.ADMIN),
    asyncRoute(async (req, res) => {
      const query = z.object({ type: z.nativeEnum(PrescriptionOptionType) }).parse(req.query);
      const options = await prisma.prescriptionOption.findMany({
        where: { type: query.type },
        orderBy: [{ isSystem: 'desc' }, { label: 'asc' }]
      });
      res.json({ options });
    })
  );

  // ─── Prescription templates ────────────────────────────────────────────────────

  router.get(
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

  router.post(
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
          items: { create: body.items.map((item, i) => ({ ...item, sortOrder: item.sortOrder ?? i })) }
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
          items: { create: body.items.map((item, i) => ({ ...item, sortOrder: item.sortOrder ?? i })) }
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
    asyncRoute(async (req, res) => {
      const existing = await prisma.prescriptionTemplate.findUnique({ where: { id: routeParam(req, 'id') } });
      if (!existing || existing.doctorId !== req.user!.id) {
        return res.status(404).json({ message: 'Template not found' });
      }
      await prisma.prescriptionTemplate.delete({ where: { id: existing.id } });
      res.json({ ok: true });
    })
  );

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

  // ─── Prescriptions (patient) ───────────────────────────────────────────────────

  router.get(
    '/patient/prescriptions',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const prescriptions = await prisma.prescription.findMany({
        where: { patientId: req.user!.id, status: PrescriptionStatus.PUBLISHED },
        include: includePrescriptionRelations(),
        orderBy: { createdAt: 'desc' }
      });
      res.json({ prescriptions });
    })
  );

  router.get(
    '/patient/prescriptions/:id',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const prescription = await prisma.prescription.findUnique({
        where: { id: routeParam(req, 'id') },
        include: includePrescriptionRelations()
      });

      if (!prescription || prescription.patientId !== req.user!.id || prescription.status !== PrescriptionStatus.PUBLISHED) {
        return res.status(404).json({ message: 'Prescription not found' });
      }
      res.json({ prescription });
    })
  );

  // ─── PDF prescription ──────────────────────────────────────────────────────────

  router.get(
    '/patient/prescriptions/:id/pdf',
    authRequired,
    asyncRoute(async (req, res) => {
      const prescription = await prisma.prescription.findUnique({
        where: { id: routeParam(req, 'id') },
        include: { ...includePrescriptionRelations(), patient: { select: { name: true, mobile: true } } }
      });

      if (!prescription || prescription.status !== PrescriptionStatus.PUBLISHED) {
        return res.status(404).json({ message: 'Prescription not found' });
      }

      const isOwner = prescription.patientId === req.user!.id;
      const isDoctor = prescription.consultation.assignedDoctorId === req.user!.id;
      const isAdmin = req.user!.role === Role.ADMIN;
      if (!isOwner && !isDoctor && !isAdmin) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rxPatient = (prescription as any).patient;
      const items = prescription.items || [];
      const date = new Date(prescription.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const followUp = prescription.followUpDate
        ? new Date(prescription.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : null;

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const filename = `prescription-${prescription.id.slice(0, 8)}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      doc.pipe(res);

      const PRIMARY = '#1d4ed8';
      const GRAY = '#6b7280';
      const W = doc.page.width - 100;

      doc.fontSize(18).fillColor(PRIMARY).font('Helvetica-Bold').text('Vitalis Care and Research Centre', 50, 50);
      doc.fontSize(10).fillColor(GRAY).font('Helvetica').text('Doctor-led digital consultations  |  vitaliscare.in', 50, 72);
      doc.fontSize(36).fillColor(PRIMARY).font('Helvetica-Oblique').text('Rx', doc.page.width - 90, 45, { width: 60, align: 'right' });
      doc.moveTo(50, 98).lineTo(doc.page.width - 50, 98).strokeColor(PRIMARY).lineWidth(1.5).stroke();

      let y = 110;
      const metaCol = (label: string, value: string, x: number, cy: number) => {
        doc.fontSize(8).fillColor(GRAY).font('Helvetica').text(label.toUpperCase(), x, cy);
        doc.fontSize(11).fillColor('#111').font('Helvetica-Bold').text(value || '—', x, cy + 11, { width: W / 2 - 10 });
      };
      metaCol('Patient', rxPatient?.name || 'Patient', 50, y);
      metaCol('Date', date, 50 + W / 2, y);
      y += 35;
      metaCol('Diagnosis', prescription.diagnosis || '—', 50, y);
      metaCol('Doctor', prescription.uploadedBy?.name || '—', 50 + W / 2, y);
      y += 35;
      if (prescription.methodOption) { metaCol('Method', prescription.methodOption.label, 50, y); y += 28; }
      if (prescription.diagnosedDiseaseOption) { metaCol('Condition', prescription.diagnosedDiseaseOption.label, 50, y); y += 28; }
      y += 5;
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 10;

      doc.fontSize(9).fillColor(GRAY).font('Helvetica').text('MEDICINES', 50, y);
      y += 14;
      const colWidths = [24, 140, 60, 80, 70, W - 374];
      const colX = colWidths.reduce<number[]>((acc, w, i) => { acc.push(i === 0 ? 50 : acc[i - 1] + colWidths[i - 1]); return acc; }, []);
      const headers = ['#', 'Medicine', 'Dose', 'Frequency', 'Duration', 'Instructions'];

      doc.rect(50, y, W, 18).fillColor(PRIMARY).fill();
      headers.forEach((h, i) => {
        doc.fontSize(9).fillColor('white').font('Helvetica-Bold').text(h, colX[i] + 3, y + 4, { width: colWidths[i] - 6, ellipsis: true });
      });
      y += 18;

      if (items.length === 0) {
        doc.rect(50, y, W, 20).fillColor('#f8faff').fill();
        doc.fontSize(10).fillColor(GRAY).font('Helvetica').text('No items', 50, y + 5, { width: W, align: 'center' });
        y += 20;
      } else {
        items.forEach((item, i) => {
          const bg = i % 2 === 0 ? 'white' : '#f8faff';
          doc.rect(50, y, W, 20).fillColor(bg).fill();
          const rowData = [
            String(i + 1),
            item.medicineName + (item.strength ? ` (${item.strength})` : ''),
            item.dose || '—',
            item.frequency || '—',
            item.duration || '—',
            item.instructions || '—'
          ];
          rowData.forEach((val, ci) => {
            doc.fontSize(9).fillColor('#111').font('Helvetica').text(val, colX[ci] + 3, y + 5, { width: colWidths[ci] - 6, ellipsis: true });
          });
          y += 20;
        });
      }
      doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 14;

      const infoBox = (title: string, text: string) => {
        if (!text) return;
        doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(title, 50, y);
        y += 12;
        doc.rect(50, y, W, 0).fillColor('#f9fafb').fill();
        doc.fontSize(10);
        const textH = doc.heightOfString(text, { width: W - 16 });
        doc.rect(50, y, W, textH + 14).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
        doc.fontSize(10).fillColor('#374151').font('Helvetica').text(text, 58, y + 7, { width: W - 16 });
        y += textH + 20;
      };
      if (prescription.notes) infoBox('CLINICAL NOTES', prescription.notes);
      if (prescription.advice) infoBox('ADVICE', prescription.advice);

      if (followUp) {
        doc.rect(50, y, W, 22).fillColor('#dbeafe').fill();
        doc.fontSize(10).fillColor('#1e40af').font('Helvetica-Bold').text(`Follow-up due: ${followUp}`, 58, y + 6);
        y += 30;
      }

      const sigY = doc.page.height - 80;
      doc.moveTo(doc.page.width - 200, sigY).lineTo(doc.page.width - 50, sigY).strokeColor('#374151').lineWidth(0.5).stroke();
      doc.fontSize(10).fillColor(GRAY).font('Helvetica').text(prescription.uploadedBy?.name || 'Doctor', doc.page.width - 200, sigY + 5, { width: 150, align: 'center' });
      doc.fontSize(9).text('Vitalis Care', doc.page.width - 200, sigY + 17, { width: 150, align: 'center' });

      doc.end();
    })
  );

  return router;
}
