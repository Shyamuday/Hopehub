import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { AdminApi } from '../../../core/services/admin-api';

@Component({
  selector: 'app-online-doctors-page',
  imports: [CommonModule],
  templateUrl: './online-doctors-page.html',
  styleUrl: './online-doctors-page.scss'
})
export class OnlineDoctorsPage {
  readonly stats = signal<Record<string, number> | null>(null);
  readonly liveDoctors = signal<any[]>([]);
  readonly sessions = signal<any[]>([]);
  readonly instantQueue = signal<any[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [statsRes, listRes] = await Promise.all([
        this.api.getOnlineDoctorStats(),
        this.api.listOnlineDoctors()
      ]);
      this.stats.set(statsRes.stats);
      this.liveDoctors.set(listRes.liveDoctors);
      this.sessions.set(listRes.sessions);
      this.instantQueue.set(listRes.instantQueue);
    } catch {
      this.error.set('Could not load online doctor data.');
    } finally {
      this.loading.set(false);
    }
  }
}
