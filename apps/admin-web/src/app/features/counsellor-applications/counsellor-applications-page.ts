import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../core/services/admin-api';

type StatusFilter = 'ALL' | 'NEW' | 'REVIEWING' | 'SHORTLISTED' | 'REJECTED' | 'ONBOARDED';

@Component({
  selector: 'app-counsellor-applications-page',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './counsellor-applications-page.html',
  styleUrl: './counsellor-applications-page.scss',
})
export class CounsellorApplicationsPage implements OnInit {
  private readonly api = inject(AdminApi);

  readonly applications = signal<any[]>([]);
  readonly summary = signal({ NEW: 0, REVIEWING: 0, SHORTLISTED: 0, REJECTED: 0, ONBOARDED: 0 });
  readonly loading = signal(true);
  readonly savingId = signal('');
  readonly error = signal('');
  readonly statusFilter = signal<StatusFilter>('ALL');
  readonly expandedId = signal<string | null>(null);
  readonly notes = signal<Record<string, string>>({});
  readonly statuses: StatusFilter[] = [
    'ALL',
    'NEW',
    'REVIEWING',
    'SHORTLISTED',
    'REJECTED',
    'ONBOARDED',
  ];

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.api.listCounsellorApplications(
        this.statusFilter() !== 'ALL' ? { status: this.statusFilter() } : undefined,
      );
      this.applications.set(res.applications);
      this.summary.set(res.summary);
      this.notes.set(
        Object.fromEntries(
          res.applications.map((application) => [application.id, application.adminNote || '']),
        ),
      );
    } catch {
      this.error.set('Could not load counsellor applications.');
    } finally {
      this.loading.set(false);
    }
  }

  setFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
    void this.load();
  }

  toggle(applicationId: string): void {
    this.expandedId.update((current) => (current === applicationId ? null : applicationId));
  }

  setNote(applicationId: string, note: string): void {
    this.notes.update((current) => ({ ...current, [applicationId]: note }));
  }

  async updateStatus(application: any, status: Exclude<StatusFilter, 'ALL'>): Promise<void> {
    this.savingId.set(application.id);
    this.error.set('');
    try {
      await this.api.updateCounsellorApplicationStatus(application.id, {
        status,
        adminNote: this.notes()[application.id] || '',
      });
      await this.load();
    } catch {
      this.error.set('Could not update application status.');
    } finally {
      this.savingId.set('');
    }
  }

  statusClass(status: string): string {
    return `status status-${status.toLowerCase()}`;
  }
}
