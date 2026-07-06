import type { Request, Response, Router } from 'express';
import { DoctorCompensationModel, EmployeeType, Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../utils/helpers.js';
import { staffHasAllPermissions, PERMISSIONS } from '../../staff-permissions.js';
import { serializeDoctorCompensation } from '../../services/doctor-compensation.js';
import {
  computeSalaryTotals,
  parseSalaryInput,
  serializeSalaryRecord,
  type SalaryComponentInput
} from '../../services/salary-structure.js';

function requireAdminOnly(req: Request, res: Response): boolean {
  if (!req.user || req.user.role !== Role.ADMIN) {
    res.status(403).json({ message: 'Only platform admins can manage salary structures.' });
    return false;
  }
  return true;
}

function canViewSalary(req: Request): boolean {
  if (!req.user) return false;
  if (req.user.role === Role.ADMIN || req.user.role === Role.HR) {
    return staffHasAllPermissions(req.user, PERMISSIONS.PAYMENTS_READ);
  }
  return false;
}

async function loadEmployee(empType: EmployeeType, id: string) {
  if (empType === EmployeeType.DOCTOR) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        salaryStructure: true
      }
    });
    if (!doctor) return null;
    return {
      empType,
      id: doctor.id,
      name: doctor.user.name,
      designation: doctor.designation,
      department: doctor.department,
      employeeStatus: doctor.employeeStatus,
      salaryPerMonth: doctor.salaryPerMonth,
      salaryStructure: doctor.salaryStructure,
      compensation: serializeDoctorCompensation(doctor)
    };
  }

  const staff = await prisma.storeStaff.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true, code: true } },
      salaryStructure: true
    }
  });
  if (!staff) return null;
  return {
    empType,
    id: staff.id,
    name: staff.name,
    designation: staff.designation,
    department: staff.department ?? staff.store.name,
    employeeStatus: staff.employeeStatus,
    salaryPerMonth: staff.salaryPerMonth,
    salaryStructure: staff.salaryStructure
  };
}

async function syncLegacyGross(empType: EmployeeType, id: string, grossPaise: number) {
  if (empType === EmployeeType.DOCTOR) {
    await prisma.doctor.update({ where: { id }, data: { salaryPerMonth: grossPaise } });
  } else {
    await prisma.storeStaff.update({ where: { id }, data: { salaryPerMonth: grossPaise } });
  }
}

function buildSalaryPayload(components: SalaryComponentInput, notes?: string | null, updatedById?: string) {
  const totals = computeSalaryTotals(components);
  return {
    ...components,
    grossPaise: totals.grossPaise,
    netPaise: totals.netPaise,
    ctcPaise: totals.ctcPaise,
    notes: notes ?? null,
    updatedById: updatedById ?? null,
    effectiveFrom: new Date()
  };
}

