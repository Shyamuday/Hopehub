import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { Employee } from '../../models';
import { EmployeeDrawerComponent } from '../../shared/employee-drawer/employee-drawer.component';

type FilterType = 'ALL' | 'DOCTOR' | 'STORE_STAFF';
type FilterStatus = 'ALL' | 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [FormsModule, DatePipe, EmployeeDrawerComponent],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Employee Directory</h1>
          <p class="page-sub">{{ total() }} employees found</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            class="search-input"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            placeholder="Search by name, designation..."
          />
        </div>
        <div class="filter-tabs">
          @for (t of typeFilters; track t.value) {
            <button
              class="filter-tab"
              [class.active]="typeFilter() === t.value"
              (click)="setTypeFilter(t.value)"
            >{{ t.label }}</button>
          }
        </div>
        <div class="filter-tabs">
          @for (s of statusFilters; track s.value) {
            <button
              class="filter-tab"
              [class.active]="statusFilter() === s.value"
              (click)="setStatusFilter(s.value)"
            >{{ s.label }}</button>
          }
        </div>
      </div>

      <!-- Cards Grid -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner-lg"></div>
          <p>Loading employees...</p>
        </div>
      } @else if (employees().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <p>No employees found</p>
          <p class="empty-sub">Try adjusting your search or filters</p>
        </div>
      } @else {
        <div class="card-grid">
          @for (emp of employees(); track emp.id) {
            <div class="emp-card" (click)="openDrawer(emp)">
              <div class="card-top">
                <div class="emp-avatar-lg">{{ emp.name.charAt(0).toUpperCase() }}</div>
                <div class="emp-badges">
                  <span class="badge" [class]="statusClass(emp.employeeStatus)">{{ emp.employeeStatus }}</span>
                  @if (emp.hasLetter) {
                    <span class="badge badge-letter">📄 Letter</span>
                  }
                </div>
              </div>
              <div class="emp-name">{{ emp.name }}</div>
              <div class="emp-role">{{ emp.designation ?? '—' }}</div>
              <div class="emp-dept text-muted">{{ emp.department ?? emp.storeName ?? '—' }}</div>

              <div class="emp-details">
                @if (emp.specialty) {
                  <div class="detail-row">
                    <span>🔬</span><span>{{ emp.specialty }}</span>
                  </div>
                }
                @if (emp.workShift) {
                  <div class="detail-row">
                    <span>🕐</span>
                    <span>
                      {{ emp.workShift }}
                      @if (emp.shiftStart && emp.shiftEnd) {
                        ({{ emp.shiftStart }} – {{ emp.shiftEnd }})
                      }
                    </span>
                  </div>
                }
                @if (emp.joiningDate) {
                  <div class="detail-row">
                    <span>📅</span><span>Joined {{ emp.joiningDate | date:'dd MMM yyyy' }}</span>
                  </div>
                }
              </div>

              <div class="emp-type-chip">
                <span class="badge" [class]="emp.empType === 'DOCTOR' ? 'badge-blue' : 'badge-purple'">
                  {{ emp.empType === 'DOCTOR' ? '🩺 Doctor' : '🏪 Staff' }}
                </span>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Employee Drawer -->
    <app-employee-drawer
      [employee]="selectedEmployee()"
      [visible]="drawerOpen()"
      (closed)="drawerOpen.set(false)"
      (saved)="onSaved($event)"
    />
  `,
  styles: [`
    .page { max-width: 1400px; }
    .page-header { margin-bottom: 20px; }
    .page-title { font-size: 24px; font-weight: 800; }
    .page-sub { color: var(--text-muted); margin-top: 4px; }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 24px;
    }

    .search-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
    }

    .search-input {
      width: 100%;
      padding: 10px 12px 10px 38px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 14px;
      outline: none;
      transition: border-color var(--transition);
    }

    .search-input:focus { border-color: var(--accent); }
    .search-input::placeholder { color: var(--text-muted); }

    .filter-tabs { display: flex; gap: 4px; flex-wrap: wrap; }

    .filter-tab {
      padding: 8px 14px;
      border-radius: 20px;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--text-secondary);
      font-size: 13px;
      transition: all var(--transition);
    }

    .filter-tab:hover { border-color: var(--accent); color: var(--text-primary); }
    .filter-tab.active { border-color: var(--accent); background: var(--accent-glow); color: var(--accent); font-weight: 600; }

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

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 80px;
      color: var(--text-muted);
    }

    .empty-icon { font-size: 48px; margin-bottom: 8px; }
    .empty-sub { font-size: 13px; }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }

    .emp-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px;
      cursor: pointer;
      transition: all var(--transition);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .emp-card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }

    .card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .emp-avatar-lg {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--accent-dark);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 20px;
    }

    .emp-badges { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }

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
    .badge-letter { background: rgba(16,185,129,0.1); color: var(--green); }

    .emp-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
    .emp-role { font-size: 13px; color: var(--text-secondary); }
    .emp-dept { font-size: 12px; }
    .text-muted { color: var(--text-muted); }

    .emp-details {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .emp-type-chip { margin-top: 8px; }
  `]
})
export class EmployeesComponent implements OnInit {
  private api = inject(HrApiService);

  employees = signal<Employee[]>([]);
  total = signal(0);
  loading = signal(true);
  selectedEmployee = signal<Employee | null>(null);
  drawerOpen = signal(false);

  searchQuery = '';
  typeFilter = signal<FilterType>('ALL');
  statusFilter = signal<FilterStatus>('ALL');

  private searchTimer: any = null;

  typeFilters = [
    { value: 'ALL' as FilterType, label: 'All Types' },
    { value: 'DOCTOR' as FilterType, label: '🩺 Doctors' },
    { value: 'STORE_STAFF' as FilterType, label: '🏪 Store Staff' }
  ];

  statusFilters = [
    { value: 'ALL' as FilterStatus, label: 'All Status' },
    { value: 'ACTIVE' as FilterStatus, label: 'Active' },
    { value: 'ON_LEAVE' as FilterStatus, label: 'On Leave' }
  ];

  ngOnInit() { this.loadEmployees(); }

  loadEmployees() {
    this.loading.set(true);
    this.api.getEmployees({
      q: this.searchQuery || undefined,
      type: this.typeFilter() !== 'ALL' ? this.typeFilter() : undefined,
      status: this.statusFilter() !== 'ALL' ? this.statusFilter() : undefined
    }).subscribe({
      next: (res) => {
        this.employees.set(res.employees);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadEmployees(), 400);
  }

  setTypeFilter(v: FilterType) { this.typeFilter.set(v); this.loadEmployees(); }
  setStatusFilter(v: FilterStatus) { this.statusFilter.set(v); this.loadEmployees(); }

  openDrawer(emp: Employee) {
    this.selectedEmployee.set(emp);
    this.drawerOpen.set(true);
  }

  onSaved(emp: Employee) {
    this.employees.update(list => list.map(e => e.id === emp.id ? emp : e));
    this.selectedEmployee.set(emp);
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
