import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClinicManagerApiService } from '../../services/clinic-manager-api.service';

@Component({
  selector: 'app-roster',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './roster.component.html',
  styleUrl: './roster.component.scss'
})
export class RosterComponent implements OnInit {
  private api = inject(ClinicManagerApiService);

  loading = signal(true);
  error = signal('');
  roster = signal<any>(null);
  date = new Date().toISOString().slice(0, 10);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.getRoster(this.date)
      .then((res) => {
        this.roster.set(res);
        this.loading.set(false);
      })
      .catch(() => {
        this.error.set('Could not load roster.');
        this.loading.set(false);
      });
  }

  attendanceLabel(code: string): string {
    switch (code) {
      case 'ON_LEAVE': return 'On leave';
      case 'WEEKLY_OFF': return 'Weekly off';
      default: return 'Expected';
    }
  }
}
