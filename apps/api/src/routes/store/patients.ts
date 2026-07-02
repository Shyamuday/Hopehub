import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { asyncRoute, queryText, routeParam } from '../../utils/helpers.js';
import { createPatientRecord, normalizeMobile, searchPatients } from '../../services/patient-identity.js';
import { getStoreStaff, requireManager, storeAuthMiddleware } from './shared.js';

export function registerStorePatientRoutes(router: Router) {
  // GET /store/patients/search?q= — clinic-scoped to this store, then global
  router.get(
    '/patients/search',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const q = queryText(req, 'q').trim();
      if (q.length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters.' });
      }

      const { storeId } = getStoreStaff(req);
      const scope = z.enum(['auto', 'clinic', 'global']).catch('auto').parse(queryText(req, 'scope') || 'auto');
      const result = await searchPatients({ query: q, clinicStoreId: storeId, scope });
      res.json({ ...result, clinicStoreId: storeId });
    })
  );

  // POST /store/patients — register walk-in at this branch (managers only)
  router.post(
    '/patients',
    storeAuthMiddleware,
    requireManager,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email().optional().or(z.literal('')),
          mobile: z.string().min(8).optional().or(z.literal(''))
        })
        .parse(req.body);

      try {
        const patient = await createPatientRecord({
          name: body.name,
          email: body.email || null,
          mobile: body.mobile || null,
          homeClinicStoreId: storeId
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

  // GET /store/patients/by-mobile/:mobile — family members on shared number
  router.get(
    '/patients/by-mobile/:mobile',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const mobile = normalizeMobile(routeParam(req, 'mobile'));
      if (!mobile) {
        return res.status(400).json({ message: 'Invalid mobile number.' });
      }
      const { storeId } = getStoreStaff(req);
      const scope = z.enum(['auto', 'clinic', 'global']).catch('auto').parse(queryText(req, 'scope') || 'auto');
      const result = await searchPatients({ query: mobile, clinicStoreId: storeId, scope });
      res.json({ ...result, mobile });
    })
  );
}

// Platform-auth mirror for admin UI
export function registerAdminPatientLookupRoutes(router: Router) {
  router.get(
    '/admin/patients/search',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const q = queryText(req, 'q').trim();
      if (q.length < 2) {
        return res.status(400).json({ message: 'Search query must be at least 2 characters.' });
      }
      const clinicStoreId = queryText(req, 'clinicStoreId') || null;
      const scope = z.enum(['auto', 'clinic', 'global']).catch('auto').parse(queryText(req, 'scope') || 'auto');
      const result = await searchPatients({ query: q, clinicStoreId, scope });
      res.json(result);
    })
  );

  router.post(
    '/admin/patients',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          name: z.string().min(2),
          email: z.string().email().optional().or(z.literal('')),
          mobile: z.string().min(8).optional().or(z.literal('')),
          homeClinicStoreId: z.string().optional().nullable()
        })
        .parse(req.body);

      try {
        const patient = await createPatientRecord({
          name: body.name,
          email: body.email || null,
          mobile: body.mobile || null,
          homeClinicStoreId: body.homeClinicStoreId ?? null
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
}
