import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { DashboardData } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Dashboard</h1>
        <p class="page-sub">Welcome back! Here's what's happening.</p>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Loading dashboard...</p>
        </div>
      } @else if (data()) {
        <!-- Stat Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon blue">👥</div>
            <div class="stat-info">
              <div class="stat-value">{{ data()!.totalEmployees }}</div>
              <div class="stat-label">Total Employees</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green">🩺</div>
            <div class="stat-info">
              <div class="stat-value">{{ data()!.activeDoctors }}</div>
              <div class="stat-label">Active Doctors</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple">🏪</div>
            <div class="stat-info">
              <div class="stat-value">{{ data()!.activeStoreStaff }}</div>
              <div class="stat-label">Active Store Staff</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">📋</div>
            <div class="stat-info">
              <div class="stat-value">{{ data()!.pendingLeaves }}</div>
              <div class="stat-label">Pending Leaves</div>
            </div>
          </div>
        </div>

        <!-- Bottom Row -->
        <div class="bottom-row">
          <!-- Recent Joins -->
          <div class="card recent-joins">
            <div class="card-header">
              <h2 class="card-title">Recent Joins</h2>
              <span class="card-badge">Last 5</span>
            </div>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Designation</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  @for (emp of data()!.recentJoins; track emp.id) {
                    <tr>
                      <td>
                        <div class="emp-cell">
                          <div class="emp-avatar">{{ emp.name.charAt(0) }}</div>
                          <span>{{ emp.name }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="badge" [class]="emp.empType === 'DOCTOR' ? 'badge-blue' : 'badge-purple'">
                          {{ emp.empType === 'DOCTOR' ? '🩺 Doctor' : '🏪 Staff' }}
                        </span>
                      </td>
                      <td class="text-muted">{{ emp.designation ?? '—' }}</td>
                      <td class="text-muted">{{ emp.joiningDate | date:'dd MMM yyyy' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="4" class="empty-row">No recent joins</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Leave Stats -->
          <div class="card leave-stats">
            <div class="card-header">
              <h2 class="card-title">Leave Summary</h2>
            </div>
            <div class="leave-pie">
              <div class="leave-stat pending">
                <div class="leave-count">{{ data()!.leaveStats.PENDING }}</div>
                <div class="leave-type-label">Pending</div>
                <div class="leave-bar">
                  <div
                    class="leave-fill pending-fill"
                    [style.width]="leavePercent('PENDING') + '%'"
                  ></div>
                </div>
              </div>
              <div class="leave-stat approved">
                <div class="leave-count">{{ data()!.leaveStats.APPROVED }}</div>
                <div class="leave-type-label">Approved</div>
                <div class="leave-bar">
                  <div
                    class="leave-fill approved-fill"
                    [style.width]="leavePercent('APPROVED') + '%'"
                  ></div>
                </div>
              </div>
              <div class="leave-stat rejected">
                <div class="leave-count">{{ data()!.leaveStats.REJECTED }}</div>
                <div class="leave-type-label">Rejected</div>
                <div class="leave-bar">
                  <div
                    class="leave-fill rejected-fill"
                    [style.width]="leavePercent('REJECTED') + '%'"
                  ></div>
                </div>
              </div>
            </div>

            <div class="leave-total">
              Total: <strong>{{ totalLeaves() }}</strong> leaves
            </div>

            <div class="breakdown-grid">
              <div class="breakdown-item">
                <div class="bd-label">Total Doctors</div>
                <div class="bd-value">{{ data()!.totalDoctors }}</div>
              </div>
              <div class="breakdown-item">
                <div class="bd-label">Total Store Staff</div>
                <div class="bd-value">{{ data()!.totalStoreStaff }}</div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; }

    .page-header { margin-bottom: 28px; }
    .page-title { font-size: 24px; font-weight: 800; color: var(--text-primary); }
    .page-sub { color: var(--text-muted); margin-top: 4px; }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 80px;
      color: var(--text-muted);
    }

    .spinner-lg {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: all var(--transition);
    }

    .stat-card:hover {
      border-color: var(--border-light);
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      flex-shrink: 0;
    }

    .stat-icon.blue { background: rgba(6, 182, 212, 0.15); }
    .stat-icon.green { background: var(--green-bg); }
    .stat-icon.purple { background: rgba(139, 92, 246, 0.15); }
    .stat-icon.orange { background: var(--orange-bg); }

    .stat-value {
      font-size: 28px;
      font-weight: 800;
      color: var(--text-primary);
      line-height: 1;
    }

    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 4px;
    }

    .bottom-row {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 20px;
    }

    .card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .card-title { font-size: 16px; font-weight: 700; }

    .card-badge {
      font-size: 11px;
      padding: 3px 8px;
      background: var(--bg-input);
      border-radius: 20px;
      color: var(--text-muted);
    }

    .table-wrap { overflow-x: auto; }

    .table {
      width: 100%;
      border-collapse: collapse;
    }

    .table th {
      text-align: left;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
    }

    .table td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      color: var(--text-primary);
    }

    .table tr:last-child td { border-bottom: none; }

    .emp-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .emp-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--accent-dark);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      flex-shrink: 0;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge-blue { background: rgba(6,182,212,0.1); color: var(--accent); }
    .badge-purple { background: rgba(139,92,246,0.1); color: #a78bfa; }

    .text-muted { color: var(--text-secondary); }

    .empty-row {
      text-align: center;
      color: var(--text-muted);
      padding: 24px !important;
    }

    /* Leave stats */
    .leave-pie {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 20px;
    }

    .leave-stat { display: flex; flex-direction: column; gap: 4px; }

    .leave-count { font-size: 22px; font-weight: 800; }

    .pending .leave-count { color: var(--orange); }
    .approved .leave-count { color: var(--green); }
    .rejected .leave-count { color: var(--red); }

    .leave-type-label { font-size: 12px; color: var(--text-muted); }

    .leave-bar {
      height: 6px;
      background: var(--bg-input);
      border-radius: 3px;
      overflow: hidden;
    }

    .leave-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
    .pending-fill { background: var(--orange); }
    .approved-fill { background: var(--green); }
    .rejected-fill { background: var(--red); }

    .leave-total {
      font-size: 13px;
      color: var(--text-muted);
      text-align: center;
      margin-bottom: 16px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
    }

    .breakdown-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .breakdown-item {
      background: var(--bg-input);
      border-radius: var(--radius-sm);
      padding: 12px;
      text-align: center;
    }

    .bd-label { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
    .bd-value { font-size: 18px; font-weight: 700; color: var(--text-primary); }

    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .bottom-row { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(HrApiService);
  data = signal<DashboardData | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.api.getDashboard().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  totalLeaves() {
    const stats = this.data()?.leaveStats;
    if (!stats) return 0;
    return (stats.PENDING || 0) + (stats.APPROVED || 0) + (stats.REJECTED || 0);
  }

  leavePercent(type: 'PENDING' | 'APPROVED' | 'REJECTED') {
    const total = this.totalLeaves();
    if (!total) return 0;
    return Math.round(((this.data()?.leaveStats[type] ?? 0) / total) * 100);
  }
}
