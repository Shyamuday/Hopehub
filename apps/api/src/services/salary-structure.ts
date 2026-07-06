import { EmployeeType } from '@prisma/client';

export type SalaryComponentInput = {
  basicPaise: number;
  hraPaise: number;
  conveyancePaise: number;
  medicalAllowancePaise: number;
  specialAllowancePaise: number;
  otherAllowancePaise: number;
  employerPfPaise: number;
  employeePfPaise: number;
  employerEsiPaise: number;
  employeeEsiPaise: number;
  professionalTaxPaise: number;
  tdsPaise: number;
  otherDeductionPaise: number;
};

export type SalaryTotals = {
  grossPaise: number;
  netPaise: number;
  ctcPaise: number;
  totalEmployeeDeductionsPaise: number;
  totalEmployerContributionsPaise: number;
};

export function nonNegativeInt(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n);
}

export function computeSalaryTotals(components: SalaryComponentInput): SalaryTotals {
  const grossPaise =
    components.basicPaise +
    components.hraPaise +
    components.conveyancePaise +
    components.medicalAllowancePaise +
    components.specialAllowancePaise +
    components.otherAllowancePaise;

  const totalEmployeeDeductionsPaise =
    components.employeePfPaise +
    components.employeeEsiPaise +
    components.professionalTaxPaise +
    components.tdsPaise +
    components.otherDeductionPaise;

  const totalEmployerContributionsPaise = components.employerPfPaise + components.employerEsiPaise;
  const netPaise = Math.max(0, grossPaise - totalEmployeeDeductionsPaise);
  const ctcPaise = grossPaise + totalEmployerContributionsPaise;

  return {
    grossPaise,
    netPaise,
    ctcPaise,
    totalEmployeeDeductionsPaise,
    totalEmployerContributionsPaise
  };
}

export function parseSalaryInput(body: Record<string, unknown>): SalaryComponentInput {
  return {
    basicPaise: nonNegativeInt(body.basicPaise),
    hraPaise: nonNegativeInt(body.hraPaise),
    conveyancePaise: nonNegativeInt(body.conveyancePaise),
    medicalAllowancePaise: nonNegativeInt(body.medicalAllowancePaise),
    specialAllowancePaise: nonNegativeInt(body.specialAllowancePaise),
    otherAllowancePaise: nonNegativeInt(body.otherAllowancePaise),
    employerPfPaise: nonNegativeInt(body.employerPfPaise),
    employeePfPaise: nonNegativeInt(body.employeePfPaise),
    employerEsiPaise: nonNegativeInt(body.employerEsiPaise),
    employeeEsiPaise: nonNegativeInt(body.employeeEsiPaise),
    professionalTaxPaise: nonNegativeInt(body.professionalTaxPaise),
    tdsPaise: nonNegativeInt(body.tdsPaise),
    otherDeductionPaise: nonNegativeInt(body.otherDeductionPaise)
  };
}

export function serializeSalaryRecord(
  record: {
    id: string;
    employeeType: EmployeeType;
    doctorId: string | null;
    storeStaffId: string | null;
    effectiveFrom: Date;
    notes: string | null;
    updatedAt: Date;
  } & SalaryComponentInput &
    SalaryTotals
) {
  return {
    id: record.id,
    employeeType: record.employeeType,
    doctorId: record.doctorId,
    storeStaffId: record.storeStaffId,
    earnings: {
      basicPaise: record.basicPaise,
      hraPaise: record.hraPaise,
      conveyancePaise: record.conveyancePaise,
      medicalAllowancePaise: record.medicalAllowancePaise,
      specialAllowancePaise: record.specialAllowancePaise,
      otherAllowancePaise: record.otherAllowancePaise
    },
    deductions: {
      employeePfPaise: record.employeePfPaise,
      employeeEsiPaise: record.employeeEsiPaise,
      professionalTaxPaise: record.professionalTaxPaise,
      tdsPaise: record.tdsPaise,
      otherDeductionPaise: record.otherDeductionPaise
    },
    employerContributions: {
      employerPfPaise: record.employerPfPaise,
      employerEsiPaise: record.employerEsiPaise
    },
    grossPaise: record.grossPaise,
    netPaise: record.netPaise,
    ctcPaise: record.ctcPaise,
    totalEmployeeDeductionsPaise: record.totalEmployeeDeductionsPaise,
    totalEmployerContributionsPaise: record.totalEmployerContributionsPaise,
    effectiveFrom: record.effectiveFrom,
    notes: record.notes,
    updatedAt: record.updatedAt
  };
}

export const EMPTY_SALARY_FORM = {
  basicPaise: 0,
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
  notes: ''
};
