import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';
import { AdminAuth } from '../../../core/services/admin-auth';
import {
  EMPLOYEE_STATUS_COLORS,
  formatPaise,
  paiseToK,
  PAYROLL_TYPE_FILTERS
} from '../constants/payroll.constants';
import {
  computeSalaryPreview,
  EMPTY_SALARY_FORM,
  SALARY_DEDUCTION_FIELDS,
  SALARY_EARNING_FIELDS,
  SALARY_EMPLOYER_FIELDS,
  salaryApiToForm,
  salaryFormToPayload,
  type SalaryFormModel
} from '../constants/salary-structure.constants';
import {
  compensationApiToForm,
  compensationFormToPayload,
  COMPENSATION_MODEL_OPTIONS,
  EMPTY_DOCTOR_COMPENSATION_FORM,
  type DoctorCompensationFormModel
} from '../constants/doctor-compensation.constants';

interface PayrollRow {
  id: string;
  empType: string;
  name: string;
  designation: string | null;
  department: string | null;
  grossPaise: number;
  leaveDays: number;
  netPaise: number;
  employeeStatus: string;
  compensationModel?: string;
  consultationSharePercent?: number;
  consultationEarningsPaise?: number;
  consultationGrossPaise?: number;
  paidConsultations?: number;
  totalEstimatedPayPaise?: number;
}

type SalaryEmployeeRow = {
  empType: 'DOCTOR' | 'STORE_STAFF';
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
  employeeStatus: string;
  grossPaise: number;
  netPaise: number;
  ctcPaise: number;
  hasStructure: boolean;
};

@Component({
  selector: 'app-payroll-page',
  imports: [FormField],
  templateUrl: './payroll-page.html',
  styleUrl: './payroll-page.scss'
})
export class PayrollPage implements OnInit {
  private api = inject(AdminApi);
  private auth = inject(AdminAuth);

  readonly pageTab = signal<'summary' | 'salary'>('summary');
  readonly isAdmin = computed(() => this.auth.user()?.role === 'ADMIN');

  rows = signal<PayrollRow[]>([]);
  loading = signal(true);
  summary = signal({
    totalGross: 0,
    totalNet: 0,
    totalConsultEarnings: 0,
    totalEstimatedPay: 0,
    totalLeave: 0,
    headcount: 0
  });
  typeFilter = signal<string>('ALL');
  toast = signal('');

  readonly monthModel = signal({ selectedMonth: new Date().toISOString().slice(0, 7) });
  readonly monthForm = form(this.monthModel);
  readonly searchModel = signal({ q: '' });
  readonly searchForm = form(this.searchModel);

  typeFilters = PAYROLL_TYPE_FILTERS;

  salaryEmployees = signal<SalaryEmployeeRow[]>([]);
  salaryLoading = signal(false);
  salarySaving = signal(false);
  salaryTypeFilter = signal('ALL');
  selectedSalaryEmployee = signal<SalaryEmployeeRow | null>(null);
  salaryCanEdit = signal(false);
  readonly salarySearchModel = signal({ q: '' });
  readonly salarySearchForm = form(this.salarySearchModel);
  readonly salaryFormModel = signal<SalaryFormModel>({ ...EMPTY_SALARY_FORM });
  readonly salaryForm = form(this.salaryFormModel);
  readonly compensationFormModel = signal<DoctorCompensationFormModel>({ ...EMPTY_DOCTOR_COMPENSATION_FORM });
  readonly compensationForm = form(this.compensationFormModel);
  readonly compensationModelOptions = COMPENSATION_MODEL_OPTIONS;

  readonly earningFields = SALARY_EARNING_FIELDS;
  readonly deductionFields = SALARY_DEDUCTION_FIELDS;
  readonly employerFields = SALARY_EMPLOYER_FIELDS;

  readonly salaryPreview = computed(() => computeSalaryPreview(this.salaryFormModel()));

  ngOnInit(): void {
    this.load();
  }

  setPageTab(tab: 'summary' | 'salary') {
    this.pageTab.set(tab);
    if (tab === 'salary' && !this.salaryEmployees().length) {
      void this.loadSalaryEmployees();
    }
  }

  load(): void {
    this.loading.set(true);
    this.api
      .getPayroll(this.monthModel().selectedMonth)
      .then((r) => {
        this.rows.set(r.rows);
        this.summary.set(r.summary);
        this.loading.set(false);
      })
      .catch(() => this.loading.set(false));
  }

