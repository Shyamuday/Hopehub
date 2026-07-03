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
  templateUrl: './employees.component.html',
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