export function registerAdminSalaryRoutes(router: Router) {
  router.get(
    '/admin/salary/employees',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      if (!canViewSalary(req)) {
        return res.status(403).json({ message: 'Insufficient permissions to view salary data.' });
      }

      const q = String(req.query.q ?? '').trim().toLowerCase();
      const typeFilter = String(req.query.type ?? 'ALL');

      const [doctors, staff] = await Promise.all([
        typeFilter === 'ALL' || typeFilter === 'DOCTOR'
          ? prisma.doctor.findMany({
              include: {
                user: { select: { name: true } },
                salaryStructure: { select: { grossPaise: true, netPaise: true, ctcPaise: true, updatedAt: true } }
              },
              orderBy: { user: { name: 'asc' } }
            })
          : [],
        typeFilter === 'ALL' || typeFilter === 'STORE_STAFF'
          ? prisma.storeStaff.findMany({
              include: {
                store: { select: { name: true } },
                salaryStructure: { select: { grossPaise: true, netPaise: true, ctcPaise: true, updatedAt: true } }
              },
              orderBy: { name: 'asc' }
            })
          : []
      ]);

      const rows = [
        ...doctors.map((d) => ({
          empType: 'DOCTOR' as const,
          id: d.id,
          name: d.user.name,
          designation: d.designation,
          department: d.department,
          employeeStatus: d.employeeStatus,
          grossPaise: d.salaryStructure?.grossPaise ?? d.salaryPerMonth ?? 0,
          netPaise: d.salaryStructure?.netPaise ?? d.salaryPerMonth ?? 0,
          ctcPaise: d.salaryStructure?.ctcPaise ?? d.salaryPerMonth ?? 0,
          hasStructure: Boolean(d.salaryStructure),
          salaryUpdatedAt: d.salaryStructure?.updatedAt ?? null
        })),
        ...staff.map((s) => ({
          empType: 'STORE_STAFF' as const,
          id: s.id,
          name: s.name,
          designation: s.designation,
          department: s.department ?? s.store.name,
          employeeStatus: s.employeeStatus,
          grossPaise: s.salaryStructure?.grossPaise ?? s.salaryPerMonth ?? 0,
          netPaise: s.salaryStructure?.netPaise ?? s.salaryPerMonth ?? 0,
          ctcPaise: s.salaryStructure?.ctcPaise ?? s.salaryPerMonth ?? 0,
          hasStructure: Boolean(s.salaryStructure),
          salaryUpdatedAt: s.salaryStructure?.updatedAt ?? null
        }))
      ]
        .filter((row) => {
          if (!q) return true;
          return (
            row.name.toLowerCase().includes(q) ||
            (row.designation ?? '').toLowerCase().includes(q) ||
            (row.department ?? '').toLowerCase().includes(q)
          );
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({ employees: rows });
    })
  );

  router.get(
    '/admin/salary/:empType/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      if (!canViewSalary(req)) {
        return res.status(403).json({ message: 'Insufficient permissions to view salary data.' });
      }

      const empType = z.enum(['DOCTOR', 'STORE_STAFF']).parse(req.params.empType);
      const id = z.string().min(1).parse(req.params.id);
      const employee = await loadEmployee(empType, id);
      if (!employee) return res.status(404).json({ message: 'Employee not found.' });

      const structure = employee.salaryStructure;
      const totals = structure
        ? computeSalaryTotals(structure)
        : computeSalaryTotals({
            basicPaise: employee.salaryPerMonth ?? 0,
            hraPaise: 0,
            conveyancePaise: 0,
            medicalAllowancePaise: 0,
            specialAllowancePaise: 0,
            otherAllowancePaise: 0,
            employerPfPaise: 0,
            employeePfPaise: 0,
            employerEsiPaise: 0,
            employeeEsiPaise: 0,
            professionalTaxPaise: 0,
            tdsPaise: 0,
            otherDeductionPaise: 0
          });

      res.json({
        employee: {
          empType: employee.empType,
          id: employee.id,
          name: employee.name,
          designation: employee.designation,
          department: employee.department,
          employeeStatus: employee.employeeStatus,
          legacyGrossPaise: employee.salaryPerMonth ?? 0
        },
        compensation: 'compensation' in employee ? employee.compensation : null,
        salary: structure
          ? serializeSalaryRecord({ ...structure, ...totals })
          : {
              ...serializeSalaryRecord({
                id: '',
                employeeType: empType,
                doctorId: empType === 'DOCTOR' ? id : null,
                storeStaffId: empType === 'STORE_STAFF' ? id : null,
                effectiveFrom: new Date(),
                notes: null,
                updatedAt: new Date(),
                basicPaise: employee.salaryPerMonth ?? 0,
                hraPaise: 0,
                conveyancePaise: 0,
                medicalAllowancePaise: 0,
                specialAllowancePaise: 0,
                otherAllowancePaise: 0,
                employerPfPaise: 0,
                employeePfPaise: 0,
                employerEsiPaise: 0,
                employeeEsiPaise: 0,
                professionalTaxPaise: 0,
                tdsPaise: 0,
                otherDeductionPaise: 0,
                ...totals
              }),
              isLegacyOnly: true
            },
        canEdit: req.user?.role === Role.ADMIN
      });
    })
  );

  router.put(
    '/admin/salary/:empType/:id',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      if (!requireAdminOnly(req, res)) return;

      const empType = z.enum(['DOCTOR', 'STORE_STAFF']).parse(req.params.empType);
      const id = z.string().min(1).parse(req.params.id);
      const body = z
        .object({
          notes: z.string().max(500).optional().nullable(),
          compensationModel: z.nativeEnum(DoctorCompensationModel).optional(),
          consultationSharePercent: z.number().int().min(0).max(100).optional(),
          consultationFee: z.number().min(0).optional()
        })
        .passthrough()
        .parse(req.body);

      const employee = await loadEmployee(empType, id);
      if (!employee) return res.status(404).json({ message: 'Employee not found.' });

      if (empType === EmployeeType.DOCTOR) {
        const compUpdate: {
          compensationModel?: DoctorCompensationModel;
          consultationSharePercent?: number;
          consultationFee?: number | null;
          salaryPerMonth?: number | null;
        } = {};
        if (body.compensationModel !== undefined) compUpdate.compensationModel = body.compensationModel;
        if (body.consultationSharePercent !== undefined) {
          compUpdate.consultationSharePercent = body.consultationSharePercent;
        }
        if (body.consultationFee !== undefined) {
          compUpdate.consultationFee = Math.round(body.consultationFee * 100);
        }
        if (compUpdate.compensationModel === DoctorCompensationModel.CONSULT_ONLY) {
          compUpdate.salaryPerMonth = 0;
          await prisma.employeeSalary.deleteMany({ where: { doctorId: id } });
        }
        if (Object.keys(compUpdate).length) {
          await prisma.doctor.update({ where: { id }, data: compUpdate });
        }
      }

      const components = parseSalaryInput(body as Record<string, unknown>);
      const isConsultOnlyDoctor =
        empType === EmployeeType.DOCTOR &&
        (body.compensationModel === DoctorCompensationModel.CONSULT_ONLY ||
          ('compensation' in employee && employee.compensation?.compensationModel === 'CONSULT_ONLY'));

      if (isConsultOnlyDoctor) {
        return res.json({
          message: 'Doctor compensation settings saved. Consult-only doctors do not receive a salary structure.',
          compensation:
            empType === EmployeeType.DOCTOR
              ? serializeDoctorCompensation(
                  await prisma.doctor.findUniqueOrThrow({
                    where: { id },
                    select: {
                      compensationModel: true,
                      consultationSharePercent: true,
                      consultationFee: true
                    }
                  })
                )
              : null
        });
      }

      const payload = buildSalaryPayload(components, body.notes, req.user!.id);
      const totals = computeSalaryTotals(components);

      const salary = await prisma.employeeSalary.upsert({
        where:
          empType === EmployeeType.DOCTOR ? { doctorId: id } : { storeStaffId: id },
        create: {
          employeeType: empType,
          doctorId: empType === EmployeeType.DOCTOR ? id : null,
          storeStaffId: empType === EmployeeType.STORE_STAFF ? id : null,
          ...payload
        },
        update: payload
      });

      await syncLegacyGross(empType, id, totals.grossPaise);

      res.json({
        salary: serializeSalaryRecord({ ...salary, ...totals }),
        message: 'Salary structure saved.'
      });
    })
  );
}
