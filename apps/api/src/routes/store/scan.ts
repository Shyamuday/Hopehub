import { Router } from 'express';
import { DoseEventStatus, PrescriptionStatus } from '@prisma/client';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam } from '../../utils/helpers.js';
import { buildPatientScanUrl, resolvePatientByCode } from '../../services/patient-identity.js';
import { getStoreStaff, storeAuthMiddleware } from './shared.js';

export function registerStoreScanRoutes(router: Router) {
  // GET /store/scan/patient/:patientCode — medicines to give today
  router.get(
    '/scan/patient/:patientCode',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const patient = await resolvePatientByCode(routeParam(req, 'patientCode'));
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found.' });
      }

      const { storeId } = getStoreStaff(req);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [todayDoses, latestPrescription] = await Promise.all([
        prisma.medicineDoseEvent.findMany({
          where: {
            patientId: patient.id,
            scheduledFor: { gte: start, lt: end }
          },
          include: {
            prescriptionItem: {
              select: {
                medicineName: true,
                strength: true,
                dose: true,
                frequency: true,
                instructions: true
              }
            }
          },
          orderBy: { scheduledFor: 'asc' }
        }),
        prisma.prescription.findFirst({
          where: { patientId: patient.id, status: PrescriptionStatus.PUBLISHED },
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              select: {
                medicineName: true,
                strength: true,
                dose: true,
                frequency: true,
                duration: true,
                instructions: true
              }
            }
          }
        })
      ]);

      const pendingDoses = todayDoses.filter(
        (d) => d.status === DoseEventStatus.PENDING || d.status === DoseEventStatus.MISSED
      );

      res.json({
        patient: {
          id: patient.id,
          name: patient.name,
          patientCode: patient.patientCode,
          mobile: patient.mobile,
          homeClinicStoreId: patient.homeClinicStoreId
        },
        storeId,
        scanUrl: patient.patientCode ? buildPatientScanUrl(patient.patientCode) : null,
        todayDoses: todayDoses.map((d) => ({
          id: d.id,
          scheduledFor: d.scheduledFor,
          status: d.status,
          medicineName: d.prescriptionItem.medicineName,
          strength: d.prescriptionItem.strength,
          dose: d.prescriptionItem.dose,
          frequency: d.prescriptionItem.frequency,
          instructions: d.prescriptionItem.instructions
        })),
        pendingCount: pendingDoses.length,
        prescription: latestPrescription
          ? {
              id: latestPrescription.id,
              diagnosis: latestPrescription.diagnosis,
              items: latestPrescription.items
            }
          : null
      });
    })
  );

  // POST /store/scan/dose-events/:id/give — staff marks dose as given at counter
  router.post(
    '/scan/dose-events/:id/give',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const event = await prisma.medicineDoseEvent.findUnique({
        where: { id: routeParam(req, 'id') },
        select: { id: true, patientId: true, status: true }
      });

      if (!event) {
        return res.status(404).json({ message: 'Dose event not found.' });
      }

      if (event.status !== DoseEventStatus.PENDING && event.status !== DoseEventStatus.MISSED) {
        return res.status(400).json({ message: 'This dose is already completed.' });
      }

      const { staffId, name } = getStoreStaff(req);
      const updated = await prisma.medicineDoseEvent.update({
        where: { id: event.id },
        data: {
          status: DoseEventStatus.TAKEN,
          takenAt: new Date(),
          note: `Given by store staff ${name} (${staffId})`
        }
      });

      res.json({ doseEvent: updated, message: 'Dose marked as given.' });
    })
  );
}
