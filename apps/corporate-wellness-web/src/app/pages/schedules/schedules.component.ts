import { Component, inject, signal, OnInit } from '@angular/core';
import { ClinicManagerApiService } from '../../services/clinic-manager-api.service';

@Component({
  selector: 'app-schedules',
  standalone: true,
  templateUrl: './schedules.component.html',
  styleUrl: './schedules.component.scss'
})
export class SchedulesComponent implements OnInit {
  private api = inject(ClinicManagerApiService);

  loading = signal(true);
  error = signal('');
  schedules = signal<any>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getSchedules()
      .then((res) => {
        this.schedules.set(res);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load doctor schedules.');
        this.loading.set(false);
      });
  }
}
