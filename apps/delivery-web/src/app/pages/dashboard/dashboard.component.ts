import { Component, inject, signal, OnInit } from '@angular/core';
import { DeliveryApiService } from '../../services/delivery-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private api = inject(DeliveryApiService);

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
        this.error.set('Could not load delivery dashboard.');
        this.loading.set(false);
      });
  }
}
