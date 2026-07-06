import { Component, inject, signal, OnInit } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { buildDetailRows, DetailRowsComponent, HR_LETTER_META_FIELDS } from '@vitalis/platform-ui';
import { StoreApiService } from '../../../services/store-api.service';
import { StaffHrProfile, JoiningLetterDoc } from '../../../models/store';
import { WorkShift, EmployeeStatus } from '../../../models';
import { STORE_STAFF_ROLES } from '../../../core/constants/store/auth.constants';
import { EMPLOYEE_STATUS_STYLES, SHIFT_LABELS, WEEK_DAYS } from '@vitalis/hr-ui';

type ProfileFormFields = {
  employeeId: string;
  employeeStatus: EmployeeStatus;
  designation: string;
  department: string;
  joiningDate: string;
  probationEndDate: string;
  salaryDisplay: number;
  workShift: WorkShift;
  shiftStart: string;
  shiftEnd: string;
  weeklyOffDays: string[];
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
};

function emptyProfileForm(): ProfileFormFields {
  return {
    employeeId: '',
    employeeStatus: 'ACTIVE',
    designation: '',
    department: '',
    joiningDate: '',
    probationEndDate: '',
    salaryDisplay: 0,
    workShift: 'MORNING',
    shiftStart: '',
    shiftEnd: '',
    weeklyOffDays: [],
    phone: '',
    email: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: ''
  };
}

function profileFromStaff(s: StaffHrProfile): ProfileFormFields {
  return {
    employeeId: s.employeeId ?? '',
    employeeStatus: s.employeeStatus,
    designation: s.designation ?? '',
    department: s.department ?? '',
    joiningDate: s.joiningDate ?? '',
    probationEndDate: s.probationEndDate ?? '',
    salaryDisplay: s.salaryPerMonth ? s.salaryPerMonth / 100 : 0,
    workShift: s.workShift,
    shiftStart: s.shiftStart ?? '',
    shiftEnd: s.shiftEnd ?? '',
    weeklyOffDays: [...(s.weeklyOffDays ?? [])],
    phone: s.phone ?? '',
    email: s.email ?? '',
    address: s.address ?? '',
    emergencyContact: s.emergencyContact ?? '',
    emergencyPhone: s.emergencyPhone ?? ''
  };
}

@Component({
  selector: 'app-staff-hr',
  imports: [FormField, DatePipe, NgTemplateOutlet, DetailRowsComponent],
  templateUrl: './staff-hr.component.html',
  styleUrl: './staff-hr.component.scss'
})
export class StaffHrComponent implements OnInit {
  private api = inject(StoreApiService);

  readonly managerRole = STORE_STAFF_ROLES.MANAGER;

  staff = signal<StaffHrProfile[]>([]);
  loading = signal(true);
  profileOpen = signal(false);
  selected = signal<StaffHrProfile | null>(null);
  saving = signal(false);
  tab = signal<'profile' | 'letter'>('profile');
  letter = signal<JoiningLetterDoc | null>(null);
  letterLoading = signal(false);

  readonly profileFormModel = signal<ProfileFormFields>(emptyProfileForm());
  readonly profileForm = form(this.profileFormModel);

  shifts = Object.entries(SHIFT_LABELS).map(([value, label]) => ({ value: value as WorkShift, label }));
  days = WEEK_DAYS;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getHrStaffList().subscribe({
      next: (r) => { this.staff.set(r.staff); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openProfile(s: StaffHrProfile): void {
    this.selected.set(s);
    this.letter.set(s.joiningLetter ?? null);
    this.tab.set('profile');
    this.profileFormModel.set(profileFromStaff(s));
    this.profileOpen.set(true);
  }

  closeProfile(): void { this.profileOpen.set(false); }

  openLetter(): void {
    this.tab.set('letter');
    if (!this.letter()) {
      this.letterLoading.set(true);
      this.api.getStaffLetter(this.selected()!.id).subscribe({
        next: (r) => { this.letter.set(r.letter); this.letterLoading.set(false); },
        error: () => this.letterLoading.set(false)
      });
    }
  }

  saveProfile(): void {
    if (!this.selected()) return;
    this.saving.set(true);
    const form = this.profileFormModel();
    const { salaryDisplay, ...rest } = form;
    const payload = { ...rest, salaryPerMonth: salaryDisplay * 100 };
    this.api.updateHrStaff(this.selected()!.id, payload).subscribe({
      next: (r) => {
        this.staff.update(list => list.map(s => s.id === r.staff.id ? { ...s, ...r.staff } : s));
        this.selected.set({ ...this.selected()!, ...r.staff });
        this.saving.set(false);
      },
      error: () => this.saving.set(false)
    });
  }

  generateLetter(): void {
    if (!this.selected()) return;
    this.letterLoading.set(true);
    this.api.generateStaffLetter(this.selected()!.id).subscribe({
      next: (r) => { this.letter.set(r.letter); this.letterLoading.set(false); },
      error: () => this.letterLoading.set(false)
    });
  }

  regenerateLetter(): void {
    this.letter.set(null);
    this.generateLetter();
  }

  printLetter(): void { window.print(); }

  shiftLabel(s: WorkShift): string { return SHIFT_LABELS[s] ?? s; }
  statusColor(s: EmployeeStatus): string { return EMPLOYEE_STATUS_STYLES[s]?.color ?? '#94a3b8'; }

  isOffDay(d: string): boolean {
    return (this.profileFormModel().weeklyOffDays ?? []).includes(d);
  }

  toggleOffDay(d: string): void {
    this.profileFormModel.update((form) => {
      const current = form.weeklyOffDays ?? [];
      return {
        ...form,
        weeklyOffDays: current.includes(d) ? current.filter(x => x !== d) : [...current, d]
      };
    });
  }

  setWorkShift(value: WorkShift): void {
    this.profileFormModel.update((form) => ({ ...form, workShift: value }));
  }

  letterMetaRows(content: Record<string, unknown>, dateFormat = 'dd MMMM yyyy') {
    const datePipe = new DatePipe('en-IN');
    return buildDetailRows(
      {
        referenceLabel: 'Letter No',
        referenceNumber: String(content['letterNumber'] ?? ''),
        issuedDate: datePipe.transform(content['issuedDate'], dateFormat) ?? ''
      },
      HR_LETTER_META_FIELDS
    );
  }
}
