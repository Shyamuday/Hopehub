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
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">🪪 Staff HR Records</h1>
        <p class="page-sub">Joining details, shift timings & employment letters</p>
      </div>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <div class="staff-grid">
          @for (s of staff(); track s.id) {
            <div class="staff-card" (click)="openProfile(s)">
              <div class="card-avatar" [class.manager]="s.role === managerRole">
                {{ s.name.charAt(0).toUpperCase() }}
              </div>
              <div class="card-body">
                <div class="card-name">{{ s.name }}</div>
                <div class="card-meta">
                  <span class="code">{{ s.employeeId ?? s.staffCode }}</span>
                  <span class="role-tag" [class.manager]="s.role === managerRole">{{ s.role }}</span>
                  <span class="status-dot" [style.color]="statusColor(s.employeeStatus)">●</span>
                </div>
                <div class="card-info-row">
                  <span class="info-item">{{ s.designation ?? '—' }}</span>
                  <span class="info-sep">|</span>
                  <span class="info-item shift">{{ shiftLabel(s.workShift) }}</span>
                </div>
                @if (s.joiningDate) {
                  <div class="joining-chip">Joined {{ s.joiningDate | date:'dd MMM yyyy' }}</div>
                }
              </div>
              @if (s.joiningLetter) {
                <div class="letter-badge">📄</div>
              }
            </div>
          }
        </div>

        @if (staff().length === 0) {
          <div class="empty">
            <div class="empty-icon">👤</div>
            <h3>No staff found</h3>
            <p>Add staff members first from Store Setup.</p>
          </div>
        }
      }
    </div>

    <!-- Profile Editor Drawer -->
    @if (profileOpen() && selected()) {
      <div class="drawer-overlay" (click)="closeProfile()">
        <div class="drawer" (click)="$event.stopPropagation()">
          <div class="drawer-header">
            <div class="detail-avatar" [class.manager]="selected()!.role === managerRole">
              {{ selected()!.name.charAt(0).toUpperCase() }}
            </div>
            <div class="dh-info">
              <div class="dh-name">{{ selected()!.name }}</div>
              <div class="dh-sub">{{ selected()!.staffCode }}</div>
            </div>
            <div class="dh-tabs">
              <button [class.active]="tab() === 'profile'" (click)="tab.set('profile')">Profile</button>
              <button [class.active]="tab() === 'letter'" (click)="openLetter()">Letter</button>
            </div>
            <button class="close-btn" (click)="closeProfile()">✕</button>
          </div>

          <!-- Profile Tab -->
          @if (tab() === 'profile') {
            <div class="form-body">
              <div class="form-section">
                <div class="section-title">Employment Details</div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Employee ID</label>
                    <input type="text" [(ngModel)]="form.employeeId" placeholder="EMP-001" />
                  </div>
                  <div class="form-group">
                    <label>Status</label>
                    <select [(ngModel)]="form.employeeStatus">
                      <option value="ACTIVE">Active</option>
                      <option value="ON_LEAVE">On Leave</option>
                      <option value="RESIGNED">Resigned</option>
                      <option value="TERMINATED">Terminated</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Designation</label>
                    <input type="text" [(ngModel)]="form.designation" placeholder="Store Assistant" />
                  </div>
                  <div class="form-group">
                    <label>Department</label>
                    <input type="text" [(ngModel)]="form.department" placeholder="Store Operations" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Joining Date</label>
                    <input type="date" [(ngModel)]="form.joiningDate" />
                  </div>
                  <div class="form-group">
                    <label>Probation End Date</label>
                    <input type="date" [(ngModel)]="form.probationEndDate" />
                  </div>
                </div>
                <div class="form-group full">
                  <label>Monthly Salary (₹)</label>
                  <input type="number" [(ngModel)]="salaryDisplay" placeholder="15000"
                         (ngModelChange)="form.salaryPerMonth = $event * 100" />
                </div>
              </div>

              <div class="form-section">
                <div class="section-title">Shift & Timing</div>
                <div class="form-group full">
                  <label>Work Shift</label>
                  <div class="shift-grid">
                    @for (s of shifts; track s.value) {
                      <button class="shift-btn" [class.active]="form.workShift === s.value"
                              (click)="form.workShift = s.value">
                        {{ s.label }}
                      </button>
                    }
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Shift Start</label>
                    <input type="time" [(ngModel)]="form.shiftStart" />
                  </div>
                  <div class="form-group">
                    <label>Shift End</label>
                    <input type="time" [(ngModel)]="form.shiftEnd" />
                  </div>
                </div>
                <div class="form-group full">
                  <label>Weekly Off Days</label>
                  <div class="days-grid">
                    @for (d of days; track d) {
                      <button class="day-btn" [class.active]="isOffDay(d)" (click)="toggleOffDay(d)">
                        {{ d.slice(0, 3) }}
                      </button>
                    }
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-title">Contact Information</div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" [(ngModel)]="form.phone" placeholder="+91 99999 00000" />
                  </div>
                  <div class="form-group">
                    <label>Email</label>
                    <input type="email" [(ngModel)]="form.email" placeholder="staff@example.com" />
                  </div>
                </div>
                <div class="form-group full">
                  <label>Address</label>
                  <textarea [(ngModel)]="form.address" rows="2" placeholder="Full address..."></textarea>
                </div>
              </div>

              <div class="form-section">
                <div class="section-title">Emergency Contact</div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Name</label>
                    <input type="text" [(ngModel)]="form.emergencyContact" placeholder="Contact name" />
                  </div>
                  <div class="form-group">
                    <label>Phone</label>
                    <input type="tel" [(ngModel)]="form.emergencyPhone" placeholder="+91 99999 00000" />
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <button class="btn-save" [disabled]="saving()" (click)="saveProfile()">
                  {{ saving() ? 'Saving…' : '💾 Save Profile' }}
                </button>
              </div>
            </div>
          }

          <!-- Letter Tab -->
          @if (tab() === 'letter') {
            <div class="letter-section">
              @if (letterLoading()) {
                <div class="loading"><div class="spinner"></div></div>
              } @else if (letter()) {
                <div class="letter-preview" id="letter-print-area">
                  <ng-container *ngTemplateOutlet="letterTemplate; context: { $implicit: letter()!.content }"></ng-container>
                </div>
                <div class="letter-actions">
                  <button class="btn-secondary" (click)="regenerateLetter()">🔄 Re-generate</button>
                  <button class="btn-print" (click)="printLetter()">🖨️ Print / Save PDF</button>
                </div>
              } @else {
                <div class="no-letter">
                  <div class="nl-icon">📄</div>
                  <p>No joining letter generated yet.</p>
                  <button class="btn-generate" (click)="generateLetter()">✨ Generate Joining Letter</button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }

    <!-- Letter print template (used inline) -->
    <ng-template #letterTemplate let-c>
      <div class="letter-doc">
        <div class="letter-top">
          <div class="org-name">{{ c['storeName'] ?? c['organizationName'] }}</div>
          <div class="org-address">{{ c['storeAddress'] ?? c['organizationAddress'] }}</div>
          @if (c['storePhone']) { <div class="org-phone">📞 {{ c['storePhone'] }}</div> }
        </div>
        <div class="letter-meta-row">
          <span><strong>Letter No:</strong> {{ c['letterNumber'] }}</span>
          <span><strong>Date:</strong> {{ c['issuedDate'] | date:'dd MMMM yyyy' }}</span>
        </div>
        <div class="letter-subject">
          <strong>APPOINTMENT / JOINING LETTER</strong>
        </div>
        <div class="letter-salutation">Dear {{ c['employeeName'] }},</div>
        <div class="letter-body">
          <p>
            We are pleased to appoint you as <strong>{{ c['designation'] }}</strong> in the
            <strong>{{ c['department'] }}</strong> department, effective from
            <strong>{{ c['joiningDate'] | date:'dd MMMM yyyy' }}</strong>.
          </p>
          <p>Your employment details are as follows:</p>
        </div>
        <table class="letter-table">
          <tr><td>Employee Code</td><td>{{ c['employeeCode'] }}</td></tr>
          <tr><td>Designation</td><td>{{ c['designation'] }}</td></tr>
          <tr><td>Department</td><td>{{ c['department'] }}</td></tr>
          <tr><td>Date of Joining</td><td>{{ c['joiningDate'] | date:'dd MMMM yyyy' }}</td></tr>
          @if (c['probationEndDate']) {
            <tr><td>Probation Period</td><td>Until {{ c['probationEndDate'] | date:'dd MMMM yyyy' }}</td></tr>
          }
          <tr><td>Monthly Compensation</td><td>{{ c['salary'] }}</td></tr>
          <tr><td>Working Hours</td><td>{{ c['shift'] }}</td></tr>
          <tr><td>Weekly Off</td><td>{{ c['weeklyOff'] }}</td></tr>
          @if (c['phone']) { <tr><td>Contact</td><td>{{ c['phone'] }}</td></tr> }
        </table>
        <div class="letter-body">
          <p>
            You are required to maintain professional conduct and adhere to the company's policies.
            This appointment is subject to satisfactory completion of the probation period and compliance with all terms.
          </p>
          <p>We look forward to a long and productive association with you.</p>
        </div>
        <div class="letter-sign">
          <div class="sign-block">
            <div class="sign-line"></div>
            <div class="sign-label">Authorised Signatory</div>
            <div class="sign-org">{{ c['storeName'] ?? c['organizationName'] }}</div>
          </div>
          <div class="sign-ack">
            <div class="sign-line"></div>
            <div class="sign-label">Employee Signature & Acceptance</div>
            <div class="sign-date">Date: ____________</div>
          </div>
        </div>
      </div>
    </ng-template>
  `,
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
