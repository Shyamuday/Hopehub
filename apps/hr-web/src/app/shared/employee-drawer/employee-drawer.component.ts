import { Component, inject, signal, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { Employee, Letter, WorkShift, EmployeeStatus } from '../../models';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHIFTS: { value: WorkShift; label: string }[] = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
  { value: 'NIGHT', label: 'Night' },
  { value: 'FULL_DAY', label: 'Full Day' },
  { value: 'CUSTOM', label: 'Custom' }
];

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
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 200;
      backdrop-filter: blur(2px);
    }

    .drawer {
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 480px;
      max-width: 100vw;
      background: var(--bg-secondary);
      border-left: 1px solid var(--border);
      z-index: 201;
      display: flex;
      flex-direction: column;
      box-shadow: -8px 0 40px rgba(0,0,0,0.5);
      animation: slideIn 0.25s ease;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .drawer-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 20px;
      border-bottom: 1px solid var(--border);
      background: var(--bg-card);
    }

    .drawer-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--accent-dark);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
      flex-shrink: 0;
    }

    .drawer-info { flex: 1; min-width: 0; }

    .drawer-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .drawer-meta { display: flex; gap: 8px; flex-wrap: wrap; }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-active { background: var(--green-bg); color: var(--green); }
    .badge-on-leave { background: var(--orange-bg); color: var(--orange); }
    .badge-resigned { background: var(--gray-bg); color: var(--gray); }
    .badge-terminated { background: var(--red-bg); color: var(--red); }
    .badge-blue { background: rgba(6,182,212,0.1); color: var(--accent); }
    .badge-purple { background: rgba(139,92,246,0.1); color: #a78bfa; }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background: var(--bg-input);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all var(--transition);
      flex-shrink: 0;
    }

    .close-btn:hover { background: var(--red-bg); color: var(--red); }

    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
      padding: 0 20px;
      background: var(--bg-card);
    }

    .tab {
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all var(--transition);
    }

    .tab:hover { color: var(--text-secondary); }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .tab-content { display: flex; flex-direction: column; gap: 16px; }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .mt-16 { margin-top: 16px; }

    .form-group { display: flex; flex-direction: column; gap: 6px; }

    .full-width { grid-column: 1 / -1; }

    .form-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
      transition: border-color var(--transition);
    }

    .form-input:focus { border-color: var(--accent); }
    .form-input::placeholder { color: var(--text-muted); }
    select.form-input option { background: var(--bg-card); }

    .shift-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .shift-btn {
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--bg-input);
      color: var(--text-secondary);
      font-size: 13px;
      transition: all var(--transition);
      text-align: center;
    }

    .shift-btn:hover { border-color: var(--accent); color: var(--text-primary); }
    .shift-btn.active { border-color: var(--accent); background: var(--accent-glow); color: var(--accent); font-weight: 600; }

    .days-grid { display: flex; gap: 8px; flex-wrap: wrap; }

    .day-btn {
      padding: 6px 12px;
      border: 1px solid var(--border);
      border-radius: 20px;
      background: var(--bg-input);
      color: var(--text-secondary);
      font-size: 12px;
      transition: all var(--transition);
    }

    .day-btn:hover { border-color: var(--accent); color: var(--text-primary); }
    .day-btn.active { border-color: var(--accent); background: var(--accent-glow); color: var(--accent); font-weight: 600; }

    .letter-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px;
      color: var(--text-muted);
    }

    .letter-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }

    .letter-preview {
      background: white;
      color: #111;
      border-radius: var(--radius-sm);
      padding: 32px;
      font-size: 14px;
      line-height: 1.7;
    }

    .letter-head h2 { font-size: 18px; color: #1a1a2e; margin-bottom: 4px; }
    .letter-head p { color: #555; font-size: 13px; }
    .letter-head hr { border: none; border-top: 2px solid #1a1a2e; margin: 12px 0; }
    .letter-date { color: #555; margin-bottom: 16px; }
    .letter-subject { margin-bottom: 20px; font-size: 15px; }
    .letter-body { display: flex; flex-direction: column; gap: 12px; }

    .letter-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px 20px;
      text-align: center;
    }

    .letter-empty-icon { font-size: 48px; }
    .letter-empty p { color: var(--text-muted); }

    .clinic-form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn-primary {
      padding: 10px 20px;
      background: var(--accent-dark);
      color: white;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
      transition: all var(--transition);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary:hover:not(:disabled) { background: var(--accent); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-secondary {
      padding: 10px 20px;
      background: var(--bg-input);
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
      border: 1px solid var(--border);
      transition: all var(--transition);
    }

    .btn-secondary:hover { color: var(--text-primary); border-color: var(--border-light); }

    .btn-outline {
      padding: 8px 16px;
      background: transparent;
      color: var(--accent);
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      border: 1px solid var(--accent);
      transition: all var(--transition);
    }

    .btn-outline:hover { background: var(--accent-glow); }

    .drawer-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-card);
    }

    .save-error { flex: 1; font-size: 12px; color: var(--red); }
    .save-success { flex: 1; font-size: 12px; color: var(--green); }
    .drawer-footer .btn-primary { margin-left: auto; }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 520px) {
      .drawer { width: 100vw; }
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
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

  shifts = SHIFTS;
  weekdays = WEEKDAYS;

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

  statusClass(status: string): string {
    const map: Record<string, string> = {
      'ACTIVE': 'badge-active',
      'ON_LEAVE': 'badge-on-leave',
      'RESIGNED': 'badge-resigned',
      'TERMINATED': 'badge-terminated'
    };
    return map[status] ?? 'badge-resigned';
  }

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

    const obs = emp.empType === 'DOCTOR'
      ? this.api.updateDoctor(emp.id, payload)
      : this.api.updateStoreStaff(emp.id, payload);

    obs.subscribe({
      next: (res: any) => {
        this.saving.set(false);
        this.saveSuccess.set(true);
        const updated: Employee = res.doctor ?? res.staff;
        if (updated) this.saved.emit(updated);
        setTimeout(() => this.saveSuccess.set(false), 3000);
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
