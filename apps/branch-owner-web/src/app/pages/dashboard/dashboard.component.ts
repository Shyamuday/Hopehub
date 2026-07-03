import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HrApiService } from '../../services/hr-api.service';
import { DashboardData } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
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
