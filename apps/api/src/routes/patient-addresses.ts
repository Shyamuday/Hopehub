import { Router } from 'express';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { asyncRoute, routeParam } from '../../utils/helpers.js';
import {
  createPatientAddress,
  deletePatientAddress,
  listPatientAddresses,
  patientAddressInputSchema,
  setDefaultPatientAddress,
  updatePatientAddress
} from '../../services/patient-addresses.js';

export function registerPatientAddressRoutes(router: Router) {
  router.get(
    '/patient/addresses',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const addresses = await listPatientAddresses(req.user!.id);
      res.json({ addresses });
    })
  );

  router.post(
    '/patient/addresses',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = patientAddressInputSchema.parse(req.body);
      try {
        const address = await createPatientAddress(req.user!.id, body);
        res.status(201).json({ address });
      } catch (error) {
        res.status(400).json({ message: error instanceof Error ? error.message : 'Could not save address.' });
      }
    })
  );

  router.put(
    '/patient/addresses/:id',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const body = patientAddressInputSchema.parse(req.body);
      try {
        const address = await updatePatientAddress(req.user!.id, routeParam(req, 'id'), body);
        res.json({ address });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not update address.';
        res.status(message === 'Address not found.' ? 404 : 400).json({ message });
      }
    })
  );

  router.post(
    '/patient/addresses/:id/default',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      try {
        const address = await setDefaultPatientAddress(req.user!.id, routeParam(req, 'id'));
        res.json({ address });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not set default address.';
        res.status(message === 'Address not found.' ? 404 : 400).json({ message });
      }
    })
  );

  router.delete(
    '/patient/addresses/:id',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      try {
        await deletePatientAddress(req.user!.id, routeParam(req, 'id'));
        res.json({ ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not delete address.';
        res.status(message === 'Address not found.' ? 404 : 400).json({ message });
      }
    })
  );
}
