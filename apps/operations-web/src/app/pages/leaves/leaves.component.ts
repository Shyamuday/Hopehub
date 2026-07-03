import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { Leave, LeaveStatus, LeaveType, EmpType } from '../../models';
import { LEAVE_STATUS_TABS, LEAVE_TYPES, leaveStatusBadgeClass, leaveTypeIcon } from '@vitalis/hr-ui';
import { PAGE_SIZES } from '../../core/constants/pagination.constants';

type TabStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

function emptyAddForm() {
  return {
    employeeType: 'DOCTOR' as EmpType,
    employeeId: '',
    type: 'CASUAL' as LeaveType,
    startDate: '',
    endDate: '',
    reason: ''
  };
}

@Component({
  selector: 'app-leaves',
  standalone: true,
  imports: [FormField, DatePipe],
  templateUrl: './leaves.component.html',
  styleUrl: './leaves.component.scss'
})
export class LeavesComponent implements OnInit {
  private api = inject(HrApiService);

  leaves = signal<Leave[]>([]);
  total = signal(0);
  loading = signal(true);
  updatingId = signal<string | null>(null);
  showAddModal = signal(false);
  addLoading = signal(false);
  addError = signal('');

  activeTab = signal<TabStatus>('ALL');
  readonly hrNotes = signal<Record<string, string>>({});

  readonly addFormModel = signal(emptyAddForm());
  readonly addForm = form(this.addFormModel);

  leaveTypes = LEAVE_TYPES;
  tabs = LEAVE_STATUS_TABS;

  ngOnInit() { this.loadLeaves(); }

  hrNoteFor(leaveId: string): string {
    return this.hrNotes()[leaveId] ?? '';
  }

  setHrNote(leaveId: string, value: string): void {
    this.hrNotes.update((notes) => ({ ...notes, [leaveId]: value }));
  }

  loadLeaves() {
    this.loading.set(true);
    this.api.getLeaves({
      status: this.activeTab() !== 'ALL' ? this.activeTab() : undefined,
      page: 1,
      pageSize: PAGE_SIZES.LEAVES
    }).subscribe({
      next: (res) => { this.leaves.set(res.leaves); this.total.set(res.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  setTab(tab: TabStatus) { this.activeTab.set(tab); this.loadLeaves(); }

  updateLeave(leave: Leave, status: LeaveStatus) {
    this.updatingId.set(leave.id);
    this.api.updateLeave(leave.id, { status, hrNote: this.hrNotes()[leave.id] || undefined }).subscribe({
      next: (res) => {
        this.updatingId.set(null);
        this.leaves.update(list => list.map(l => l.id === leave.id ? res.leave : l));
      },
      error: () => this.updatingId.set(null)
    });
  }

  closeModal() {
    this.showAddModal.set(false);
    this.addError.set('');
    this.addFormModel.set(emptyAddForm());
  }

  submitLeave() {
    const f = this.addFormModel();
    if (!f.employeeId || !f.startDate || !f.endDate) {
      this.addError.set('Please fill in all required fields.');
      return;
    }
    this.addLoading.set(true);
    this.addError.set('');

    const payload: any = {
      employeeType: f.employeeType,
      type: f.type,
      startDate: f.startDate,
      endDate: f.endDate,
      reason: f.reason || undefined
    };

    if (f.employeeType === 'DOCTOR') payload.doctorId = f.employeeId;
    else payload.storeStaffId = f.employeeId;

    this.api.createLeave(payload).subscribe({
      next: (res) => {
        this.addLoading.set(false);
        this.leaves.update(l => [res.leave, ...l]);
        this.total.update(t => t + 1);
        this.closeModal();
      },
      error: (err) => {
        this.addLoading.set(false);
        this.addError.set(err?.error?.message ?? 'Failed to create leave.');
      }
    });
  }

  leaveIcon = leaveTypeIcon;
  statusClass = leaveStatusBadgeClass;
}
