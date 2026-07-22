import { Router } from 'express';
import { EmployeeStatus } from '@prisma/client';
import { HR_API_ROUTES } from '../../constants/hr-api-routes.constants.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../utils/helpers.js';
import { getAccess, hrAuthMiddleware } from './shared.js';
import { doctorTypeLabel, providerTypeLabel } from '../../constants/homeopathic-doctor-types.js';

export function registerHrEmployeeRoutes(router: Router) {
  // ─── Employee Directory ────────────────────────────────────────────────────────

  router.get(
    HR_API_ROUTES.EMPLOYEES,
    hrAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { storeIds } = getAccess(req);
      const q = (req.query['q'] as string) ?? '';
      const type = (req.query['type'] as string) ?? 'ALL';
      const status = (req.query['status'] as string) ?? 'ALL';

      const results: unknown[] = [];

      if (type === 'ALL' || type === 'DOCTOR') {
        // Online doctors are visible to all HR; location-based only if clinic store is accessible
        const docStoreFilter = storeIds
          ? { OR: [{ isOnline: true }, { clinicStoreId: { in: storeIds } }] }
          : {};
        const doctors = await prisma.doctor.findMany({
          where: {
            ...docStoreFilter,
            employeeStatus: status !== 'ALL' ? (status as EmployeeStatus) : undefined,
            user: q ? { name: { contains: q, mode: 'insensitive' } } : undefined
          },
          include: {
            user: { select: { id: true, name: true, email: true, mobile: true } },
            clinicStore: { select: { id: true, name: true, address: true } },
            joiningLetter: { select: { id: true, letterNumber: true, issuedDate: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        results.push(
          ...doctors.map((d) => ({
            id: d.id,
            empType: 'DOCTOR',
            name: d.user.name,
            email: d.user.email,
            phone: d.phone ?? d.user.mobile,
            providerType: d.providerType,
            providerTypeLabel: providerTypeLabel(d.providerType),
            providerCategory: d.providerCategory,
            doctorType: d.doctorType,
            doctorTypeLabel: doctorTypeLabel(d.doctorType),
            specialtyFocus: d.specialtyFocus,
            designation: d.designation ?? providerTypeLabel(d.providerType),
            department: d.department ?? d.specialization ?? d.specialty,
            specialty: d.specialty,
            specialization: d.specialization,
            joiningDate: d.joiningDate,
            probationEndDate: d.probationEndDate,
            employeeStatus: d.employeeStatus,
            workShift: d.workShift,
            shiftStart: d.shiftStart,
            shiftEnd: d.shiftEnd,
            weeklyOffDays: d.weeklyOffDays,
            employeeId: d.employeeId,
            hasLetter: !!d.joiningLetter,
            isOnline: d.isOnline,
            clinicStore: d.clinicStore
          }))
        );
      }

      if (type === 'ALL' || type === 'STORE_STAFF') {
        const staff = await prisma.storeStaff.findMany({
          where: {
            storeId: storeIds ? { in: storeIds } : undefined,
            employeeStatus: status !== 'ALL' ? (status as EmployeeStatus) : undefined,
            name: q ? { contains: q, mode: 'insensitive' } : undefined
          },
          include: {
            store: { select: { name: true } },
            joiningLetter: { select: { id: true, letterNumber: true, issuedDate: true } }
          },
          orderBy: { createdAt: 'desc' }
        });
        results.push(
          ...staff.map((s) => ({
            id: s.id,
            empType: 'STORE_STAFF',
            name: s.name,
            email: s.email,
            phone: s.phone,
            designation: s.designation ?? s.role,
            department: s.department ?? s.store.name,
            storeName: s.store.name,
            joiningDate: s.joiningDate,
            employeeStatus: s.employeeStatus,
            workShift: s.workShift,
            shiftStart: s.shiftStart,
            shiftEnd: s.shiftEnd,
            weeklyOffDays: s.weeklyOffDays,
            employeeId: s.employeeId ?? s.staffCode,
            hasLetter: !!s.joiningLetter
          }))
        );
      }

      res.json({ employees: results, total: results.length });
    })
  );
}
