import { DoctorCompensationModel, PaymentStatus } from '@prisma/client';
import { prisma } from '../db.js';
import {
  DEFAULT_DOCTOR_SHARE_PERCENT,
  doctorReceivesConsultationShare,
  doctorReceivesSalary,
  resolveDoctorSharePercent
} from './doctor-compensation.js';

export const DOCTOR_SHARE_PERCENT = DEFAULT_DOCTOR_SHARE_PERCENT;

export type MonthRange = {
  month: string;
  year: number;
  monthNum: number;
  monthStart: Date;
  monthEnd: Date;
  daysInMonth: number;
};

export function parseMonth(monthStr?: string): MonthRange {
  const month = monthStr ?? new Date().toISOString().slice(0, 7);
  const [year, monthNum] = month.split('-').map(Number);
  const monthStart = new Date(year, monthNum - 1, 1);
  const monthEnd = new Date(year, monthNum, 0);
  return {
    month,
    year,
    monthNum,
    monthStart,
    monthEnd,
    daysInMonth: monthEnd.getDate()
  };
}

export function calcNetSalary(salaryPaise: number | null | undefined, leaveDays: number, daysInMonth: number): number {
  if (!salaryPaise) return 0;
  const dailyRate = salaryPaise / daysInMonth;
  return Math.round(salaryPaise - dailyRate * leaveDays);
}

export async function getLeaveDaysMap(monthStart: Date, monthEnd: Date): Promise<Map<string, number>> {
  const approvedLeaves = await prisma.leaveRequest.findMany({
    where: {
      status: 'APPROVED',
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart }
    },
    select: { doctorId: true, storeStaffId: true, startDate: true, endDate: true }
  });

  const leaveDaysMap = new Map<string, number>();
  for (const leave of approvedLeaves) {
    const overlapStart = leave.startDate < monthStart ? monthStart : leave.startDate;
    const overlapEnd = leave.endDate > monthEnd ? monthEnd : leave.endDate;
    const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const empId = leave.doctorId ?? leave.storeStaffId ?? '';
    if (empId) {
      leaveDaysMap.set(empId, (leaveDaysMap.get(empId) ?? 0) + days);
    }
  }
  return leaveDaysMap;
}

function monthEndInclusive(monthEnd: Date): Date {
  return new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59, 999);
}

export async function getDoctorConsultationEarnings(
  doctorUserId: string,
  monthStart: Date,
  monthEnd: Date,
  sharePercent = DEFAULT_DOCTOR_SHARE_PERCENT
) {
  const payments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PAID,
      createdAt: { gte: monthStart, lte: monthEndInclusive(monthEnd) },
      consultation: { assignedDoctorId: doctorUserId }
    },
    select: { amountInPaise: true }
  });

  const grossInPaise = payments.reduce((sum, p) => sum + p.amountInPaise, 0);
  const consultationEarningsInPaise = Math.round((grossInPaise * sharePercent) / 100);
  return {
    doctorSharePercent: sharePercent,
    paidConsultations: payments.length,
    consultationGrossInPaise: grossInPaise,
    consultationEarningsInPaise
  };
}

export type AdminPayrollRow = {
  id: string;
  empType: 'DOCTOR' | 'STORE_STAFF';
  name: string;
  designation: string | null;
  department: string | null;
  grossPaise: number;
  leaveDays: number;
  netPaise: number;
  employeeStatus: string;
  compensationModel?: DoctorCompensationModel;
  consultationSharePercent?: number;
  consultationEarningsPaise?: number;
  consultationGrossPaise?: number;
  paidConsultations?: number;
  totalEstimatedPayPaise?: number;
};

