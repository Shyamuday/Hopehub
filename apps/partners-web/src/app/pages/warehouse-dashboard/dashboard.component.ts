import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { WarehouseApiService } from '../../services/warehouse-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private api = inject(WarehouseApiService);

  loading = signal(true);
  error = signal('');
  dashboard = signal<any | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getDashboard()
      .then((data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load warehouse dashboard.');
        this.loading.set(false);
      });
  }
}
