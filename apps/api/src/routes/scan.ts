import { Router } from 'express';
import { ConsultationStatus, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { SERVER_CONFIG } from '../constants/config.constants.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';
import {
  buildPatientScanUrl,
  doctorCanAccessPatient,
  resolvePatientByCode
} from '../services/patient-identity.js';

export const scanRouter = Router();

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Public landing — opened when anyone scans the patient card QR
scanRouter.get('/go/p/:patientCode', asyncRoute(async (req, res) => {
  const patient = await resolvePatientByCode(routeParam(req, 'patientCode'));
  if (!patient?.patientCode) {
    return res.status(404).send('<h1>Patient not found</h1>');
  }

  const code = encodeURIComponent(patient.patientCode);
  const { DOCTOR, OPERATIONS, WEB } = SERVER_CONFIG.ORIGINS;
  const doctorUrl = `${DOCTOR}/scan/patient/${code}`;
  const storeUrl = `${OPERATIONS}/store/scan/patient/${code}`;
  const receptionUrl = `${OPERATIONS}/walk-in?patientCode=${code}`;
  const managerUrl = `${OPERATIONS}/store-manager/patients`;
  const patientUrl = `${WEB}/dashboard`;

  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(patient.patientCode)} — Vitalis Care</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    main { max-width: 420px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    h1 { margin: 0 0 6px; font-size: 1.5rem; }
    .code { font-family: monospace; color: #4338ca; font-weight: 800; }
    p { color: #475569; }
    .actions { display: grid; gap: 10px; margin-top: 18px; }
    a.btn { display: block; text-align: center; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 700; }
    .doctor { background: #4338ca; color: #fff; }
    .store { background: #0f766e; color: #fff; }
    .reception { background: #b45309; color: #fff; }
    .patient { background: #fff; color: #334155; border: 1px solid #cbd5e1; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <h1>${escapeHtml(patient.name)}</h1>
      <p class="code">${escapeHtml(patient.patientCode)}</p>
      <p>Choose how you want to open this patient record.</p>
      <div class="actions">
        <a class="btn doctor" href="${doctorUrl}">Doctor — prescribe / consult</a>
        <a class="btn store" href="${storeUrl}">Store staff — medicines to give</a>
        <a class="btn reception" href="${receptionUrl}">Reception — add to queue</a>
        <a class="btn patient" href="${managerUrl}">Store manager — patients</a>
        <a class="btn patient" href="${patientUrl}">Patient app</a>
      </div>
    </div>
  </main>
</body>
</html>`);
}));

// Doctor / admin scan context (after login in doctor app)
scanRouter.get(
  '/scan/patient/:patientCode',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const patient = await resolvePatientByCode(routeParam(req, 'patientCode'));
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    if (req.user!.role === Role.DOCTOR) {
      const allowed = await doctorCanAccessPatient(req.user!.id, patient.id);
      if (!allowed) {
        return res.status(403).json({ message: 'Patient is not linked to your clinic or cases.' });
      }
    }

    const consultations = await prisma.consultation.findMany({
      where: {
        patientId: patient.id,
        ...(req.user!.role === Role.DOCTOR ? { assignedDoctorId: req.user!.id } : {}),
        status: {
          in: [
            ConsultationStatus.ASSIGNED,
            ConsultationStatus.IN_PROGRESS,
            ConsultationStatus.PRESCRIPTION_UPLOADED,
            ConsultationStatus.PAID
          ]
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        disease: { select: { name: true } }
      }
    });

    const primaryConsultation =
      consultations.find((c) => c.status === ConsultationStatus.IN_PROGRESS || c.status === ConsultationStatus.ASSIGNED) ||
      consultations[0] ||
      null;

    if (req.user!.role === Role.DOCTOR && primaryConsultation?.status === ConsultationStatus.ASSIGNED) {
      await prisma.consultation.update({
        where: { id: primaryConsultation.id },
        data: { status: ConsultationStatus.IN_PROGRESS }
      });
      primaryConsultation.status = ConsultationStatus.IN_PROGRESS;
      const listed = consultations.find((c) => c.id === primaryConsultation.id);
      if (listed) listed.status = ConsultationStatus.IN_PROGRESS;
    }

    res.json({
      patient,
      scanUrl: buildPatientScanUrl(patient.patientCode!),
      consultations,
      primaryConsultationId: primaryConsultation?.id ?? null,
      actions: {
        prescribe: primaryConsultation
          ? `${SERVER_CONFIG.ORIGINS.DOCTOR}/appointments?consultationId=${primaryConsultation.id}`
          : null
      }
    });
  })
);
