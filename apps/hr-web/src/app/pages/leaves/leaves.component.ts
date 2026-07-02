import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { Leave, LeaveStatus, LeaveType, EmpType } from '../../models';

type TabStatus = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

const LEAVE_ICONS: Record<LeaveType, string> = {
  CASUAL: '📅', SICK: '🤒', EARNED: '⭐', UNPAID: '💸', MATERNITY: '👶', PATERNITY: '👨‍👶'
};

@Component({
  selector: 'app-leaves',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Leave Management</h1>
          <p class="page-sub">{{ total() }} leave records</p>
        </div>
        <button class="btn-primary" (click)="showAddModal.set(true)">+ Add Leave</button>
      </div>

      <!-- Status Tabs -->
      <div class="status-tabs">
        @for (tab of tabs; track tab.value) {
          <button
            class="status-tab"
            [class.active]="activeTab() === tab.value"
            (click)="setTab(tab.value)"
          >{{ tab.label }}</button>
        }
      </div>

      <!-- Leaves List -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Loading leaves...</p>
        </div>
      } @else if (leaves().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>No {{ activeTab() === 'ALL' ? '' : activeTab().toLowerCase() + ' ' }}leave records found</p>
        </div>
      } @else {
        <div class="leaves-list">
          @for (leave of leaves(); track leave.id) {
            <div class="leave-card">
              <div class="leave-top">
                <div class="leave-type-badge">
                  <span class="type-icon">{{ leaveIcon(leave.type) }}</span>
                  <span class="type-label">{{ leave.type }}</span>
                </div>
                <span class="badge" [class]="statusClass(leave.status)">{{ leave.status }}</span>
              </div>

              <div class="leave-body">
                <div class="leave-emp">
                  <div class="emp-avatar">{{ (leave.employeeName ?? 'U').charAt(0) }}</div>
                  <div>
                    <div class="emp-name">{{ leave.employeeName ?? 'Unknown Employee' }}</div>
                    <div class="emp-type text-muted">{{ leave.employeeType }}</div>
                  </div>
                </div>

                <div class="leave-dates">
                  <div class="date-range">
                    <span class="date-label">From</span>
                    <span class="date-val">{{ leave.startDate | date:'dd MMM yyyy' }}</span>
                  </div>
                  <span class="date-arrow">→</span>
                  <div class="date-range">
                    <span class="date-label">To</span>
                    <span class="date-val">{{ leave.endDate | date:'dd MMM yyyy' }}</span>
                  </div>
                  @if (leave.totalDays) {
                    <div class="days-chip">{{ leave.totalDays }} day{{ leave.totalDays === 1 ? '' : 's' }}</div>
                  }
                </div>

                @if (leave.reason) {
                  <div class="leave-reason">
                    <span class="reason-label">Reason:</span>
                    <span class="reason-text">{{ leave.reason }}</span>
                  </div>
                }

                @if (leave.hrNote) {
                  <div class="hr-note">
                    <span class="note-label">HR Note:</span>
                    <span>{{ leave.hrNote }}</span>
                  </div>
                }
              </div>

              @if (leave.status === 'PENDING') {
                <div class="leave-actions">
                  <input
                    class="note-input"
                    [(ngModel)]="hrNotes[leave.id]"
                    placeholder="Add HR note (optional)..."
                  />
                  <button
                    class="btn-approve"
                    (click)="updateLeave(leave, 'APPROVED')"
                    [disabled]="updatingId() === leave.id"
                  >✓ Approve</button>
                  <button
                    class="btn-reject"
                    (click)="updateLeave(leave, 'REJECTED')"
                    [disabled]="updatingId() === leave.id"
                  >✕ Reject</button>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Add Leave Modal -->
    @if (showAddModal()) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Add Leave Record</h2>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            @if (addError()) {
              <div class="error-banner">⚠️ {{ addError() }}</div>
            }
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label">Employee Type</label>
                <select class="form-input" [(ngModel)]="addForm.employeeType">
                  <option value="DOCTOR">Doctor</option>
                  <option value="STORE_STAFF">Store Staff</option>
                </select>
              </div>
              <div class="form-group full-width">
                <label class="form-label">Employee ID</label>
                <input class="form-input" [(ngModel)]="addForm.employeeId" placeholder="Doctor or Staff ID" />
              </div>
              <div class="form-group full-width">
                <label class="form-label">Leave Type</label>
                <select class="form-input" [(ngModel)]="addForm.type">
                  @for (lt of leaveTypes; track lt) {
                    <option [value]="lt">{{ lt }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Start Date</label>
                <input class="form-input" type="date" [(ngModel)]="addForm.startDate" />
              </div>
              <div class="form-group">
                <label class="form-label">End Date</label>
                <input class="form-input" type="date" [(ngModel)]="addForm.endDate" />
              </div>
              <div class="form-group full-width">
                <label class="form-label">Reason</label>
                <textarea class="form-input" [(ngModel)]="addForm.reason" rows="3" placeholder="Reason for leave..."></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn-primary" (click)="submitLeave()" [disabled]="addLoading()">
              @if (addLoading()) {
                <span class="spinner-sm"></span> Adding...
              } @else {
                Add Leave
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { max-width: 900px; }
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .page-title { font-size: 24px; font-weight: 800; }
    .page-sub { color: var(--text-muted); margin-top: 4px; }

    .status-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }

    .status-tab {
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all var(--transition);
    }

    .status-tab:hover { color: var(--text-secondary); }
    .status-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

    .loading-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 16px; padding: 80px; color: var(--text-muted);
    }

    .spinner-lg {
      width: 40px; height: 40px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; padding: 80px; color: var(--text-muted);
    }
    .empty-icon { font-size: 48px; margin-bottom: 8px; }

    .leaves-list { display: flex; flex-direction: column; gap: 14px; }

    .leave-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px;
      transition: border-color var(--transition);
    }

    .leave-card:hover { border-color: var(--border-light); }

    .leave-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .leave-type-badge {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .type-icon { font-size: 20px; }
    .type-label { font-size: 14px; font-weight: 700; color: var(--text-primary); }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge-pending { background: var(--orange-bg); color: var(--orange); }
    .badge-approved { background: var(--green-bg); color: var(--green); }
    .badge-rejected { background: var(--red-bg); color: var(--red); }
    .badge-cancelled { background: var(--gray-bg); color: var(--gray); }

    .leave-body { display: flex; flex-direction: column; gap: 12px; }

    .leave-emp { display: flex; align-items: center; gap: 10px; }

    .emp-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: var(--accent-dark);
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 14px;
      flex-shrink: 0;
    }

    .emp-name { font-size: 14px; font-weight: 600; }
    .emp-type { font-size: 12px; }
    .text-muted { color: var(--text-muted); }

    .leave-dates {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .date-range { display: flex; flex-direction: column; gap: 2px; }
    .date-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .date-val { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .date-arrow { color: var(--text-muted); font-size: 18px; }

    .days-chip {
      padding: 4px 10px;
      background: var(--accent-glow);
      color: var(--accent);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-left: auto;
    }

    .leave-reason {
      font-size: 13px;
      color: var(--text-secondary);
      display: flex;
      gap: 6px;
    }
    .reason-label { color: var(--text-muted); font-weight: 600; flex-shrink: 0; }

    .hr-note {
      font-size: 13px;
      color: var(--accent);
      display: flex;
      gap: 6px;
      background: var(--accent-glow);
      padding: 8px 12px;
      border-radius: var(--radius-sm);
    }
    .note-label { font-weight: 600; flex-shrink: 0; }

    .leave-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid var(--border);
      flex-wrap: wrap;
    }

    .note-input {
      flex: 1;
      min-width: 180px;
      padding: 8px 12px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
    }

    .note-input:focus { border-color: var(--accent); }
    .note-input::placeholder { color: var(--text-muted); }

    .btn-approve {
      padding: 8px 16px;
      background: var(--green-bg);
      color: var(--green);
      border: 1px solid var(--green);
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      transition: all var(--transition);
    }
    .btn-approve:hover:not(:disabled) { background: var(--green); color: white; }
    .btn-approve:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-reject {
      padding: 8px 16px;
      background: var(--red-bg);
      color: var(--red);
      border: 1px solid var(--red);
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      transition: all var(--transition);
    }
    .btn-reject:hover:not(:disabled) { background: var(--red); color: white; }
    .btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Buttons */
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
    .btn-secondary:hover { color: var(--text-primary); }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 300;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      backdrop-filter: blur(2px);
    }

    .modal {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 520px;
      box-shadow: var(--shadow-lg);
      animation: fadeUp 0.2s ease;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
    }

    .modal-header h2 { font-size: 18px; font-weight: 700; }

    .close-btn {
      width: 32px; height: 32px;
      border-radius: var(--radius-sm);
      background: var(--bg-input);
      color: var(--text-secondary);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      transition: all var(--transition);
    }
    .close-btn:hover { background: var(--red-bg); color: var(--red); }

    .modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }

    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .full-width { grid-column: 1 / -1; }
    .form-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

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
      resize: vertical;
    }
    .form-input:focus { border-color: var(--accent); }
    .form-input::placeholder { color: var(--text-muted); }
    select.form-input option { background: var(--bg-card); }

    .error-banner {
      background: var(--red-bg);
      border: 1px solid var(--red);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      color: var(--red);
      font-size: 13px;
    }

    .modal-footer {
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .spinner-sm {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
  `]
})
export class LeavesComponent implements OnInit {
  private api = inject(HrApiService);

  leaves = signal<Leave[]>([]);
  total = signal(0);
  loading = signal(true);
  updatingId = signal<string | null>(null);
  showAddModal = signal(false);
  addLoading = signal(false);
  addError = signal('');

  activeTab = signal<TabStatus>('ALL');
  hrNotes: Record<string, string> = {};

  leaveTypes: LeaveType[] = ['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'MATERNITY', 'PATERNITY'];

  addForm = {
    employeeType: 'DOCTOR' as EmpType,
    employeeId: '',
    type: 'CASUAL' as LeaveType,
    startDate: '',
    endDate: '',
    reason: ''
  };

  tabs = [
    { value: 'ALL' as TabStatus, label: 'All' },
    { value: 'PENDING' as TabStatus, label: '⏳ Pending' },
    { value: 'APPROVED' as TabStatus, label: '✓ Approved' },
    { value: 'REJECTED' as TabStatus, label: '✕ Rejected' }
  ];

  ngOnInit() { this.loadLeaves(); }

  loadLeaves() {
    this.loading.set(true);
    this.api.getLeaves({
      status: this.activeTab() !== 'ALL' ? this.activeTab() : undefined,
      page: 1,
      pageSize: 50
    }).subscribe({
      next: (res) => { this.leaves.set(res.leaves); this.total.set(res.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  setTab(tab: TabStatus) { this.activeTab.set(tab); this.loadLeaves(); }

  updateLeave(leave: Leave, status: LeaveStatus) {
    this.updatingId.set(leave.id);
    this.api.updateLeave(leave.id, { status, hrNote: this.hrNotes[leave.id] || undefined }).subscribe({
      next: (res) => {
        this.updatingId.set(null);
        this.leaves.update(list => list.map(l => l.id === leave.id ? res.leave : l));
      },
      error: () => this.updatingId.set(null)
    });
  }

  closeModal() {
    this.showAddModal.set(false);
    this.addError.set('');
    this.addForm = { employeeType: 'DOCTOR', employeeId: '', type: 'CASUAL', startDate: '', endDate: '', reason: '' };
  }

  submitLeave() {
    const f = this.addForm;
    if (!f.employeeId || !f.startDate || !f.endDate) {
      this.addError.set('Please fill in all required fields.');
      return;
    }
    this.addLoading.set(true);
    this.addError.set('');

    const payload: any = {
      employeeType: f.employeeType,
      type: f.type,
      startDate: f.startDate,
      endDate: f.endDate,
      reason: f.reason || undefined
    };

    if (f.employeeType === 'DOCTOR') payload.doctorId = f.employeeId;
    else payload.storeStaffId = f.employeeId;

    this.api.createLeave(payload).subscribe({
      next: (res) => {
        this.addLoading.set(false);
        this.leaves.update(l => [res.leave, ...l]);
        this.total.update(t => t + 1);
        this.closeModal();
      },
      error: (err) => {
        this.addLoading.set(false);
        this.addError.set(err?.error?.message ?? 'Failed to create leave.');
      }
    });
  }

  leaveIcon(type: LeaveType): string { return LEAVE_ICONS[type] ?? '📋'; }

  statusClass(status: LeaveStatus): string {
    const map: Record<string, string> = {
      'PENDING': 'badge-pending',
      'APPROVED': 'badge-approved',
      'REJECTED': 'badge-rejected',
      'CANCELLED': 'badge-cancelled'
    };
    return map[status] ?? 'badge-cancelled';
  }
}