  filtered(): PayrollRow[] {
    const q = this.searchModel().q.toLowerCase();
    return this.rows().filter((r) => {
      if (this.typeFilter() !== 'ALL' && r.empType !== this.typeFilter()) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  filteredGross(): number {
    return this.filtered().reduce((a, r) => a + r.grossPaise, 0);
  }
  filteredNet(): number {
    return this.filtered().reduce((a, r) => a + r.netPaise, 0);
  }
  filteredConsultEarnings(): number {
    return this.filtered().reduce((a, r) => a + (r.consultationEarningsPaise ?? 0), 0);
  }
  filteredTotalPay(): number {
    return this.filtered().reduce((a, r) => a + (r.totalEstimatedPayPaise ?? r.netPaise), 0);
  }

  isConsultOnlyDoctor(): boolean {
    return this.compensationFormModel().compensationModel === 'CONSULT_ONLY';
  }

  fmt(paise: number): string {
    return formatPaise(paise);
  }
  paise2k(paise: number): string {
    return paiseToK(paise);
  }
  fmtRupees(amount: number): string {
    return amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  statusColor(s: string): string {
    return EMPLOYEE_STATUS_COLORS[s] ?? '#94a3b8';
  }

  filteredLeave(): number {
    return this.filtered().reduce((a, r) => a + r.leaveDays, 0);
  }

  exportCSV(): void {
    const rows = this.filtered();
    const header =
      'Name,Type,Designation,Department,Compensation Model,Gross (Rs),Leave Days,Deduction (Rs),Net Salary (Rs),Consult Share %,Consult Earnings (Rs),Total Est. Pay (Rs)';
    const lines = rows.map((r) => {
      const deduction = (r.grossPaise - r.netPaise) / 100;
      const consult = (r.consultationEarningsPaise ?? 0) / 100;
      const total = (r.totalEstimatedPayPaise ?? r.netPaise) / 100;
      return (
        `"${r.name}","${r.empType}","${r.designation ?? ''}","${r.department ?? ''}",` +
        `"${r.compensationModel ?? ''}",${r.grossPaise / 100},${r.leaveDays},${deduction},${r.netPaise / 100},` +
        `${r.consultationSharePercent ?? ''},${consult},${total}`
      );
    });
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${this.monthModel().selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('CSV exported ✓');
  }

  async loadSalaryEmployees() {
    this.salaryLoading.set(true);
    try {
      const res = await this.api.getSalaryEmployees({
        q: this.salarySearchModel().q,
        type: this.salaryTypeFilter()
      });
      this.salaryEmployees.set(res.employees);
    } finally {
      this.salaryLoading.set(false);
    }
  }

  async selectSalaryEmployee(employee: SalaryEmployeeRow) {
    this.selectedSalaryEmployee.set(employee);
    this.salaryLoading.set(true);
    try {
      const res = await this.api.getEmployeeSalary(employee.empType, employee.id);
      this.salaryCanEdit.set(res.canEdit);
      this.salaryFormModel.set(salaryApiToForm(res.salary));
      this.compensationFormModel.set(compensationApiToForm(res.compensation));
    } finally {
      this.salaryLoading.set(false);
    }
  }

  async saveSalaryStructure() {
    const employee = this.selectedSalaryEmployee();
    if (!employee || !this.salaryCanEdit()) return;
    this.salarySaving.set(true);
    try {
      await this.api.saveEmployeeSalary(employee.empType, employee.id, {
        ...salaryFormToPayload(this.salaryFormModel()),
        ...(employee.empType === 'DOCTOR' ? compensationFormToPayload(this.compensationFormModel()) : {})
      });
      this.showToast('Salary structure saved ✓');
      await this.loadSalaryEmployees();
      const preview = this.salaryPreview();
      this.selectedSalaryEmployee.set({
        ...employee,
        grossPaise: Math.round(preview.gross * 100),
        netPaise: Math.round(preview.net * 100),
        ctcPaise: Math.round(preview.ctc * 100),
        hasStructure: true
      });
    } catch {
      this.showToast('Could not save salary structure');
    } finally {
      this.salarySaving.set(false);
    }
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 2500);
  }
}
