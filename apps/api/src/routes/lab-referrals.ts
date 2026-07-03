import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { doctorCanAccessPatient } from '../services/patient-identity.js';
import {
  getLabReferral,
  getPatientLabResult,
  listDoctorPatientLabReferrals,
  listPatientLabResults
} from '../services/lab-referrals.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';

export const labReferralsRouter = Router();

labReferralsRouter.get(
  '/patient/lab-results',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const referrals = await listPatientLabResults(req.user!.id);
    res.json({ referrals });
  })
);

labReferralsRouter.get(
  '/patient/lab-results/:id',
  authRequired,
  allowRoles(Role.PATIENT),
  asyncRoute(async (req, res) => {
    const referral = await getPatientLabResult(routeParam(req, 'id'), req.user!.id);
    if (!referral) {
      return res.status(404).json({ message: 'Lab result not found' });
    }
    res.json({ referral });
  })
);

labReferralsRouter.get(
  '/doctor/patients/:id/lab-referrals',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const patientId = routeParam(req, 'id');
    if (req.user!.role === Role.DOCTOR) {
      const allowed = await doctorCanAccessPatient(req.user!.id, patientId);
      if (!allowed) return res.status(403).json({ message: 'Access denied' });
    }

    const referrals = await listDoctorPatientLabReferrals(patientId);
    res.json({ referrals });
  })
);

labReferralsRouter.get(
  '/doctor/lab-referrals/:id',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN),
  asyncRoute(async (req, res) => {
    const referral = await getLabReferral(routeParam(req, 'id'));
    if (!referral) {
      return res.status(404).json({ message: 'Lab referral not found' });
    }

    if (req.user!.role === Role.DOCTOR) {
      const allowed = await doctorCanAccessPatient(req.user!.id, referral.patient.id);
      if (!allowed) return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ referral });
  })
);