export async function buildAdminPayrollMonth(monthStr?: string, storeIds?: string[]) {
  const range = parseMonth(monthStr);
  const doctorWhere = storeIds?.length ? { clinicStoreId: { in: storeIds } } : {};
  const staffWhere = storeIds?.length ? { storeId: { in: storeIds } } : {};

  const [doctors, storeStaff, leaveDaysMap] = await Promise.all([
    prisma.doctor.findMany({
      where: { ...doctorWhere, employeeStatus: { not: 'TERMINATED' } },
      select: {
        id: true,
        userId: true,
        designation: true,
        department: true,
        salaryPerMonth: true,
        employeeStatus: true,
        compensationModel: true,
        consultationSharePercent: true,
        user: { select: { name: true } },
        salaryStructure: { select: { grossPaise: true, netPaise: true } }
      }
    }),
    prisma.storeStaff.findMany({
      where: { ...staffWhere, employeeStatus: { not: 'TERMINATED' } },
      select: {
        id: true,
        name: true,
        designation: true,
        department: true,
        salaryPerMonth: true,
        employeeStatus: true,
        store: { select: { name: true } },
        salaryStructure: { select: { grossPaise: true, netPaise: true } }
      }
    }),
    getLeaveDaysMap(range.monthStart, range.monthEnd)
  ]);

  const consultDoctorIds = doctors
    .filter((d) => doctorReceivesConsultationShare(d))
    .map((d) => d.userId);
  const shareByUserId = new Map(doctors.map((d) => [d.userId, resolveDoctorSharePercent(d)]));

  const consultTotals = new Map<
    string,
    { grossInPaise: number; earningsInPaise: number; paidConsultations: number; sharePercent: number }
  >();
  if (consultDoctorIds.length) {
    const payments = await prisma.payment.findMany({
      where: {
        status: PaymentStatus.PAID,
        createdAt: { gte: range.monthStart, lte: monthEndInclusive(range.monthEnd) },
        consultation: { assignedDoctorId: { in: consultDoctorIds } }
      },
      select: {
        amountInPaise: true,
        consultation: { select: { assignedDoctorId: true } }
      }
    });

    for (const payment of payments) {
      const userId = payment.consultation?.assignedDoctorId;
      if (!userId) continue;
      const sharePercent = shareByUserId.get(userId) ?? DEFAULT_DOCTOR_SHARE_PERCENT;
      const existing = consultTotals.get(userId) ?? {
        grossInPaise: 0,
        earningsInPaise: 0,
        paidConsultations: 0,
        sharePercent
      };
      existing.grossInPaise += payment.amountInPaise;
      existing.earningsInPaise += Math.round((payment.amountInPaise * sharePercent) / 100);
      existing.paidConsultations += 1;
      consultTotals.set(userId, existing);
    }
  }

  const doctorRows: AdminPayrollRow[] = doctors.map((d) => {
    const leaveDays = leaveDaysMap.get(d.id) ?? 0;
    const grossPaise = doctorReceivesSalary(d)
      ? (d.salaryStructure?.grossPaise ?? d.salaryPerMonth ?? 0)
      : 0;
    const netPaise = doctorReceivesSalary(d)
      ? d.salaryStructure?.netPaise != null
        ? Math.round(d.salaryStructure.netPaise - ((d.salaryStructure.netPaise / range.daysInMonth) * leaveDays))
        : calcNetSalary(grossPaise, leaveDays, range.daysInMonth)
      : 0;
    const consult = consultTotals.get(d.userId);
    const consultationEarningsPaise = doctorReceivesConsultationShare(d) ? (consult?.earningsInPaise ?? 0) : 0;

    return {
      id: d.id,
      empType: 'DOCTOR',
      name: d.user?.name ?? '—',
      designation: d.designation,
      department: d.department,
      grossPaise,
      leaveDays,
      netPaise,
      employeeStatus: d.employeeStatus,
      compensationModel: d.compensationModel,
      consultationSharePercent: resolveDoctorSharePercent(d),
      consultationEarningsPaise,
      consultationGrossPaise: consult?.grossInPaise ?? 0,
      paidConsultations: consult?.paidConsultations ?? 0,
      totalEstimatedPayPaise: netPaise + consultationEarningsPaise
    };
  });

  const staffRows: AdminPayrollRow[] = storeStaff.map((s) => {
    const leaveDays = leaveDaysMap.get(s.id) ?? 0;
    const grossPaise = s.salaryStructure?.grossPaise ?? s.salaryPerMonth ?? 0;
    const netPaise =
      s.salaryStructure?.netPaise != null
        ? Math.round(s.salaryStructure.netPaise - ((s.salaryStructure.netPaise / range.daysInMonth) * leaveDays))
        : calcNetSalary(grossPaise, leaveDays, range.daysInMonth);

    return {
      id: s.id,
      empType: 'STORE_STAFF',
      name: s.name,
      designation: s.designation,
      department: s.department ?? s.store?.name ?? null,
      grossPaise,
      leaveDays,
      netPaise,
      employeeStatus: s.employeeStatus,
      totalEstimatedPayPaise: netPaise
    };
  });

  const rows = [...doctorRows, ...staffRows];
  const totalGross = rows.reduce((a, r) => a + r.grossPaise, 0);
  const totalNet = rows.reduce((a, r) => a + r.netPaise, 0);
  const totalConsultEarnings = rows.reduce((a, r) => a + (r.consultationEarningsPaise ?? 0), 0);
  const totalEstimatedPay = rows.reduce((a, r) => a + (r.totalEstimatedPayPaise ?? r.netPaise), 0);
  const totalLeave = rows.reduce((a, r) => a + r.leaveDays, 0);

  return {
    month: range.month,
    rows,
    summary: {
      totalGross,
      totalNet,
      totalConsultEarnings,
      totalEstimatedPay,
      totalLeave,
      headcount: rows.length
    }
  };
}

