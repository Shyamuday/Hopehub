import { Router } from 'express';
import { z } from 'zod';
import { MedicineDeliveryStatus } from '@prisma/client';
import { asyncRoute, routeParam } from '../../utils/helpers.js';
import {
  createMedicineDelivery,
  getMedicineDelivery,
  listMedicineDeliveries,
  MedicineDeliveryError
} from '../../services/medicine-deliveries.js';
import { getStoreStaff, requireManager, storeAuthMiddleware } from './shared.js';

export function registerStoreDeliveryRoutes(router: Router) {
  router.get(
    '/deliveries',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const status = (req.query['status'] as string) || undefined;
      const deliveries = await listMedicineDeliveries({
        storeId,
        status: status as MedicineDeliveryStatus | undefined
      });
      res.json({ deliveries });
    })
  );

  router.get(
    '/deliveries/:id',
    storeAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const delivery = await getMedicineDelivery(routeParam(req, 'id'));
      if (!delivery || delivery.storeId !== storeId) {
        return res.status(404).json({ message: 'Delivery not found.' });
      }
      res.json(delivery);
    })
  );

  router.post(
    '/deliveries',
    storeAuthMiddleware,
    requireManager,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const body = z
        .object({
          patientId: z.string().min(1),
          prescriptionId: z.string().optional(),
          deliveryAddress: z.string().min(3),
          deliveryPhone: z.string().min(8),
          notes: z.string().optional(),
          otp: z.string().optional(),
          lines: z
            .array(
              z.object({
                medicineId: z.string().optional(),
                label: z.string().min(1),
                qty: z.number().int().min(1)
              })
            )
            .min(1)
        })
        .parse(req.body);

      try {
        const result = await createMedicineDelivery({
          storeId,
          patientId: body.patientId,
          prescriptionId: body.prescriptionId,
          deliveryAddress: body.deliveryAddress,
          deliveryPhone: body.deliveryPhone,
          notes: body.notes,
          otp: body.otp,
          lines: body.lines
        });
        res.status(201).json(result);
      } catch (error) {
        if (error instanceof MedicineDeliveryError) {
          return res.status(400).json({ message: error.message });
        }
        throw error;
      }
    })
  );
}
