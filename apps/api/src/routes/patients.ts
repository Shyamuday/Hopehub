import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute, queryText, routeParam } from '../../utils/helpers.js';
import {
  buildPatientIdCard,
  createPatientRecord,
  doctorCanAccessPatient,
  normalizeMobile,
  patientListSelect,
  resolveActorClinicStoreId,
  searchPatients
} from '../../services/patient-identity.js';

export const patientsRouter = Router();

// GET /patients/search?q=&scope=auto|clinic|global&clinicStoreId=
patientsRouter.get(
  '/patients/search',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const q = queryText(req, 'q').trim();
    if (q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters.' });
    }

    const scope = z.enum(['auto', 'clinic', 'global']).catch('auto').parse(queryText(req, 'scope') || 'auto');
    let clinicStoreId = queryText(req, 'clinicStoreId') || null;

    if (!clinicStoreId && req.user!.role === Role.DOCTOR) {
      clinicStoreId = await resolveActorClinicStoreId(req.user!.id, Role.DOCTOR);
    }

    const { patients, scopeUsed } = await searchPatients({
      query: q,
      clinicStoreId,
      scope
    });

    res.json({
      patients,
      scopeUsed,
      clinicStoreId,
      hint:
        scopeUsed === 'clinic'
          ? 'Results from your clinic branch.'
          : scopeUsed === 'global'
            ? 'No clinic matches — showing all branches.'
            : undefined
    });
  })
);

// POST /patients — staff-assisted registration (no password required)
patientsRouter.post(
  '/patients',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        name: z.string().min(2),
        email: z.string().email().optional().or(z.literal('')),
        mobile: z.string().min(8).optional().or(z.literal('')),
        homeClinicStoreId: z.string().optional().nullable()
      })
      .parse(req.body);

    let homeClinicStoreId = body.homeClinicStoreId ?? null;
    if (!homeClinicStoreId && req.user!.role === Role.DOCTOR) {
      homeClinicStoreId = await resolveActorClinicStoreId(req.user!.id, Role.DOCTOR);
    }

    try {
      const patient = await createPatientRecord({
        name: body.name,
        email: body.email || null,
        mobile: body.mobile || null,
        homeClinicStoreId
      });
      res.status(201).json({ patient });
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_TAKEN') {
        return res.status(409).json({ message: 'A patient with this email already exists.' });
      }
      throw error;
    }
  })
);

// GET /patients/:id/card — printable clinic reference card
patientsRouter.get(
  '/patients/:id/card',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const patientId = routeParam(req, 'id');

    if (req.user!.role === Role.DOCTOR) {
      const allowed = await doctorCanAccessPatient(req.user!.id, patientId);
      if (!allowed) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    const card = await buildPatientIdCard(patientId);
    if (!card) {
      return res.status(404).json({ message: 'Patient ID card is not available.' });
    }

    res.json({ card });
  })
);

// GET /patients/:id
patientsRouter.get(
  '/patients/:id',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const patientId = routeParam(req, 'id');

    if (req.user!.role === Role.DOCTOR) {
      const allowed = await doctorCanAccessPatient(req.user!.id, patientId);
      if (!allowed) {
        return res.status(403).json({ message: 'Patient not found at your clinic or in your cases.' });
      }
    }

    const patient = await prisma.user.findFirst({
      where: { id: patientId, role: Role.PATIENT },
      select: {
        ...patientListSelect,
        allergies: true,
        currentMedications: true,
        chronicConditions: true,
        patientConsults: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            createdAt: true,
            clinicStoreId: true,
            clinicStore: { select: { id: true, name: true, code: true } },
            disease: { select: { name: true } },
            assignedDoctor: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    res.json({ patient });
  })
);

// GET /patients/by-mobile/:mobile — family members on same number
patientsRouter.get(
  '/patients/by-mobile/:mobile',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const mobile = normalizeMobile(routeParam(req, 'mobile'));
    if (!mobile) {
      return res.status(400).json({ message: 'Invalid mobile number.' });
    }

    const scope = z.enum(['auto', 'clinic', 'global']).catch('auto').parse(queryText(req, 'scope') || 'auto');
    let clinicStoreId = queryText(req, 'clinicStoreId') || null;
    if (!clinicStoreId && req.user!.role === Role.DOCTOR) {
      clinicStoreId = await resolveActorClinicStoreId(req.user!.id, Role.DOCTOR);
    }

    const { patients, scopeUsed } = await searchPatients({
      query: mobile,
      clinicStoreId,
      scope
    });

    res.json({ patients, scopeUsed, mobile });
  })
);

// POST /patients/:id/set-password — optional password for walk-in patients
patientsRouter.post(
  '/patients/:id/set-password',
  authRequired,
  allowRoles(Role.DOCTOR, Role.ADMIN, Role.HR),
  asyncRoute(async (req, res) => {
    const patientId = routeParam(req, 'id');
    const body = z.object({ password: z.string().min(8) }).parse(req.body);

    if (req.user!.role === Role.DOCTOR) {
      const allowed = await doctorCanAccessPatient(req.user!.id, patientId);
      if (!allowed) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const patient = await prisma.user.update({
      where: { id: patientId },
      data: { passwordHash },
      select: patientListSelect
    });

    res.json({ patient });
  })
);

