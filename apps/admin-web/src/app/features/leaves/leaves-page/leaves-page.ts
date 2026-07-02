import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AdminApi } from '../../../core/services/admin-api';
import { PAGE_SIZES } from '../../../core/constants/pagination.constants';
import { SEARCH_DEBOUNCE_MS, TOAST_DURATION_MS } from '../../../core/constants/timing.constants';
import { FILTER_ALL } from '../../../shared/constants/filter.constants';
import { EMPLOYEE_TYPE_STAFF_FILTER_OPTIONS, EMPLOYEE_TYPES } from '../../hr/constants/employee-type.constants';
import {
  LEAVE_STATUS_FILTER_OPTIONS,
  LEAVE_STATUS_FALLBACK_STYLE,
  LEAVE_STATUS_STYLES,
  LEAVE_STATUSES
} from '../constants/leave-status.constants';
import {
  DEFAULT_LEAVE_TYPE,
  LEAVE_TYPE_COLORS,
  LEAVE_TYPE_FALLBACK_COLOR,
  LEAVE_TYPE_FALLBACK_ICON,
  LEAVE_TYPE_ICONS,
  LEAVE_TYPES
} from '../constants/leave-type.constants';

@Component({
  selector: 'app-leaves-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './leaves-page.html',
  styleUrl: './leaves-page.scss'
})
export class LeavesPage implements OnInit {
  private api = inject(AdminApi);

  leaves = signal<any[]>([]);
  loading = signal(true);
  total = signal(0);
  page = signal(1);
  pageSize = PAGE_SIZES.LEAVES;

  statusFilter = signal<string>(FILTER_ALL);
  empTypeFilter = signal<string>(FILTER_ALL);
  modal = signal<'add'|'reject'|null>(null);
  saving = signal(false);
  toast = signal('');
  formError = signal('');
  rejectNote = '';
  rejectTarget = signal<any>(null);
  empSearch = '';
  empResults = signal<any[]>([]);
  selectedEmp = signal<any>(null);

  addForm: any = {
    employeeType: EMPLOYEE_TYPES.DOCTOR,
    doctorId: '',
    storeStaffId: '',
    type: DEFAULT_LEAVE_TYPE,
    startDate: '',
    endDate: '',
    reason: ''
  };

  statusFilters = [...LEAVE_STATUS_FILTER_OPTIONS];
  typeFilters = [...EMPLOYEE_TYPE_STAFF_FILTER_OPTIONS];
  leaveTypes = LEAVE_TYPES;

  private empSearchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getAdminLeaves({ status: this.statusFilter(), empType: this.empTypeFilter(), page: this.page(), pageSize: this.pageSize })
      .then(r => { this.leaves.set(r.leaves); this.total.set(r.total); this.loading.set(false); })
      .catch(() => this.loading.set(false));
  }

  setStatus(v: string): void { this.statusFilter.set(v); this.page.set(1); this.load(); }
  setEmpType(v: string): void { this.empTypeFilter.set(v); this.page.set(1); this.load(); }
  prevPage(): void { if (this.page() > 1) { this.page.update(p => p - 1); this.load(); } }
  nextPage(): void { if (this.page() < this.totalPages()) { this.page.update(p => p + 1); this.load(); } }
  totalPages(): number { return Math.ceil(this.total() / this.pageSize); }

  empName(l: any): string {
    return l.doctor?.user?.name ?? l.storeStaff?.name ?? 'Unknown';
  }
  leaveColor(t: string): string { return LEAVE_TYPE_COLORS[t as keyof typeof LEAVE_TYPE_COLORS] ?? LEAVE_TYPE_FALLBACK_COLOR; }
  leaveIcon(t: string): string { return LEAVE_TYPE_ICONS[t as keyof typeof LEAVE_TYPE_ICONS] ?? LEAVE_TYPE_FALLBACK_ICON; }
  statusStyle(s: string): {bg:string,color:string} { return LEAVE_STATUS_STYLES[s as keyof typeof LEAVE_STATUS_STYLES] ?? LEAVE_STATUS_FALLBACK_STYLE; }

  async approve(l: any): Promise<void> {
    await this.api.updateAdminLeave(l.id, { status: LEAVE_STATUSES.APPROVED });
    this.leaves.update(list => list.map(x => x.id === l.id ? { ...x, status: LEAVE_STATUSES.APPROVED } : x));
    this.showToast('Leave approved ✓');
  }

  openReject(l: any): void { this.rejectTarget.set(l); this.rejectNote = ''; this.modal.set('reject'); }

  async submitReject(): Promise<void> {
    this.saving.set(true);
    try {
      await this.api.updateAdminLeave(this.rejectTarget()!.id, { status: LEAVE_STATUSES.REJECTED, hrNote: this.rejectNote });
      this.leaves.update(list => list.map(x => x.id === this.rejectTarget()!.id ? { ...x, status: LEAVE_STATUSES.REJECTED, hrNote: this.rejectNote } : x));
      this.modal.set(null);
      this.showToast('Leave rejected');
    } finally { this.saving.set(false); }
  }

  openAdd(): void {
    this.addForm = {
      employeeType: EMPLOYEE_TYPES.DOCTOR,
      doctorId: '',
      storeStaffId: '',
      type: DEFAULT_LEAVE_TYPE,
      startDate: '',
      endDate: '',
      reason: ''
    };
    this.selectedEmp.set(null);
    this.empSearch = '';
    this.empResults.set([]);
    this.formError.set('');
    this.modal.set('add');
  }

  searchEmps(): void {
    if (this.empSearchTimer) clearTimeout(this.empSearchTimer);
    if (this.empSearch.length < 2) { this.empResults.set([]); return; }
    this.empSearchTimer = setTimeout(() => {
      this.api.getHrEmployees({ q: this.empSearch, type: this.addForm.employeeType })
        .then(r => this.empResults.set(r.employees.slice(0, PAGE_SIZES.EMP_SEARCH_RESULTS)))
        .catch(() => {});
    }, SEARCH_DEBOUNCE_MS);
  }

  selectEmp(e: any): void {
    this.selectedEmp.set(e);
    this.empSearch = e.name;
    this.empResults.set([]);
    if (e.empType === 'DOCTOR') { this.addForm.doctorId = e.id; this.addForm.storeStaffId = ''; }
    else { this.addForm.storeStaffId = e.id; this.addForm.doctorId = ''; }
  }

  async submitAdd(): Promise<void> {
    if (!this.selectedEmp()) { this.formError.set('Please select an employee'); return; }
    if (!this.addForm.startDate || !this.addForm.endDate) { this.formError.set('Start and end dates required'); return; }
    this.saving.set(true);
    try {
      await this.api.createAdminLeave(this.addForm);
      this.modal.set(null);
      this.showToast('Leave added ✓');
      this.load();
    } catch (e: any) {
      this.formError.set(e?.error?.error ?? 'Failed to add leave');
    } finally { this.saving.set(false); }
  }

  closeModal(): void { this.modal.set(null); }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), TOAST_DURATION_MS);
  }
}
