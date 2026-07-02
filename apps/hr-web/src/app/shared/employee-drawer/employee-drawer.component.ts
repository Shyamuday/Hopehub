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
  template: `
    @if (visible) {
      <!-- Backdrop -->
      <div class="backdrop" (click)="close()"></div>

      <!-- Drawer -->
      <div class="drawer">
        <!-- Header -->
        <div class="drawer-header">
          <div class="drawer-avatar">{{ employee!.name.charAt(0).toUpperCase() }}</div>
          <div class="drawer-info">
            <div class="drawer-name">{{ employee!.name }}</div>
            <div class="drawer-meta">
              <span class="badge" [class]="statusClass(employee!.employeeStatus)">
                {{ employee!.employeeStatus }}
              </span>
              <span class="badge" [class]="employee!.empType === 'DOCTOR' ? 'badge-blue' : 'badge-purple'">
                {{ employee!.empType === 'DOCTOR' ? '🩺 Doctor' : '🏪 Staff' }}
              </span>
            </div>
          </div>
          <button class="close-btn" (click)="close()">✕</button>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button class="tab" [class.active]="activeTab() === 'profile'" (click)="activeTab.set('profile')">Profile</button>
          <button class="tab" [class.active]="activeTab() === 'shift'" (click)="activeTab.set('shift')">Shift &amp; Timing</button>
          <button class="tab" [class.active]="activeTab() === 'letter'" (click)="setLetterTab()">Letter</button>
        </div>

        <!-- Tab Content -->
        <div class="drawer-body">
          <!-- Profile Tab -->
          @if (activeTab() === 'profile') {
            <div class="tab-content">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Employee ID</label>
                  <input class="form-input" [(ngModel)]="form.employeeId" placeholder="EMP001" />
                </div>
                <div class="form-group">
                  <label class="form-label">Designation</label>
                  <input class="form-input" [(ngModel)]="form.designation" placeholder="Senior Doctor" />
                </div>
                <div class="form-group">
                  <label class="form-label">Department</label>
                  <input class="form-input" [(ngModel)]="form.department" placeholder="Cardiology" />
                </div>
                <div class="form-group">
                  <label class="form-label">Joining Date</label>
                  <input class="form-input" type="date" [(ngModel)]="form.joiningDate" />
                </div>
                <div class="form-group">
                  <label class="form-label">Probation End Date</label>
                  <input class="form-input" type="date" [(ngModel)]="form.probationEndDate" />
                </div>
                <div class="form-group">
                  <label class="form-label">Salary (₹)</label>
                  <input class="form-input" type="number" [(ngModel)]="form.salary" placeholder="50000" />
                </div>
                <div class="form-group full-width">
                  <label class="form-label">Emergency Contact</label>
                  <input class="form-input" [(ngModel)]="form.emergencyContact" placeholder="+91 98765 43210" />
                </div>
                <div class="form-group full-width">
                  <label class="form-label">Employee Status</label>
                  <select class="form-input" [(ngModel)]="form.employeeStatus">
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="RESIGNED">Resigned</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
              </div>
            </div>
          }

          <!-- Shift Tab -->
          @if (activeTab() === 'shift') {
            <div class="tab-content">
              <div class="form-group">
                <label class="form-label">Work Shift</label>
                <div class="shift-grid">
                  @for (s of shifts; track s.value) {
                    <button
                      class="shift-btn"
                      [class.active]="form.workShift === s.value"
                      (click)="form.workShift = s.value"
                    >{{ s.label }}</button>
                  }
                </div>
              </div>

              <div class="form-grid mt-16">
                <div class="form-group">
                  <label class="form-label">Shift Start</label>
                  <input class="form-input" type="time" [(ngModel)]="form.shiftStart" />
                </div>
                <div class="form-group">
                  <label class="form-label">Shift End</label>
                  <input class="form-input" type="time" [(ngModel)]="form.shiftEnd" />
                </div>
              </div>

              <div class="form-group mt-16">
                <label class="form-label">Weekly Off Days</label>
                <div class="days-grid">
                  @for (day of weekdays; track day) {
                    <button
                      class="day-btn"
                      [class.active]="form.weeklyOffDays.includes(day)"
                      (click)="toggleDay(day)"
                    >{{ day.slice(0, 3) }}</button>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Letter Tab -->
          @if (activeTab() === 'letter') {
            <div class="tab-content">
              @if (letterLoading()) {
                <div class="letter-loading">
                  <div class="spinner-sm"></div>
                  <p>Loading letter...</p>
                </div>
              } @else if (letter()) {
                <div class="letter-actions">
                  <button class="btn-outline" (click)="printLetter()">🖨️ Print / PDF</button>
                  <button class="btn-outline" (click)="letter.set(null)">↺ Regenerate</button>
                </div>
                <div class="print-area letter-preview">
                  <div class="letter-head">
                    <h2>{{ letter()!.clinicName ?? 'Medical Center' }}</h2>
                    @if (letter()!.clinicAddress) {
                      <p>{{ letter()!.clinicAddress }}</p>
                    }
                    <hr />
                  </div>
                  <div class="letter-date">Date: {{ today | date:'dd MMMM yyyy' }}</div>
                  <div class="letter-subject">
                    <strong>Subject: Employment Verification Letter</strong>
                  </div>
                  <div class="letter-body">
                    <p>To Whom It May Concern,</p>
                    <p>
                      This is to certify that <strong>{{ employee!.name }}</strong>
                      @if (employee!.employeeId) {
                        (Employee ID: {{ employee!.employeeId }})
                      }
                      is currently employed with us as
                      <strong>{{ employee!.designation ?? 'Employee' }}</strong>
                      @if (employee!.department) {
                        in the {{ employee!.department }} department
                      }.
                    </p>
                    @if (employee!.joiningDate) {
                      <p>
                        The employee has been with our organization since
                        <strong>{{ employee!.joiningDate | date:'dd MMMM yyyy' }}</strong>.
                      </p>
                    }
                    <p>This letter is issued upon request for official purposes.</p>
                    <br />
                    <p>Yours sincerely,</p>
                    <br />
                    <p><strong>HR Department</strong></p>
                  </div>
                </div>
              } @else {
                <div class="letter-empty">
                  <div class="letter-empty-icon">📄</div>
                  <p>No letter generated yet</p>
                  @if (employee!.empType === 'DOCTOR') {
                    <div class="clinic-form">
                      <div class="form-group">
                        <label class="form-label">Clinic Name (optional)</label>
                        <input class="form-input" [(ngModel)]="clinicName" placeholder="City Medical Center" />
                      </div>
                      <div class="form-group">
                        <label class="form-label">Clinic Address (optional)</label>
                        <input class="form-input" [(ngModel)]="clinicAddress" placeholder="123 Main St, City" />
                      </div>
                    </div>
                  }
                  <button class="btn-primary" (click)="generateLetter()" [disabled]="letterGenerating()">
                    @if (letterGenerating()) {
                      <span class="spinner-sm"></span> Generating...
                    } @else {
                      Generate Letter
                    }
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Footer -->
        @if (activeTab() !== 'letter') {
          <div class="drawer-footer">
            @if (saveError()) {
              <div class="save-error">⚠️ {{ saveError() }}</div>
            }
            @if (saveSuccess()) {
              <div class="save-success">✓ Saved successfully!</div>
            }
            <button class="btn-secondary" (click)="close()">Cancel</button>
            <button class="btn-primary" (click)="save()" [disabled]="saving()">
              @if (saving()) {
                <span class="spinner-sm"></span> Saving...
              } @else {
                Save Changes
              }
            </button>
          </div>
        }
      </div>
    }
  `,
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
