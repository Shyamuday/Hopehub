import { Component, inject, signal, OnInit } from '@angular/core';
import { ClinicManagerApiService } from '../../services/clinic-manager-api.service';

@Component({
  selector: 'app-hub-dashboard',
  standalone: true,
  templateUrl: './hub-dashboard.component.html',
  styleUrl: './hub-dashboard.component.scss'
})
export class HubDashboardComponent implements OnInit {
  private api = inject(ClinicManagerApiService);

  loading = signal(true);
  error = signal('');
  data = signal<any>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getDashboard()
      .then((res) => {
        this.data.set(res);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load branch dashboard. Check your connection and try again.');
        this.loading.set(false);
      });
  }

  formatPaise(paise: number): string {
    return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
}
