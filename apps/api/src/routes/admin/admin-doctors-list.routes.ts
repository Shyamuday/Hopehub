import type express from 'express';
import { Role } from '@prisma/client';
import { allowRoles, authRequired } from '../../auth.js';
import { prisma } from '../../db.js';
import { publicUserSelect } from '../../db/prisma-includes.js';
import { asyncRoute } from '../../middleware/async-route.js';
import { queryPositiveInt, queryText } from '../../lib/http-params.js';
import { PERMISSIONS, requirePermissions } from '../../staff-permissions.js';

export function registerAdminDoctorListRoutes(app: express.Application) {
  app.get(
    '/admin/doctors',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.DOCTORS_READ),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 10);
      const query = queryText(req, 'q').trim();
      const status = queryText(req, 'status').toUpperCase();
      const sortBy = queryText(req, 'sortBy');
      const sortDirection = queryText(req, 'sortDirection').toLowerCase() === 'asc' ? 'asc' : 'desc';

      const where = {
        role: Role.DOCTOR,
        ...(status === 'ACTIVE' ? { isActive: true } : {}),
        ...(status === 'INACTIVE' ? { isActive: false } : {}),
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' as const } },
                { email: { contains: query, mode: 'insensitive' as const } },
                { mobile: { contains: query, mode: 'insensitive' as const } },
                { doctorProfile: { specialty: { contains: query, mode: 'insensitive' as const } } }
              ]
            }
          : {})
      };

      const orderBy =
        sortBy === 'name'
          ? ({ name: sortDirection } as const)
          : sortBy === 'status'
            ? ({ isActive: sortDirection } as const)
            : ({ createdAt: sortDirection } as const);

      const total = await prisma.user.count({ where });
      const doctors = await prisma.user.findMany({
        where,
        select: { ...publicUserSelect, isActive: true, createdAt: true, doctorProfile: true },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      res.json({
        doctors,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    })
  );

  app.get(
    '/admin/doctors/pending',
    authRequired,
    allowRoles(Role.ADMIN),
    requirePermissions(PERMISSIONS.DOCTORS_READ),
    asyncRoute(async (req, res) => {
      const page = queryPositiveInt(req, 'page', 1);
      const pageSize = queryPositiveInt(req, 'pageSize', 10);
      const query = queryText(req, 'q').trim();

      const where = {
        role: Role.DOCTOR,
        isActive: false,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' as const } },
                { email: { contains: query, mode: 'insensitive' as const } },
                { mobile: { contains: query, mode: 'insensitive' as const } },
                { doctorProfile: { specialty: { contains: query, mode: 'insensitive' as const } } }
              ]
            }
          : {})
      };

      const total = await prisma.user.count({ where });
      const pendingDoctors = await prisma.user.findMany({
        where,
        select: { ...publicUserSelect, isActive: true, createdAt: true, doctorProfile: true },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      res.json({
        pendingDoctors,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize))
        }
      });
    })
  );
}
