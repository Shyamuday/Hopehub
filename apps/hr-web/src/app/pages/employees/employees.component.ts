import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { Employee } from '../../models';
import { EmployeeDrawerComponent } from '../../shared/employee-drawer/employee-drawer.component';
import { EMPLOYEE_STATUS_FILTER_OPTIONS, employeeStatusBadgeClass } from '../../shared/constants/employee-status.constants';
import { EMPLOYEE_TYPE_FILTER_OPTIONS } from '../../shared/constants/employee-type.constants';
import { SEARCH_DEBOUNCE_MS } from '../../core/constants/timing.constants';

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
  styleUrl: './employees.component.scss'
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

  typeFilters = EMPLOYEE_TYPE_FILTER_OPTIONS;
  statusFilters = EMPLOYEE_STATUS_FILTER_OPTIONS;

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
    this.searchTimer = setTimeout(() => this.loadEmployees(), SEARCH_DEBOUNCE_MS);
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

  statusClass = employeeStatusBadgeClass;
}
