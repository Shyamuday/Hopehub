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
  templateUrl: './doctors.component.html',
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
