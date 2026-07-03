import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import { DashboardData } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  readonly dashboard = httpResource<DashboardData>(
    () => `${environment.apiUrl}${API_PATHS.HR.DASHBOARD}`
  );

  data = () => (this.dashboard.hasValue() ? this.dashboard.value() : null);
  loading = () => this.dashboard.isLoading();

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
