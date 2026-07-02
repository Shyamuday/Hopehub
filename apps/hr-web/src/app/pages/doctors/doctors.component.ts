import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { Doctor } from '../../models';
import { EmployeeDrawerComponent } from '../../shared/employee-drawer/employee-drawer.component';

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

    .doctor-card {
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

    .doctor-card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }

    .card-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .doc-avatar {
      width: 52px; height: 52px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-dark), #0e7490);
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

    .doc-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .doc-specialty { font-size: 13px; color: var(--accent); font-weight: 500; }
    .doc-designation { font-size: 13px; }
    .text-muted { color: var(--text-muted); }

    .doc-details {
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
      color: var(--accent);
      font-weight: 500;
    }
  `]
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
