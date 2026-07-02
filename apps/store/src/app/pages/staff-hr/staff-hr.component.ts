import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { StoreApiService } from '../../services/store-api.service';
import { StaffHrProfile, JoiningLetterDoc, WorkShift, EmployeeStatus } from '../../models';
import { STORE_STAFF_ROLES } from '../../core/constants/auth.constants';
import { EMPLOYEE_STATUS_STYLES, SHIFT_LABELS, WEEK_DAYS } from '../../shared/constants/hr.constants';

@Component({
  selector: 'app-staff-hr',
  imports: [FormsModule, DatePipe, NgTemplateOutlet],
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

  form: Partial<StaffHrProfile> & { salaryDisplay?: number } = {};
  salaryDisplay = 0;

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
    this.form = { ...s };
    this.salaryDisplay = s.salaryPerMonth ? s.salaryPerMonth / 100 : 0;
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
    const payload = { ...this.form, salaryPerMonth: this.salaryDisplay * 100 };
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
  isOffDay(d: string): boolean { return (this.form.weeklyOffDays ?? []).includes(d); }
  toggleOffDay(d: string): void {
    const current = this.form.weeklyOffDays ?? [];
    this.form.weeklyOffDays = current.includes(d) ? current.filter(x => x !== d) : [...current, d];
  }
}
