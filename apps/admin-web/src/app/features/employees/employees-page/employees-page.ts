import { Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { buildDetailRows, DetailRowsComponent, HR_LETTER_META_FIELDS } from '@vitalis/platform-ui';
import { AdminApi } from '../../../core/services/admin-api';
import { SEARCH_DEBOUNCE_MS, TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { PAISE_PER_RUPEE } from '../../../shared/constants/currency.constants';
import { FILTER_ALL } from '../../../shared/constants/filter.constants';
import {
  DEFAULT_EMPLOYEE_STATUS,
  EMPLOYEE_STATUS_COLORS,
  EMPLOYEE_STATUS_FALLBACK_COLOR,
  EMPLOYEE_STATUS_FILTER_OPTIONS,
  type EmployeeStatus
} from '../../hr/constants/employee-status.constants';
import { EMPLOYEE_TYPE_FILTER_OPTIONS } from '../../hr/constants/employee-type.constants';
import { DEFAULT_CLINIC_NAME } from '../../hr/constants/organization.constants';
import {
  DEFAULT_WORK_SHIFT,
  WEEK_DAYS,
  WORK_SHIFT_LABELS,
  type WorkShift
} from '../../hr/constants/shift.constants';

function emptyProfileForm() {
  return {
    employeeId: '',
    designation: '',
    department: '',
    phone: '',
    email: '',
    address: '',
    joiningDate: '',
    probationEndDate: '',
    workShift: DEFAULT_WORK_SHIFT,
    shiftStart: '',
    shiftEnd: '',
    weeklyOffDays: [] as string[],
    emergencyContact: '',
    emergencyPhone: '',
    employeeStatus: DEFAULT_EMPLOYEE_STATUS
  };
}

@Component({
  selector: 'app-employees-page',
  imports: [FormField, DatePipe, DetailRowsComponent],
  templateUrl: './employees-page.html',
  styleUrl: './employees-page.scss'
})
export class EmployeesPage implements OnInit {
  private api = inject(AdminApi);

  readonly defaultClinicName = DEFAULT_CLINIC_NAME;

  employees = signal<any[]>([]);
  loading = signal(true);
  error = signal('');
  activeFilter = signal<string>(FILTER_ALL);
  activeStatus = signal<string>(FILTER_ALL);

  readonly searchModel = signal({ q: '' });
  readonly searchForm = form(this.searchModel);

  drawerOpen = signal(false);
  selected = signal<any>(null);
  tab = signal<'profile'|'shift'|'assign'|'letter'>('profile');
  saving = signal(false);
  letterLoading = signal(false);
  letter = signal<Record<string,any> | null>(null);
  storesLoading = signal(false);
  stores = signal<any[]>([]);
  assignOnline = signal(true);

  readonly profileModel = signal(emptyProfileForm());
  readonly profileForm = form(this.profileModel);
  readonly salaryModel = signal({ value: 0 });
  readonly salaryForm = form(this.salaryModel);
  readonly assignModel = signal({ storeId: '' });
  readonly assignForm = form(this.assignModel);

  toast = signal('');

  filters = [...EMPLOYEE_TYPE_FILTER_OPTIONS];
  statusFilters = [...EMPLOYEE_STATUS_FILTER_OPTIONS];
  shifts = Object.entries(WORK_SHIFT_LABELS).map(([value, label]) => ({ value: value as WorkShift, label }));
  days = WEEK_DAYS;

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getHrEmployees({
      q: this.searchModel().q,
      type: this.activeFilter(),
      status: this.activeStatus()
    })
      .then(r => { this.employees.set(r.employees); this.loading.set(false); })
      .catch(() => { this.loading.set(false); this.error.set('Could not load employees. Check your connection and try again.'); });
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), SEARCH_DEBOUNCE_MS);
  }

  setFilter(v: string): void { this.activeFilter.set(v); this.load(); }
  setStatus(v: string): void { this.activeStatus.set(v); this.load(); }

  open(e: any): void {
    this.selected.set(e);
    this.letter.set(null);
    this.tab.set('profile');
    this.profileModel.set({
      employeeId: e.employeeId,
      designation: e.designation,
      department: e.department,
      phone: e.phone,
      email: e.email,
      address: e.address,
      joiningDate: e.joiningDate ? e.joiningDate.slice(0,10) : '',
      probationEndDate: e.probationEndDate ? e.probationEndDate.slice(0,10) : '',
      workShift: e.workShift ?? DEFAULT_WORK_SHIFT,
      shiftStart: e.shiftStart ?? '',
      shiftEnd: e.shiftEnd ?? '',
      weeklyOffDays: [...(e.weeklyOffDays ?? [])],
      emergencyContact: e.emergencyContact,
      emergencyPhone: e.emergencyPhone,
      employeeStatus: e.employeeStatus ?? DEFAULT_EMPLOYEE_STATUS
    });
    this.salaryModel.set({ value: e.salaryPerMonth ? e.salaryPerMonth / PAISE_PER_RUPEE : 0 });
    this.assignOnline.set(e.isOnline !== false);
    this.assignModel.set({ storeId: e.clinicStore?.id ?? '' });
    this.drawerOpen.set(true);
  }

  close(): void { this.drawerOpen.set(false); }

  async saveProfile(): Promise<void> {
    if (!this.selected()) return;
    this.saving.set(true);
    const payload = {
      ...this.profileModel(),
      salaryPerMonth: Math.round(this.salaryModel().value * PAISE_PER_RUPEE)
    };
    try {
      if (this.selected().empType === 'DOCTOR') {
        await this.api.updateHrDoctor(this.selected().id, payload);
      } else {
        await this.api.updateHrStoreStaff(this.selected().id, payload);
      }
      this.employees.update(list => list.map(e => e.id === this.selected().id ? { ...e, ...payload } : e));
      this.showToast('Saved ✓');
    } finally { this.saving.set(false); }
  }

  async saveAssignment(): Promise<void> {
    if (!this.selected()) return;
    this.saving.set(true);
    try {
      await this.api.setDoctorAssignment(this.selected().id, {
        isOnline: this.assignOnline(),
        clinicStoreId: this.assignOnline() ? null : this.assignModel().storeId
      });
      this.showToast('Assignment saved ✓');
    } finally { this.saving.set(false); }
  }

  openLetter(): void {
    this.tab.set('letter');
    if (!this.letter() && !this.letterLoading()) {
      this.letterLoading.set(true);
      const fn = this.selected().empType === 'DOCTOR'
        ? this.api.getDoctorLetter(this.selected().id)
        : this.api.getStoreStaffLetter(this.selected().id);
      fn.then(r => { this.letter.set(r.letter?.content ?? {}); this.letterLoading.set(false); })
        .catch(() => this.letterLoading.set(false));
    }
    if (this.stores().length === 0) {
      this.storesLoading.set(true);
      this.api.getAdminStores().then(r => { this.stores.set(r.stores); this.storesLoading.set(false); }).catch(() => this.storesLoading.set(false));
    }
  }

  async generate(): Promise<void> {
    this.letterLoading.set(true);
    try {
      const r = this.selected().empType === 'DOCTOR'
        ? await this.api.generateDoctorLetter(this.selected().id)
        : await this.api.generateStoreStaffLetter(this.selected().id);
      this.letter.set((r as any).letter?.content ?? {});
    } finally { this.letterLoading.set(false); }
  }

  async regen(): Promise<void> { this.letter.set(null); await this.generate(); }
  print(): void { window.print(); }

  statusColor(s: EmployeeStatus): string { return EMPLOYEE_STATUS_COLORS[s] ?? EMPLOYEE_STATUS_FALLBACK_COLOR; }
  isOff(d: string): boolean { return (this.profileModel().weeklyOffDays ?? []).includes(d); }
  toggleOff(d: string): void {
    const profile = this.profileModel();
    const c = profile.weeklyOffDays ?? [];
    this.profileModel.set({
      ...profile,
      weeklyOffDays: c.includes(d) ? c.filter((x: string) => x !== d) : [...c, d]
    });
  }

  setWorkShift(value: WorkShift): void {
    this.profileModel.update((profile) => ({ ...profile, workShift: value }));
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }

  letterMetaRows(content: Record<string, unknown>, dateFormat = 'dd MMM yyyy') {
    const datePipe = new DatePipe('en-IN');
    return buildDetailRows(
      {
        referenceLabel: 'Ref',
        referenceNumber: String(content['letterNumber'] ?? ''),
        issuedDate: datePipe.transform(content['issuedDate'], dateFormat) ?? ''
      },
      HR_LETTER_META_FIELDS
    );
  }
}
