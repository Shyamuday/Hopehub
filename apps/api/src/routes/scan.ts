import { Router } from 'express';
import { ConsultationStatus, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { SERVER_CONFIG } from '../constants/config.constants.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';
import {
  buildPatientScanUrl,
  doctorCanAccessPatient,
  resolvePatientByCode
} from '../services/patient-identity.js';
import { buildPatientScanContext } from '../services/patient-scan-context.js';
import { getPatientAppDownloadInfo } from '../services/patient-app-download.js';

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
  const scanHubUrl = `${OPERATIONS}/scan?patientCode=${code}`;
  const adminUrl = `${OPERATIONS}/admin/scan?patientCode=${code}`;
  const managerUrl = `${OPERATIONS}/store-manager/patients`;
  const patientUrl = `${WEB}/patient/dashboard`;
  const appDownloadUrl = `${SERVER_CONFIG.API_PUBLIC_URL}/go/app`;

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
    .scan { background: #1d4ed8; color: #fff; }
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
        <a class="btn scan" href="${scanHubUrl}">Staff scan hub</a>
        <a class="btn patient" href="${adminUrl}">Admin — patient registry</a>
        <a class="btn patient" href="${managerUrl}">Store manager — patients</a>
        <a class="btn patient" href="${patientUrl}">Patient app</a>
        <a class="btn scan" href="${appDownloadUrl}">Download patient app</a>
      </div>
    </div>
  </main>
</body>
</html>`);
}));

// Public landing — download the patient mobile / web app (no account required)
scanRouter.get('/go/app', asyncRoute(async (_req, res) => {
  const info = getPatientAppDownloadInfo();
  const { WEB } = SERVER_CONFIG.ORIGINS;
  const loginUrl = `${WEB}/login`;

  const storeButtons = [
    info.androidUrl
      ? `<a class="btn android" href="${escapeHtml(info.androidUrl)}">Get on Google Play</a>`
      : '',
    info.iosUrl ? `<a class="btn ios" href="${escapeHtml(info.iosUrl)}">Download on App Store</a>` : '',
    `<a class="btn web" href="${escapeHtml(info.webAppUrl)}">Open in browser</a>`,
    `<a class="btn signup" href="${escapeHtml(loginUrl)}">Sign up / log in</a>`
  ]
    .filter(Boolean)
    .join('\n');

  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(info.appName)} — Vitalis Care</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f0fdf4; color: #0f172a; }
    main { max-width: 420px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #fff; border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px; }
    h1 { margin: 0 0 8px; font-size: 1.45rem; }
    p { color: #475569; line-height: 1.5; }
    .actions { display: grid; gap: 10px; margin-top: 18px; }
    a.btn { display: block; text-align: center; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 700; }
    .android { background: #0f766e; color: #fff; }
    .ios { background: #0f172a; color: #fff; }
    .web { background: #fff; color: #0f766e; border: 2px solid #0f766e; }
    .signup { background: #4338ca; color: #fff; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <h1>${escapeHtml(info.appName)}</h1>
      <p>Book consultations, track medicines, and chat with your doctor — free to install.</p>
      <p><small>No account yet? Open the app and register in under a minute.</small></p>
      <div class="actions">
        ${storeButtons}
      </div>
    </div>
  </main>
</body>
</html>`);
}));

scanRouter.get('/app/download', asyncRoute(async (_req, res) => {
  res.json(getPatientAppDownloadInfo());
}));

// Unified scan context for all authenticated platform apps
scanRouter.get(
  '/scan/context/:patientCode',
  authRequired,
  asyncRoute(async (req, res) => {
    const patientCode = routeParam(req, 'patientCode');

    try {
      const context = await buildPatientScanContext({
        patientCode,
        role: req.user!.role,
        userId: req.user!.id
      });

      if (!context) {
        return res.status(404).json({ message: 'Patient not found.' });
      }

      res.json(context);
    } catch (error) {
      if (error instanceof Error && error.message === 'PATIENT_ACCESS_DENIED') {
        return res.status(403).json({ message: 'Patient is not linked to your clinic or cases.' });
      }
      if (error instanceof Error && error.message === 'PATIENT_MISMATCH') {
        return res.status(403).json({ message: 'This QR belongs to a different patient account.' });
      }
      throw error;
    }
  })
);

// Doctor / admin scan context (after login in doctor app)
scanRouter.get(
  '/scan/patient/:patientCode',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const context = await buildPatientScanContext({
      patientCode: routeParam(req, 'patientCode'),
      role: req.user!.role,
      userId: req.user!.id
    });

    if (!context) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    if (req.user!.role === Role.DOCTOR) {
      const allowed = await doctorCanAccessPatient(req.user!.id, context.patient.id);
      if (!allowed) {
        return res.status(403).json({ message: 'Patient is not linked to your clinic or cases.' });
      }
    }

    const primaryConsultation = context.consultations.find(
      (c) => c.status === ConsultationStatus.IN_PROGRESS || c.status === ConsultationStatus.ASSIGNED
    ) ?? context.consultations[0] ?? null;

    res.json({
      patient: context.patient,
      scanUrl: buildPatientScanUrl(context.patient.patientCode!),
      consultations: context.consultations,
      primaryConsultationId: context.primaryConsultationId,
      destination: context.destination,
      actions: {
        prescribe: primaryConsultation
          ? `${SERVER_CONFIG.ORIGINS.DOCTOR}/appointments?consultationId=${primaryConsultation.id}`
          : null,
        caseAnalysis: context.primaryConsultationId
          ? `${SERVER_CONFIG.ORIGINS.DOCTOR}/consultations/${context.primaryConsultationId}/case-analysis`
          : null
      }
    });
  })
);
