import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AdminApi } from '../../../core/services/admin-api';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CommonModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboard {
  revenueInPaise = 0;
  activeDoctors = 0;
  consultationsCount = 0;
  error = '';

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.error = '';
    try {
      const report = (await this.api.getReports()) as {
        revenueInPaise: number;
        activeDoctors: number;
        consultations: Array<unknown>;
      };
      this.revenueInPaise = report.revenueInPaise || 0;
      this.activeDoctors = report.activeDoctors || 0;
      this.consultationsCount = report.consultations?.length || 0;
    } catch {
      this.error = 'Could not load admin dashboard summary.';
    }
  }
}
