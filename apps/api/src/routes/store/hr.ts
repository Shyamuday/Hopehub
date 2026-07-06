import { Router } from 'express';
import { EmployeeStatus, WorkShift } from '@prisma/client';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam } from '../../utils/helpers.js';
import { formatSalary, formatShift, generateLetterNumber } from '../hr/shared.js';
import { getStoreStaff, requireManager, storeAuthMiddleware } from './shared.js';

export function registerStoreHrRoutes(router: Router) {
  // GET /store/hr/staff — manager views staff HR for their store
  router.get(
    '/hr/staff',
    storeAuthMiddleware,
    requireManager,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const staff = await prisma.storeStaff.findMany({
        where: { storeId },
        include: { joiningLetter: true, store: { select: { id: true, name: true } } },
        orderBy: { joiningDate: 'asc' }
      });
      res.json({ staff });
    })
  );

  router.get(
    '/hr/staff/:id',
    storeAuthMiddleware,
    requireManager,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const staff = await prisma.storeStaff.findFirst({
        where: { id: routeParam(req, 'id'), storeId },
        include: {
          joiningLetter: true,
          store: true,
          leaveRequests: { orderBy: { createdAt: 'desc' }, take: 10 }
        }
      });
      if (!staff) {
        return res.status(404).json({ message: 'Staff member not found.' });
      }
      res.json({ staff });
    })
  );

  router.put(
    '/hr/staff/:id',
    storeAuthMiddleware,
    requireManager,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const id = routeParam(req, 'id');
      const existing = await prisma.storeStaff.findFirst({ where: { id, storeId }, select: { id: true } });
      if (!existing) {
        return res.status(404).json({ message: 'Staff member not found.' });
      }

      const {
        designation,
        department,
        phone,
        email,
        address,
        joiningDate,
        probationEndDate,
        salaryPerMonth,
        workShift,
        shiftStart,
        shiftEnd,
        weeklyOffDays,
        emergencyContact,
        emergencyPhone,
        employeeStatus,
        employeeId
      } = req.body as Record<string, unknown>;

      const updated = await prisma.storeStaff.update({
        where: { id },
        data: {
          designation: designation as string | undefined,
          department: department as string | undefined,
          phone: phone as string | undefined,
          email: email as string | undefined,
          address: address as string | undefined,
          joiningDate: joiningDate ? new Date(joiningDate as string) : undefined,
          probationEndDate: probationEndDate ? new Date(probationEndDate as string) : undefined,
          workShift: workShift as WorkShift | undefined,
          shiftStart: shiftStart as string | undefined,
          shiftEnd: shiftEnd as string | undefined,
          weeklyOffDays: (weeklyOffDays as string[] | undefined) ?? [],
          emergencyContact: emergencyContact as string | undefined,
          emergencyPhone: emergencyPhone as string | undefined,
          employeeStatus: employeeStatus as EmployeeStatus | undefined,
          employeeId: employeeId as string | undefined
        }
      });
      res.json({ staff: updated });
    })
  );

  router.post(
    '/hr/staff/:id/letter',
    storeAuthMiddleware,
    requireManager,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const id = routeParam(req, 'id');
      const staff = await prisma.storeStaff.findFirst({
        where: { id, storeId },
        include: { store: true }
      });
      if (!staff) {
        return res.status(404).json({ message: 'Staff member not found.' });
      }

      const letterNumber = generateLetterNumber('JL-STORE');
      const issuedDate = new Date();
      const content = {
        letterNumber,
        issuedDate: issuedDate.toISOString(),
        storeName: staff.store.name,
        storeAddress: staff.store.address ?? '',
        storePhone: staff.store.phone ?? '',
        employeeName: staff.name,
        employeeCode: staff.employeeId ?? staff.staffCode,
        designation: staff.designation ?? staff.role,
        department: staff.department ?? 'Store Operations',
        joiningDate: staff.joiningDate ? staff.joiningDate.toISOString() : issuedDate.toISOString(),
        probationEndDate: staff.probationEndDate?.toISOString() ?? null,
        salary: formatSalary(staff.salaryPerMonth),
        shift: formatShift(staff.workShift, staff.shiftStart, staff.shiftEnd),
        weeklyOff: (staff.weeklyOffDays ?? []).join(', ') || 'Sunday',
        phone: staff.phone ?? '',
        address: staff.address ?? ''
      };

      const letter = await prisma.joiningLetter.upsert({
        where: { staffId: id },
        create: { letterNumber, issuedDate, content, staffId: id },
        update: { letterNumber, issuedDate, content }
      });
      res.json({ letter });
    })
  );

  router.get(
    '/hr/staff/:id/letter',
    storeAuthMiddleware,
    requireManager,
    asyncRoute(async (req, res) => {
      const { storeId } = getStoreStaff(req);
      const id = routeParam(req, 'id');
      const staff = await prisma.storeStaff.findFirst({ where: { id, storeId }, select: { id: true } });
      if (!staff) {
        return res.status(404).json({ message: 'Staff member not found.' });
      }
      const letter = await prisma.joiningLetter.findUnique({ where: { staffId: id } });
      if (!letter) {
        return res.status(404).json({ error: 'Letter not yet generated' });
      }
      res.json({ letter });
    })
  );
}
