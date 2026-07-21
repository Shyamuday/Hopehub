import { Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe } from '@angular/common';
import { buildDetailRows, DetailRowsComponent, HR_LETTER_META_FIELDS } from '@hopehub/platform-ui';
import { AdminApi } from '../../../core/services/admin-api';
import { PAISE_PER_RUPEE } from '../../../shared/constants/currency.constants';
import {
  EMPLOYEE_STATUS_COLORS,
  EMPLOYEE_STATUS_FALLBACK_COLOR,
  type EmployeeStatus
} from '../constants/employee-status.constants';
import { DEFAULT_HOMEOPATHIC_CLINIC_NAME } from '../constants/organization.constants';
import {
  DEFAULT_WORK_SHIFT,
  WEEK_DAYS,
  WORK_SHIFT_LABELS,
  type WorkShift
} from '../constants/shift.constants';
import {
  DOCTOR_TYPE_OPTIONS,
  SPECIALTY_FOCUS_OPTIONS,
  type HomeopathicDoctorType,
  type HomeopathicSpecialtyFocus
} from '../../doctors/constants/doctor-types.constants';

function emptyDoctorProfileForm() {
  return {
    doctorType: 'JUNIOR_DOCTOR' as HomeopathicDoctorType,
    specialtyFocus: '' as HomeopathicSpecialtyFocus | '',
    specialty: '',
    designation: '',
    department: '',
    employeeStatus: 'ACTIVE',
    employeeId: '',
    joiningDate: '',
    probationEndDate: '',
    workShift: DEFAULT_WORK_SHIFT,
    shiftStart: '',
    shiftEnd: '',
    weeklyOffDays: [] as string[],
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: ''
  };
}

@Component({
  selector: 'app-doctor-hr',
  imports: [FormField, DatePipe, DetailRowsComponent],
  templateUrl: './doctor-hr.html',
  styleUrl: './doctor-hr.scss'
})
export class DoctorHrComponent implements OnInit {
  private api = inject(AdminApi);

  readonly doctorTypeOptions = DOCTOR_TYPE_OPTIONS;
  readonly specialtyFocusOptions = SPECIALTY_FOCUS_OPTIONS;

  doctors = signal<any[]>([]);
  loading = signal(true);
  profileOpen = signal(false);
  selected = signal<any>(null);
  saving = signal(false);
  tab = signal<'profile' | 'letter'>('profile');
  letter = signal<any>(null);
  letterLoading = signal(false);

  readonly profileModel = signal(emptyDoctorProfileForm());
  readonly profileForm = form(this.profileModel);
  readonly feeModel = signal({ value: 0 });
  readonly feeForm = form(this.feeModel);

  shifts = Object.entries(WORK_SHIFT_LABELS).map(([value, label]) => ({ value: value as WorkShift, label }));
  days = WEEK_DAYS;

  ngOnInit(): void { this.load(); }

  doctorName(d: { name?: string; user?: { name?: string } }) {
    return d.name || d.user?.name || 'Doctor';
  }

  async load() {
    this.loading.set(true);
    try {
      const r = await this.api.getHrDoctors();
      this.doctors.set(r.doctors);
    } finally { this.loading.set(false); }
  }

  openProfile(d: any): void {
    this.selected.set(d);
    this.letter.set(d.joiningLetter ?? null);
    this.tab.set('profile');
    this.profileModel.set({
      doctorType: d.doctorType ?? 'JUNIOR_DOCTOR',
      specialtyFocus: d.specialtyFocus ?? '',
      specialty: d.specialty ?? '',
      designation: d.designation ?? '',
      department: d.department ?? '',
      employeeStatus: d.employeeStatus ?? 'ACTIVE',
      employeeId: d.employeeId ?? '',
      joiningDate: d.joiningDate ? String(d.joiningDate).slice(0, 10) : '',
      probationEndDate: d.probationEndDate ? String(d.probationEndDate).slice(0, 10) : '',
      workShift: d.workShift ?? DEFAULT_WORK_SHIFT,
      shiftStart: d.shiftStart ?? '',
      shiftEnd: d.shiftEnd ?? '',
      weeklyOffDays: d.weeklyOffDays ?? [],
      phone: d.phone ?? '',
      address: d.address ?? '',
      emergencyContact: d.emergencyContact ?? '',
      emergencyPhone: d.emergencyPhone ?? ''
    });
    this.feeModel.set({
      value: d.consultationFee != null ? d.consultationFee / PAISE_PER_RUPEE : 0
    });
    this.profileOpen.set(true);
  }

  close(): void { this.profileOpen.set(false); }

  isSpecialistType(): boolean {
    return this.profileModel().doctorType === 'SPECIALIST_CONSULTANT';
  }

  async save() {
    if (!this.selected()) return;
    this.saving.set(true);
    const form = this.profileModel();
    try {
      const r = await this.api.updateHrDoctor(this.selected().id, {
        ...form,
        doctorType: form.doctorType as HomeopathicDoctorType,
        specialtyFocus: this.isSpecialistType() ? (form.specialtyFocus as HomeopathicSpecialtyFocus) || null : null,
        consultationFee: Math.round(this.feeModel().value * PAISE_PER_RUPEE)
      });
      this.doctors.update(list => list.map(d => d.id === r.doctor.id ? { ...d, ...r.doctor } : d));
      this.selected.set({ ...this.selected(), ...r.doctor });
    } finally { this.saving.set(false); }
  }

  openLetter(): void {
    this.tab.set('letter');
    if (!this.letter()) {
      this.letterLoading.set(true);
      this.api.getDoctorLetter(this.selected().id)
        .then(r => { this.letter.set(r.letter); this.letterLoading.set(false); })
        .catch(() => this.letterLoading.set(false));
    }
  }

  async generate() {
    this.letterLoading.set(true);
    try {
      const r = await this.api.generateDoctorLetter(this.selected().id, DEFAULT_HOMEOPATHIC_CLINIC_NAME);
      this.letter.set(r.letter);
    } finally { this.letterLoading.set(false); }
  }

  async regen() { this.letter.set(null); await this.generate(); }
  print(): void { window.print(); }

  setWorkShift(value: WorkShift): void {
    this.profileModel.update((profile) => ({ ...profile, workShift: value }));
  }

  shiftLabel(s: WorkShift): string { return WORK_SHIFT_LABELS[s] ?? s; }
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

  letterMetaRows(content: Record<string, unknown>, dateFormat = 'dd MMMM yyyy') {
    const datePipe = new DatePipe('en-IN');
    return buildDetailRows(
      {
        referenceLabel: 'Letter No',
        referenceNumber: String(content['letterNumber'] ?? ''),
        issuedDate: datePipe.transform(content['issuedDate'] as string | Date | null | undefined, dateFormat) ?? ''
      },
      HR_LETTER_META_FIELDS
    );
  }
}
