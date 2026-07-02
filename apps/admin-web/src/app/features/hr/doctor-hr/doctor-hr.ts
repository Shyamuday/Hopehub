import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
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

@Component({
  selector: 'app-doctor-hr',
  imports: [FormsModule, DatePipe],
  templateUrl: './doctor-hr.html',
  styleUrl: './doctor-hr.scss'
})
export class DoctorHrComponent implements OnInit {
  private api = inject(AdminApi);

  doctors = signal<any[]>([]);
  loading = signal(true);
  profileOpen = signal(false);
  selected = signal<any>(null);
  saving = signal(false);
  tab = signal<'profile' | 'letter'>('profile');
  letter = signal<any>(null);
  letterLoading = signal(false);

  form: any = {};
  salaryDisplay = 0;
  feeDisplay = 0;

  shifts = Object.entries(WORK_SHIFT_LABELS).map(([value, label]) => ({ value: value as WorkShift, label }));
  days = WEEK_DAYS;

  ngOnInit(): void { this.load(); }

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
    this.form = { ...d, workShift: d.workShift ?? DEFAULT_WORK_SHIFT, weeklyOffDays: d.weeklyOffDays ?? [] };
    this.salaryDisplay = d.salaryPerMonth ? d.salaryPerMonth / PAISE_PER_RUPEE : 0;
    this.feeDisplay = d.consultationFee ? d.consultationFee / PAISE_PER_RUPEE : 0;
    this.profileOpen.set(true);
  }

  close(): void { this.profileOpen.set(false); }

  async save() {
    if (!this.selected()) return;
    this.saving.set(true);
    try {
      const r = await this.api.updateHrDoctor(this.selected().id, {
        ...this.form,
        salaryPerMonth: Math.round(this.salaryDisplay * PAISE_PER_RUPEE),
        consultationFee: Math.round(this.feeDisplay * PAISE_PER_RUPEE)
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

  shiftLabel(s: WorkShift): string { return WORK_SHIFT_LABELS[s] ?? s; }
  statusColor(s: EmployeeStatus): string { return EMPLOYEE_STATUS_COLORS[s] ?? EMPLOYEE_STATUS_FALLBACK_COLOR; }
  isOff(d: string): boolean { return (this.form.weeklyOffDays ?? []).includes(d); }
  toggleOff(d: string): void {
    const c = this.form.weeklyOffDays ?? [];
    this.form.weeklyOffDays = c.includes(d) ? c.filter((x: string) => x !== d) : [...c, d];
  }
}
