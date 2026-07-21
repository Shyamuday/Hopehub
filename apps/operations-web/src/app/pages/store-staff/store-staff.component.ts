import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { StoreStaff } from '../../models';
import { EmployeeDrawerComponent, employeeStatusBadgeClass } from '@hopehub/hr-ui';

@Component({
  selector: 'app-store-staff',
  standalone: true,
  imports: [DatePipe, EmployeeDrawerComponent],
  templateUrl: './store-staff.component.html',
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
