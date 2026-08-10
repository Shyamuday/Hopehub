import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AdminApi } from '../../../core/services/admin-api';
import { AdminWorkspaceService } from '../../../core/services/admin-workspace.service';

@Component({
  selector: 'app-online-doctors-page',
  imports: [CommonModule],
  templateUrl: './online-doctors-page.html',
  styleUrl: './online-doctors-page.scss',
})
export class OnlineDoctorsPage {
  private readonly workspace = inject(AdminWorkspaceService);

  readonly workspaceKey = this.workspace.selectedWorkspace;
  readonly providerTitleLabel = this.workspace.providerTitleLabel;
  readonly providerPluralLabel = this.workspace.providerPluralLabel;
  readonly consumerTitleLabel = this.workspace.consumerTitleLabel;
  readonly sessionSingularLabel = this.workspace.sessionSingularLabel;
  readonly sessionPluralLabel = this.workspace.sessionPluralLabel;
  readonly stats = signal<Record<string, number> | null>(null);
  readonly liveDoctors = signal<any[]>([]);
  readonly sessions = signal<any[]>([]);
  readonly instantQueue = signal<any[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  supportFocusLabel(): string {
    return this.workspaceKey() === 'hope-hub' ? 'Support focus' : 'Disease';
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [statsRes, listRes] = await Promise.all([
        this.api.getOnlineDoctorStats(),
        this.api.listOnlineDoctors(),
      ]);
      this.stats.set(statsRes.stats);
      this.liveDoctors.set(listRes.liveDoctors);
      this.sessions.set(listRes.sessions);
      this.instantQueue.set(listRes.instantQueue);
    } catch {
      this.error.set('Could not load live provider data.');
    } finally {
      this.loading.set(false);
    }
  }
}