export async function buildDoctorPayslip(doctorId: string, monthStr?: string) {
  const range = parseMonth(monthStr);
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { user: { select: { id: true, name: true, email: true } } }
  });
  if (!doctor) return null;

  const leaveDaysMap = await getLeaveDaysMap(range.monthStart, range.monthEnd);
  const leaveDays = leaveDaysMap.get(doctor.id) ?? 0;
  const grossPaise = doctorReceivesSalary(doctor) ? (doctor.salaryPerMonth ?? 0) : 0;
  const netPaise = doctorReceivesSalary(doctor)
    ? calcNetSalary(grossPaise, leaveDays, range.daysInMonth)
    : 0;
  const deductionPaise = grossPaise - netPaise;
  const sharePercent = resolveDoctorSharePercent(doctor);
  const consultation = doctorReceivesConsultationShare(doctor)
    ? await getDoctorConsultationEarnings(doctor.userId, range.monthStart, range.monthEnd, sharePercent)
    : {
        doctorSharePercent: sharePercent,
        paidConsultations: 0,
        consultationGrossInPaise: 0,
        consultationEarningsInPaise: 0
      };

  return {
    month: range.month,
    empType: 'DOCTOR' as const,
    employee: {
      id: doctor.id,
      name: doctor.user.name,
      email: doctor.user.email,
      designation: doctor.designation,
      department: doctor.department,
      employeeStatus: doctor.employeeStatus,
      compensationModel: doctor.compensationModel,
      consultationSharePercent: sharePercent,
      consultationFeePaise: doctor.consultationFee ?? 0
    },
    salary: {
      grossPaise,
      leaveDays,
      deductionPaise,
      netPaise
    },
    consultation,
    totalEstimatedPayInPaise: netPaise + consultation.consultationEarningsInPaise
  };
}

export async function buildStoreStaffPayslip(staffId: string, monthStr?: string) {
  const range = parseMonth(monthStr);
  const staff = await prisma.storeStaff.findUnique({
    where: { id: staffId },
    include: { store: { select: { id: true, name: true, code: true } } }
  });
  if (!staff) return null;

  const leaveDaysMap = await getLeaveDaysMap(range.monthStart, range.monthEnd);
  const leaveDays = leaveDaysMap.get(staff.id) ?? 0;
  const grossPaise = staff.salaryPerMonth ?? 0;
  const netPaise = calcNetSalary(grossPaise, leaveDays, range.daysInMonth);
  const deductionPaise = grossPaise - netPaise;

  return {
    month: range.month,
    empType: 'STORE_STAFF' as const,
    employee: {
      id: staff.id,
      name: staff.name,
      designation: staff.designation,
      department: staff.department ?? staff.store.name,
      store: staff.store,
      employeeStatus: staff.employeeStatus
    },
    salary: {
      grossPaise,
      leaveDays,
      deductionPaise,
      netPaise
    },
    totalEstimatedPayInPaise: netPaise
  };
}

export async function buildPayslipHistory(
  type: 'DOCTOR' | 'STORE_STAFF',
  id: string,
  months = 3
) {
  const history = [];
  const now = new Date();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.toISOString().slice(0, 7);
    const slip =
      type === 'DOCTOR'
        ? await buildDoctorPayslip(id, month)
        : await buildStoreStaffPayslip(id, month);
    if (slip) {
      history.push({
        month: slip.month,
        grossPaise: slip.salary.grossPaise,
        leaveDays: slip.salary.leaveDays,
        netPaise: slip.salary.netPaise,
        totalEstimatedPayInPaise: slip.totalEstimatedPayInPaise
      });
    }
  }
  return history;
}
