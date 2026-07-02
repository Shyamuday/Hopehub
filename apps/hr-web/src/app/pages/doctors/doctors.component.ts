import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { Doctor } from '../../models';
import { EmployeeDrawerComponent } from '../../shared/employee-drawer/employee-drawer.component';
import { employeeStatusBadgeClass } from '../../shared/constants/employee-status.constants';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [DatePipe, EmployeeDrawerComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">🩺 Doctors</h1>
          <p class="page-sub">{{ doctors().length }} doctors in the system</p>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Loading doctors...</p>
        </div>
      } @else if (doctors().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">🩺</div>
          <p>No doctors found</p>
        </div>
      } @else {
        <div class="card-grid">
          @for (doc of doctors(); track doc.id) {
            <div class="doctor-card" (click)="openDrawer(doc)">
              <div class="card-header-row">
                <div class="doc-avatar">{{ doc.name.charAt(0).toUpperCase() }}</div>
                <span class="badge" [class]="statusClass(doc.employeeStatus)">{{ doc.employeeStatus }}</span>
              </div>

              <div class="doc-name">{{ doc.name }}</div>
              @if (doc.specialty) {
                <div class="doc-specialty">🔬 {{ doc.specialty }}</div>
              }
              <div class="doc-designation text-muted">{{ doc.designation ?? 'Doctor' }}</div>

              <div class="doc-details">
                @if (doc.department) {
                  <div class="detail-chip">🏥 {{ doc.department }}</div>
                }
                @if (doc.workShift) {
                  <div class="detail-chip">
                    🕐 {{ doc.workShift }}
                    @if (doc.shiftStart && doc.shiftEnd) {
                      ({{ doc.shiftStart }}–{{ doc.shiftEnd }})
                    }
                  </div>
                }
                @if (doc.joiningDate) {
                  <div class="detail-chip">📅 {{ doc.joiningDate | date:'dd MMM yyyy' }}</div>
                }
                @if (doc.hasLetter) {
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
      [employee]="selectedDoctor()"
      [visible]="drawerOpen()"
      (closed)="drawerOpen.set(false)"
      (saved)="onSaved($event)"
    />
  `,
  styleUrl: './doctors.component.scss'
})
export class DoctorsComponent implements OnInit {
  private api = inject(HrApiService);

  doctors = signal<Doctor[]>([]);
  loading = signal(true);
  selectedDoctor = signal<Doctor | null>(null);
  drawerOpen = signal(false);

  ngOnInit() {
    this.api.getDoctors().subscribe({
      next: (res) => { this.doctors.set(res.doctors); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openDrawer(doc: Doctor) {
    this.selectedDoctor.set(doc);
    this.drawerOpen.set(true);
  }

  onSaved(emp: any) {
    this.doctors.update(list => list.map(d => d.id === emp.id ? emp : d));
    this.selectedDoctor.set(emp);
  }

  statusClass = employeeStatusBadgeClass;
}
