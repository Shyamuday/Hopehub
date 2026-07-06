export type SalaryFormModel = {
  basic: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowance: number;
  employerPf: number;
  employeePf: number;
  employerEsi: number;
  employeeEsi: number;
  professionalTax: number;
  tds: number;
  otherDeduction: number;
  notes: string;
};

export const EMPTY_SALARY_FORM: SalaryFormModel = {
  basic: 0,
  hra: 0,
  conveyance: 0,
  medicalAllowance: 0,
  specialAllowance: 0,
  otherAllowance: 0,
  employerPf: 0,
  employeePf: 0,
  employerEsi: 0,
  employeeEsi: 0,
  professionalTax: 0,
  tds: 0,
  otherDeduction: 0,
  notes: ''
};

export const SALARY_EARNING_FIELDS: Array<{ key: keyof SalaryFormModel; label: string }> = [
  { key: 'basic', label: 'Basic' },
  { key: 'hra', label: 'HRA' },
  { key: 'conveyance', label: 'Conveyance' },
  { key: 'medicalAllowance', label: 'Medical allowance' },
  { key: 'specialAllowance', label: 'Special allowance' },
  { key: 'otherAllowance', label: 'Other allowances' }
];

export const SALARY_DEDUCTION_FIELDS: Array<{ key: keyof SalaryFormModel; label: string }> = [
  { key: 'employeePf', label: 'Employee PF' },
  { key: 'employeeEsi', label: 'Employee ESIC' },
  { key: 'professionalTax', label: 'Professional tax' },
  { key: 'tds', label: 'TDS' },
  { key: 'otherDeduction', label: 'Other deductions' }
];

export const SALARY_EMPLOYER_FIELDS: Array<{ key: keyof SalaryFormModel; label: string }> = [
  { key: 'employerPf', label: 'Employer PF' },
  { key: 'employerEsi', label: 'Employer ESIC' }
];

export function rupeesToPaise(value: number) {
  return Math.round((value || 0) * 100);
}

export function paiseToRupees(paise: number) {
  return (paise || 0) / 100;
}

export function computeSalaryPreview(form: SalaryFormModel) {
  const gross =
    form.basic +
    form.hra +
    form.conveyance +
    form.medicalAllowance +
    form.specialAllowance +
    form.otherAllowance;
  const employeeDeductions =
    form.employeePf + form.employeeEsi + form.professionalTax + form.tds + form.otherDeduction;
  const employerContributions = form.employerPf + form.employerEsi;
  const net = Math.max(0, gross - employeeDeductions);
  const ctc = gross + employerContributions;
  return { gross, net, ctc, employeeDeductions, employerContributions };
}

export function salaryFormToPayload(form: SalaryFormModel) {
  return {
    basicPaise: rupeesToPaise(form.basic),
    hraPaise: rupeesToPaise(form.hra),
    conveyancePaise: rupeesToPaise(form.conveyance),
    medicalAllowancePaise: rupeesToPaise(form.medicalAllowance),
    specialAllowancePaise: rupeesToPaise(form.specialAllowance),
    otherAllowancePaise: rupeesToPaise(form.otherAllowance),
    employerPfPaise: rupeesToPaise(form.employerPf),
    employeePfPaise: rupeesToPaise(form.employeePf),
    employerEsiPaise: rupeesToPaise(form.employerEsi),
    employeeEsiPaise: rupeesToPaise(form.employeeEsi),
    professionalTaxPaise: rupeesToPaise(form.professionalTax),
    tdsPaise: rupeesToPaise(form.tds),
    otherDeductionPaise: rupeesToPaise(form.otherDeduction),
    notes: form.notes.trim() || null
  };
}

export function salaryApiToForm(salary: {
  earnings?: Record<string, number>;
  deductions?: Record<string, number>;
  employerContributions?: Record<string, number>;
  notes?: string | null;
}): SalaryFormModel {
  const e = salary.earnings ?? {};
  const d = salary.deductions ?? {};
  const er = salary.employerContributions ?? {};
  return {
    basic: paiseToRupees(e['basicPaise'] ?? 0),
    hra: paiseToRupees(e['hraPaise'] ?? 0),
    conveyance: paiseToRupees(e['conveyancePaise'] ?? 0),
    medicalAllowance: paiseToRupees(e['medicalAllowancePaise'] ?? 0),
    specialAllowance: paiseToRupees(e['specialAllowancePaise'] ?? 0),
    otherAllowance: paiseToRupees(e['otherAllowancePaise'] ?? 0),
    employeePf: paiseToRupees(d['employeePfPaise'] ?? 0),
    employeeEsi: paiseToRupees(d['employeeEsiPaise'] ?? 0),
    professionalTax: paiseToRupees(d['professionalTaxPaise'] ?? 0),
    tds: paiseToRupees(d['tdsPaise'] ?? 0),
    otherDeduction: paiseToRupees(d['otherDeductionPaise'] ?? 0),
    employerPf: paiseToRupees(er['employerPfPaise'] ?? 0),
    employerEsi: paiseToRupees(er['employerEsiPaise'] ?? 0),
    notes: salary.notes ?? ''
  };
}
