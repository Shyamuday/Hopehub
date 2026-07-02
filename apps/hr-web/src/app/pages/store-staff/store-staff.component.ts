import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { StoreStaff } from '../../models';
import { EmployeeDrawerComponent } from '../../shared/employee-drawer/employee-drawer.component';

@Component({
  selector: 'app-store-staff',
  standalone: true,
  imports: [DatePipe, EmployeeDrawerComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">🏪 Store Staff</h1>
          <p class="page-sub">{{ staff().length }} store staff members</p>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Loading store staff...</p>
        </div>
      } @else if (staff().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🏪</div>
          <p>No store staff found</p>
        </div>
      } @else {
        <div class="card-grid">
          @for (member of staff(); track member.id) {
            <div class="staff-card" (click)="openDrawer(member)">
              <div class="card-header-row">
                <div class="staff-avatar">{{ member.name.charAt(0).toUpperCase() }}</div>
                <span class="badge" [class]="statusClass(member.employeeStatus)">{{ member.employeeStatus }}</span>
              </div>

              <div class="staff-name">{{ member.name }}</div>
              @if (member.storeName) {
                <div class="staff-store">🏪 {{ member.storeName }}</div>
              }
              <div class="staff-role text-muted">{{ member.designation ?? 'Store Staff' }}</div>

              <div class="staff-details">
                @if (member.department) {
                  <div class="detail-chip">🏢 {{ member.department }}</div>
                }
                @if (member.workShift) {
                  <div class="detail-chip">
                    🕐 {{ member.workShift }}
                    @if (member.shiftStart && member.shiftEnd) {
                      ({{ member.shiftStart }}–{{ member.shiftEnd }})
                    }
                  </div>
                }
                @if (member.joiningDate) {
                  <div class="detail-chip">📅 {{ member.joiningDate | date:'dd MMM yyyy' }}</div>
                }
                @if (member.hasLetter) {
                  <div class="detail-chip badge-letter">📄 Letter</div>
                }
              </div>

              <div class="card-footer">
                <span class="view-link">View Details →</span>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <app-employee-drawer
      [employee]="selectedMember()"
      [visible]="drawerOpen()"
      (closed)="drawerOpen.set(false)"
      (saved)="onSaved($event)"
    />
  `,
  styles: [`
    .page { max-width: 1400px; }
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 800; }
    .page-sub { color: var(--text-muted); margin-top: 4px; }

    .loading-state, .empty-state {
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
    .empty-icon { font-size: 48px; margin-bottom: 8px; }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .staff-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      cursor: pointer;
      transition: all var(--transition);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .staff-card:hover {
      border-color: #a78bfa;
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }

    .card-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .staff-avatar {
      width: 52px; height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #5b21b6);
      color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 20px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-active { background: var(--green-bg); color: var(--green); }
    .badge-on-leave { background: var(--orange-bg); color: var(--orange); }
    .badge-resigned { background: var(--gray-bg); color: var(--gray); }
    .badge-terminated { background: var(--red-bg); color: var(--red); }

    .staff-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .staff-store { font-size: 13px; color: #a78bfa; font-weight: 500; }
    .staff-role { font-size: 13px; }
    .text-muted { color: var(--text-muted); }

    .staff-details {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .detail-chip {
      padding: 4px 10px;
      background: var(--bg-input);
      border-radius: 20px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .badge-letter {
      background: rgba(16,185,129,0.1);
      color: var(--green);
    }

    .card-footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .view-link {
      font-size: 13px;
      color: #a78bfa;
      font-weight: 500;
    }
  `]
})
export class StoreStaffComponent implements OnInit {
  private api = inject(HrApiService);

  staff = signal<StoreStaff[]>([]);
  loading = signal(true);
  selectedMember = signal<StoreStaff | null>(null);
  drawerOpen = signal(false);

  ngOnInit() {
    this.api.getStoreStaff().subscribe({
      next: (res) => { this.staff.set(res.staff); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openDrawer(member: StoreStaff) {
    this.selectedMember.set(member);
    this.drawerOpen.set(true);
  }

  onSaved(emp: any) {
    this.staff.update(list => list.map(s => s.id === emp.id ? emp : s));
    this.selectedMember.set(emp);
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
}
