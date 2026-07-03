import { Router } from 'express';
import { z } from 'zod';
import { MedicineDeliveryStatus, Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { asyncRoute, queryText, routeParam } from '../../utils/helpers.js';
import {
  acceptMedicineDelivery,
  completeMedicineDelivery,
  failMedicineDelivery,
  getDeliveryDashboard,
  getMedicineDelivery,
  listMedicineDeliveries,
  pickupMedicineDelivery,
  resolveDeliveryExecutiveStoreId
} from '../../services/medicine-deliveries.js';
import { prisma } from '../../db.js';

const deliveryRoles = [Role.DELIVERY_EXECUTIVE, Role.ADMIN] as const;

export function createDeliveryRouter() {
  const router = Router();

  router.get(
    '/delivery/me',
    authRequired,
    allowRoles(...deliveryRoles),
    asyncRoute(async (req, res) => {
      const storeId = await resolveDeliveryExecutiveStoreId(req.user!.id, req.user!.role);
      const profile = await prisma.deliveryExecutiveProfile.findUnique({
        where: { userId: req.user!.id },
        include: { store: { select: { id: true, name: true, code: true, address: true } } }
      });
      res.json({ user: req.user, storeId, profile, store: profile?.store ?? null });
    })
  );

  router.get(
    '/delivery/dashboard',
    authRequired,
    allowRoles(...deliveryRoles),
    asyncRoute(async (req, res) => {
      const storeId = await resolveDeliveryExecutiveStoreId(req.user!.id, req.user!.role);
      if (!storeId && req.user!.role === Role.DELIVERY_EXECUTIVE) {
        return res.status(400).json({ message: 'Delivery profile not found.' });
      }
      const effectiveStoreId = storeId ?? queryText(req, 'storeId');
      if (!effectiveStoreId) {
        return res.status(400).json({ message: 'Store selection is required for admin users.' });
      }
      res.json(await getDeliveryDashboard(req.user!.id, effectiveStoreId));
    })
  );

  router.get(
    '/delivery/orders',
    authRequired,
    allowRoles(...deliveryRoles),
    asyncRoute(async (req, res) => {
      const storeId = await resolveDeliveryExecutiveStoreId(req.user!.id, req.user!.role);
      const status = queryText(req, 'status') as MedicineDeliveryStatus | undefined;
      const deliveries = await listMedicineDeliveries({
        storeId: storeId ?? (queryText(req, 'storeId') || undefined),
        status: status || undefined,
        forExecutiveId: req.user!.role === Role.DELIVERY_EXECUTIVE ? req.user!.id : undefined
      });
      res.json({ deliveries });
    })
  );

  router.get(
    '/delivery/orders/:id',
    authRequired,
    allowRoles(...deliveryRoles),
    asyncRoute(async (req, res) => {
      const storeId = await resolveDeliveryExecutiveStoreId(req.user!.id, req.user!.role);
      const delivery = await getMedicineDelivery(routeParam(req, 'id'));
      if (!delivery) return res.status(404).json({ message: 'Delivery not found.' });
      if (
        req.user!.role === Role.DELIVERY_EXECUTIVE &&
        storeId &&
        delivery.storeId !== storeId &&
        delivery.assignedExecutiveId !== req.user!.id
      ) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      res.json(delivery);
    })
  );

  router.post(
    '/delivery/orders/:id/accept',
    authRequired,
    allowRoles(Role.DELIVERY_EXECUTIVE),
    asyncRoute(async (req, res) => {
      const storeId = await resolveDeliveryExecutiveStoreId(req.user!.id, req.user!.role);
      if (!storeId) return res.status(400).json({ message: 'Delivery profile not found.' });
      const delivery = await acceptMedicineDelivery(routeParam(req, 'id'), req.user!.id, storeId);
      res.json(delivery);
    })
  );

  router.post(
    '/delivery/orders/:id/pickup',
    authRequired,
    allowRoles(Role.DELIVERY_EXECUTIVE),
    asyncRoute(async (req, res) => {
      const delivery = await pickupMedicineDelivery(routeParam(req, 'id'), req.user!.id);
      res.json(delivery);
    })
  );

  router.post(
    '/delivery/orders/:id/complete',
    authRequired,
    allowRoles(Role.DELIVERY_EXECUTIVE),
    asyncRoute(async (req, res) => {
      const body = z
        .object({
          otp: z.string().min(4),
          proofNote: z.string().optional()
        })
        .parse(req.body);
      const delivery = await completeMedicineDelivery(routeParam(req, 'id'), req.user!.id, body);
      res.json(delivery);
    })
  );

  router.post(
    '/delivery/orders/:id/fail',
    authRequired,
    allowRoles(Role.DELIVERY_EXECUTIVE),
    asyncRoute(async (req, res) => {
      const body = z.object({ reason: z.string().min(3) }).parse(req.body);
      const delivery = await failMedicineDelivery(routeParam(req, 'id'), req.user!.id, body.reason);
      res.json(delivery);
    })
  );

  return router;
}
