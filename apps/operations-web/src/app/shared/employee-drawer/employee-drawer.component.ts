import { Component, inject, signal, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { Doctor, Employee, Letter, WorkShift, EmployeeStatus } from '../../models';
import { employeeStatusBadgeClass } from '../constants/employee-status.constants';
import {
  DOCTOR_TYPE_OPTIONS,
  SPECIALTY_FOCUS_OPTIONS,
  type HomeopathicDoctorType,
  type HomeopathicSpecialtyFocus
} from '../constants/doctor-types.constants';
import { WEEK_DAYS, WORK_SHIFT_OPTIONS } from '../constants/shift.constants';
import { SAVE_SUCCESS_DURATION_MS } from '../../core/constants/timing.constants';

interface EmployeeForm {
  employeeId: string;
  designation: string;
  department: string;
  joiningDate: string;
  probationEndDate: string;
  salary: number | null;
  consultationFee: number | null;
  emergencyContact: string;
  employeeStatus: EmployeeStatus;
  workShift: WorkShift | null;
  shiftStart: string;
  shiftEnd: string;
  weeklyOffDays: string[];
  doctorType: HomeopathicDoctorType;
  specialtyFocus: HomeopathicSpecialtyFocus | '';
  specialty: string;
}

@Component({
  selector: 'app-employee-drawer',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './employee-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './employee-drawer.component.scss'
})
export class EmployeeDrawerComponent implements OnChanges {
  private api = inject(HrApiService);

  readonly doctorTypeOptions = DOCTOR_TYPE_OPTIONS;
  readonly specialtyFocusOptions = SPECIALTY_FOCUS_OPTIONS;

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
      consultationFee: null,
      emergencyContact: '',
      employeeStatus: 'ACTIVE',
      workShift: null,
      shiftStart: '',
      shiftEnd: '',
      weeklyOffDays: [],
      doctorType: 'JUNIOR_DOCTOR',
      specialtyFocus: '',
      specialty: ''
    };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['employee'] && this.employee) {
      const emp = this.employee;
      const doctor = emp as Doctor;
      this.form = {
        employeeId: emp.employeeId ?? '',
        designation: emp.designation ?? '',
        department: emp.department ?? '',
        joiningDate: emp.joiningDate ? String(emp.joiningDate).slice(0, 10) : '',
        probationEndDate: emp.probationEndDate ? String(emp.probationEndDate).slice(0, 10) : '',
        salary: doctor.salary != null ? Math.round(doctor.salary / 100) : null,
        consultationFee: doctor.consultationFee != null ? Math.round(doctor.consultationFee / 100) : null,
        emergencyContact: emp.emergencyContact ?? '',
        employeeStatus: emp.employeeStatus,
        workShift: emp.workShift ?? null,
        shiftStart: emp.shiftStart ?? '',
        shiftEnd: emp.shiftEnd ?? '',
        weeklyOffDays: emp.weeklyOffDays ? [...emp.weeklyOffDays] : [],
        doctorType: (doctor.doctorType as HomeopathicDoctorType) || 'JUNIOR_DOCTOR',
        specialtyFocus: (doctor.specialtyFocus as HomeopathicSpecialtyFocus) || '',
        specialty: doctor.specialty ?? ''
      };
      this.activeTab.set('profile');
      this.letter.set(null);
      this.saveError.set('');
      this.saveSuccess.set(false);
    }
  }

  isDoctor() {
    return this.employee?.empType === 'DOCTOR';
  }

  isSpecialistType() {
    return this.form.doctorType === 'SPECIALIST_CONSULTANT';
  }

  letterContent(): Record<string, string | boolean | undefined> {
    return (this.letter()?.content || {}) as Record<string, string | boolean | undefined>;
  }

  letterDate(key: string): string | null {
    const value = this.letterContent()[key];
    return typeof value === 'string' ? value : null;
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

    const payload: Record<string, unknown> = {
      employeeId: this.form.employeeId || undefined,
      designation: this.form.designation || undefined,
      department: this.form.department || undefined,
      joiningDate: this.form.joiningDate || undefined,
      probationEndDate: this.form.probationEndDate || undefined,
      employeeStatus: this.form.employeeStatus,
      workShift: this.form.workShift ?? undefined,
      shiftStart: this.form.shiftStart || undefined,
      shiftEnd: this.form.shiftEnd || undefined,
      weeklyOffDays: this.form.weeklyOffDays.length ? this.form.weeklyOffDays : undefined,
      emergencyContact: this.form.emergencyContact || undefined
    };

    if (emp.empType === 'DOCTOR') {
      payload['doctorType'] = this.form.doctorType;
      payload['specialtyFocus'] = this.isSpecialistType() ? this.form.specialtyFocus || null : null;
      payload['specialty'] = this.form.specialty || undefined;
      if (this.form.salary !== null) payload['salaryPerMonth'] = Math.round(this.form.salary * 100);
      if (this.form.consultationFee !== null) payload['consultationFee'] = Math.round(this.form.consultationFee * 100);
    } else if (this.form.salary !== null) {
      payload['salary'] = this.form.salary;
    }

    if (emp.empType === 'DOCTOR') {
      this.api.updateDoctor(emp.id, payload).subscribe({
        next: (res: { doctor?: Employee }) => {
          this.saving.set(false);
          this.saveSuccess.set(true);
          const updated = res.doctor;
          if (updated) this.saved.emit(updated);
          setTimeout(() => this.saveSuccess.set(false), SAVE_SUCCESS_DURATION_MS);
        },
        error: (err: { error?: { message?: string } }) => {
          this.saving.set(false);
          this.saveError.set(err?.error?.message ?? 'Failed to save. Please try again.');
        }
      });
      return;
    }

    this.api.updateStoreStaff(emp.id, payload).subscribe({
      next: (res: { staff?: Employee }) => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        const updated = res.staff;
        if (updated) this.saved.emit(updated);
        setTimeout(() => this.saveSuccess.set(false), SAVE_SUCCESS_DURATION_MS);
      },
      error: (err: { error?: { message?: string } }) => {
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
