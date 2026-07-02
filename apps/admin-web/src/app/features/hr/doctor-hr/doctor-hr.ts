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
  template: `
    <div class="hr-page">
      <div class="hr-header">
        <h1>🩺 Doctor HR Records</h1>
        <p>Manage joining dates, shift schedules & employment letters for all doctors</p>
      </div>

      @if (loading()) {
        <div class="loading"><div class="spinner"></div></div>
      } @else {
        <div class="doctor-grid">
          @for (d of doctors(); track d.id) {
            <div class="doctor-card" (click)="openProfile(d)">
              <div class="doc-avatar">{{ d.user?.name?.charAt(0)?.toUpperCase() ?? 'D' }}</div>
              <div class="doc-body">
                <div class="doc-name">{{ d.user?.name }}</div>
                <div class="doc-meta">
                  <span class="specialty">{{ d.specialty }}</span>
                  <span class="status-dot" [style.color]="statusColor(d.employeeStatus)">●</span>
                  <span class="status-lbl">{{ d.employeeStatus }}</span>
                </div>
                <div class="doc-info-row">
                  <span>{{ d.designation ?? 'Doctor' }}</span>
                  @if (d.workShift) { <span class="sep">|</span><span class="shift">{{ shiftLabel(d.workShift) }}</span> }
                </div>
                @if (d.joiningDate) {
                  <div class="joining-chip">Joined {{ d.joiningDate | date:'dd MMM yyyy' }}</div>
                }
              </div>
              @if (d.joiningLetter) { <div class="letter-icon">📄</div> }
            </div>
          }
        </div>

        @if (doctors().length === 0) {
          <div class="empty">
            <div>🩺</div><h3>No doctors found</h3><p>Add doctors first from the Doctors page.</p>
          </div>
        }
      }
    </div>

    <!-- Profile Drawer -->
    @if (profileOpen() && selected()) {
      <div class="overlay" (click)="close()">
        <div class="drawer" (click)="$event.stopPropagation()">
          <div class="dh">
            <div class="dh-avatar">{{ selected()?.user?.name?.charAt(0)?.toUpperCase() ?? 'D' }}</div>
            <div class="dh-info">
              <div class="dh-name">{{ selected()?.user?.name }}</div>
              <div class="dh-sub">{{ selected()?.specialty }}</div>
            </div>
            <div class="dh-tabs">
              <button [class.active]="tab() === 'profile'" (click)="tab.set('profile')">Profile</button>
              <button [class.active]="tab() === 'letter'" (click)="openLetter()">Letter</button>
            </div>
            <button class="close-btn" (click)="close()">✕</button>
          </div>

          <!-- Profile Tab -->
          @if (tab() === 'profile') {
            <div class="form-body">
              <div class="fsect">
                <div class="ftitle">Employment</div>
                <div class="frow">
                  <div class="fg">
                    <label>Employee ID</label>
                    <input [(ngModel)]="form.employeeId" placeholder="DOC-001" />
                  </div>
                  <div class="fg">
                    <label>Status</label>
                    <select [(ngModel)]="form.employeeStatus">
                      <option value="ACTIVE">Active</option>
                      <option value="ON_LEAVE">On Leave</option>
                      <option value="RESIGNED">Resigned</option>
                      <option value="TERMINATED">Terminated</option>
                    </select>
                  </div>
                </div>
                <div class="frow">
                  <div class="fg">
                    <label>Designation</label>
                    <input [(ngModel)]="form.designation" placeholder="Senior Doctor" />
                  </div>
                  <div class="fg">
                    <label>Department</label>
                    <input [(ngModel)]="form.department" placeholder="Homeopathy" />
                  </div>
                </div>
                <div class="frow">
                  <div class="fg">
                    <label>Joining Date</label>
                    <input type="date" [(ngModel)]="form.joiningDate" />
                  </div>
                  <div class="fg">
                    <label>Probation End</label>
                    <input type="date" [(ngModel)]="form.probationEndDate" />
                  </div>
                </div>
                <div class="frow">
                  <div class="fg">
                    <label>Monthly Salary (₹)</label>
                    <input type="number" [(ngModel)]="salaryDisplay" placeholder="50000" />
                  </div>
                  <div class="fg">
                    <label>Consultation Fee (₹)</label>
                    <input type="number" [(ngModel)]="feeDisplay" placeholder="500" />
                  </div>
                </div>
              </div>

              <div class="fsect">
                <div class="ftitle">Shift & Schedule</div>
                <div class="shift-grid">
                  @for (s of shifts; track s.value) {
                    <button class="shift-btn" [class.active]="form.workShift === s.value" (click)="form.workShift = s.value">
                      {{ s.label }}
                    </button>
                  }
                </div>
                <div class="frow" style="margin-top:12px">
                  <div class="fg">
                    <label>Start Time</label>
                    <input type="time" [(ngModel)]="form.shiftStart" />
                  </div>
                  <div class="fg">
                    <label>End Time</label>
                    <input type="time" [(ngModel)]="form.shiftEnd" />
                  </div>
                </div>
                <div class="fg full" style="margin-top:12px">
                  <label>Weekly Off Days</label>
                  <div class="days-grid">
                    @for (d of days; track d) {
                      <button class="day-btn" [class.active]="isOff(d)" (click)="toggleOff(d)">{{ d.slice(0,3) }}</button>
                    }
                  </div>
                </div>
              </div>

              <div class="fsect">
                <div class="ftitle">Contact</div>
                <div class="frow">
                  <div class="fg">
                    <label>Phone</label>
                    <input type="tel" [(ngModel)]="form.phone" placeholder="+91 99999 00000" />
                  </div>
                  <div class="fg full">
                    <label>Address</label>
                    <textarea [(ngModel)]="form.address" rows="2" placeholder="Full address"></textarea>
                  </div>
                </div>
                <div class="frow">
                  <div class="fg">
                    <label>Emergency Contact</label>
                    <input [(ngModel)]="form.emergencyContact" placeholder="Name" />
                  </div>
                  <div class="fg">
                    <label>Emergency Phone</label>
                    <input type="tel" [(ngModel)]="form.emergencyPhone" />
                  </div>
                </div>
              </div>

              <button class="btn-save" [disabled]="saving()" (click)="save()">
                {{ saving() ? 'Saving…' : '💾 Save HR Profile' }}
              </button>
            </div>
          }

          <!-- Letter Tab -->
          @if (tab() === 'letter') {
            <div class="letter-section">
              @if (letterLoading()) {
                <div class="loading"><div class="spinner"></div></div>
              } @else if (letter()) {
                <div class="letter-preview" id="print-area">
                  <div class="letter-doc">
                    <div class="letter-top">
                      <div class="org-name">{{ letter()!.content['organizationName'] }}</div>
                      <div class="org-addr">{{ letter()!.content['organizationAddress'] }}</div>
                    </div>
                    <div class="lmeta">
                      <span><strong>Letter No:</strong> {{ letter()!.content['letterNumber'] }}</span>
                      <span><strong>Date:</strong> {{ letter()!.content['issuedDate'] | date:'dd MMMM yyyy' }}</span>
                    </div>
                    <div class="lsubject"><strong>APPOINTMENT / JOINING LETTER</strong></div>
                    <p class="lsalut">Dear Dr. {{ letter()!.content['employeeName'] }},</p>
                    <p>We are pleased to appoint you as <strong>{{ letter()!.content['designation'] }}</strong> in the <strong>{{ letter()!.content['department'] }}</strong> department effective from <strong>{{ letter()!.content['joiningDate'] | date:'dd MMMM yyyy' }}</strong>.</p>
                    <table class="ltable">
                      <tr><td>Employee Code</td><td>{{ letter()!.content['employeeCode'] }}</td></tr>
                      <tr><td>Designation</td><td>{{ letter()!.content['designation'] }}</td></tr>
                      <tr><td>Specialty</td><td>{{ letter()!.content['specialty'] }}</td></tr>
                      <tr><td>Registration No.</td><td>{{ letter()!.content['registrationNo'] }}</td></tr>
                      <tr><td>Date of Joining</td><td>{{ letter()!.content['joiningDate'] | date:'dd MMMM yyyy' }}</td></tr>
                      @if (letter()!.content['probationEndDate']) {
                        <tr><td>Probation Until</td><td>{{ letter()!.content['probationEndDate'] | date:'dd MMMM yyyy' }}</td></tr>
                      }
                      <tr><td>Salary</td><td>{{ letter()!.content['salary'] }}</td></tr>
                      <tr><td>Consultation Fee</td><td>{{ letter()!.content['consultationFee'] }}</td></tr>
                      <tr><td>Working Hours</td><td>{{ letter()!.content['shift'] }}</td></tr>
                      <tr><td>Weekly Off</td><td>{{ letter()!.content['weeklyOff'] }}</td></tr>
                    </table>
                    <p>You are expected to maintain professional conduct and comply with all clinic policies.</p>
                    <div class="lsign">
                      <div><div class="sline"></div><div class="slbl">Authorised Signatory</div></div>
                      <div><div class="sline"></div><div class="slbl">Doctor's Acceptance & Date</div></div>
                    </div>
                  </div>
                </div>
                <div class="letter-actions">
                  <button class="btn-sec" (click)="regen()">🔄 Re-generate</button>
                  <button class="btn-print" (click)="print()">🖨️ Print / PDF</button>
                </div>
              } @else {
                <div class="no-letter">
                  <div>📄</div><p>No joining letter yet.</p>
                  <button class="btn-gen" (click)="generate()">✨ Generate Letter</button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
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
