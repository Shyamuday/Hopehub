import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { StoreStaff } from '../../models';
import { EmployeeDrawerComponent } from '../../shared/employee-drawer/employee-drawer.component';
import { employeeStatusBadgeClass } from '../../shared/constants/employee-status.constants';

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
  styleUrl: './store-staff.component.scss'
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

  statusClass = employeeStatusBadgeClass;
}
