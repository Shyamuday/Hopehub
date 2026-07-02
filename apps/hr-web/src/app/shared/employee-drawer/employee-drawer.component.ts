import { Component, inject, signal, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { Employee, Letter, WorkShift, EmployeeStatus } from '../../models';
import { employeeStatusBadgeClass } from '../constants/employee-status.constants';
import { WEEK_DAYS, WORK_SHIFT_OPTIONS } from '../constants/shift.constants';
import { SAVE_SUCCESS_DURATION_MS } from '../../core/constants/timing.constants';

interface EmployeeForm {
  employeeId: string;
  designation: string;
  department: string;
  joiningDate: string;
  probationEndDate: string;
  salary: number | null;
  emergencyContact: string;
  employeeStatus: EmployeeStatus;
  workShift: WorkShift | null;
  shiftStart: string;
  shiftEnd: string;
  weeklyOffDays: string[];
}

@Component({
  selector: 'app-employee-drawer',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './employee-drawer.component.html',
  styleUrl: './employee-drawer.component.scss'
})
export class EmployeeDrawerComponent implements OnChanges {
  private api = inject(HrApiService);

  @Input() employee: Employee | null = null;
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Employee>();

  activeTab = signal<'profile' | 'shift' | 'letter'>('profile');
  saving = signal(false);
  saveError = signal('');
  saveSuccess = signal(false);
  letter = signal<Letter | null>(null);
  letterLoading = signal(false);
  letterGenerating = signal(false);

  clinicName = '';
  clinicAddress = '';
  today = new Date();

  shifts = WORK_SHIFT_OPTIONS;
  weekdays = WEEK_DAYS;

  form: EmployeeForm = this.emptyForm();

  private emptyForm(): EmployeeForm {
    return {
      employeeId: '',
      designation: '',
      department: '',
      joiningDate: '',
      probationEndDate: '',
      salary: null,
      emergencyContact: '',
      employeeStatus: 'ACTIVE',
      workShift: null,
      shiftStart: '',
      shiftEnd: '',
      weeklyOffDays: []
    };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['employee'] && this.employee) {
      const emp = this.employee;
      this.form = {
        employeeId: emp.employeeId ?? '',
        designation: emp.designation ?? '',
        department: emp.department ?? '',
        joiningDate: emp.joiningDate ?? '',
        probationEndDate: (emp as any).probationEndDate ?? '',
        salary: (emp as any).salary ?? null,
        emergencyContact: (emp as any).emergencyContact ?? '',
        employeeStatus: emp.employeeStatus,
        workShift: emp.workShift ?? null,
        shiftStart: emp.shiftStart ?? '',
        shiftEnd: emp.shiftEnd ?? '',
        weeklyOffDays: emp.weeklyOffDays ? [...emp.weeklyOffDays] : []
      };
      this.activeTab.set('profile');
      this.letter.set(null);
      this.saveError.set('');
      this.saveSuccess.set(false);
    }
  }

  close() { this.closed.emit(); }

  toggleDay(day: string) {
    const days = [...this.form.weeklyOffDays];
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1);
    else days.push(day);
    this.form.weeklyOffDays = days;
  }

  statusClass = employeeStatusBadgeClass;

  setLetterTab() {
    this.activeTab.set('letter');
    this.loadLetter();
  }

  save() {
    const emp = this.employee;
    if (!emp) return;
    this.saving.set(true);
    this.saveError.set('');
    this.saveSuccess.set(false);

    const payload: Partial<Employee> = {
      employeeId: this.form.employeeId || undefined,
      designation: this.form.designation || undefined,
      department: this.form.department || undefined,
      joiningDate: this.form.joiningDate || undefined,
      employeeStatus: this.form.employeeStatus,
      workShift: this.form.workShift ?? undefined,
      shiftStart: this.form.shiftStart || undefined,
      shiftEnd: this.form.shiftEnd || undefined,
      weeklyOffDays: this.form.weeklyOffDays.length ? this.form.weeklyOffDays : undefined,
      ...(this.form.salary !== null ? { salary: this.form.salary } as any : {}),
      ...(this.form.emergencyContact ? { emergencyContact: this.form.emergencyContact } as any : {}),
      ...(this.form.probationEndDate ? { probationEndDate: this.form.probationEndDate } as any : {})
    };

    const obs$ = emp.empType === 'DOCTOR'
      ? this.api.updateDoctor(emp.id, payload)
      : this.api.updateStoreStaff(emp.id, payload);

    (obs$ as any).subscribe({
      next: (res: any) => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        const updated: Employee = res.doctor ?? res.staff;
        if (updated) this.saved.emit(updated);
        setTimeout(() => this.saveSuccess.set(false), SAVE_SUCCESS_DURATION_MS);
      },
      error: (err: any) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.message ?? 'Failed to save. Please try again.');
      }
    });
  }

  loadLetter() {
    const emp = this.employee;
    if (!emp || this.letter()) return;
    this.letterLoading.set(true);
    const obs = emp.empType === 'DOCTOR'
      ? this.api.getDoctorLetter(emp.id)
      : this.api.getStoreStaffLetter(emp.id);

    obs.subscribe({
      next: (res) => { this.letter.set(res.letter); this.letterLoading.set(false); },
      error: () => { this.letter.set(null); this.letterLoading.set(false); }
    });
  }

  generateLetter() {
    const emp = this.employee;
    if (!emp) return;
    this.letterGenerating.set(true);
    const obs = emp.empType === 'DOCTOR'
      ? this.api.generateDoctorLetter(emp.id, {
          clinicName: this.clinicName || undefined,
          clinicAddress: this.clinicAddress || undefined
        })
      : this.api.generateStoreStaffLetter(emp.id);

    obs.subscribe({
      next: (res) => { this.letter.set(res.letter); this.letterGenerating.set(false); },
      error: () => { this.letterGenerating.set(false); }
    });
  }

  printLetter() { window.print(); }
}
