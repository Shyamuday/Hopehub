import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { AdminApi } from '../../core/services/admin-api';

type CallHealthRow = { key: string; count: number };

type CallHealthReport = {
  windowDays: number;
  from: string;
  summary: {
    total: number;
    answered: number;
    failed: number;
    rejected: number;
    noAnswer: number;
    mediaPermission: number;
    connectionFailed: number;
    reconnectTimeout: number;
    turnRelay: number;
    direct: number;
    unknownRoute: number;
    answerRate: number;
    failureRate: number;
    turnRelayRate: number;
    averageDurationSeconds: number;
  };
  byReason: CallHealthRow[];
  byMode: CallHealthRow[];
  byProvider: Array<{
    providerId: string;
    providerName: string;
    total: number;
    answered: number;
    failed: number;
    turnRelay: number;
  }>;
  recent: Array<{
    id: string;
    consultationId: string;
    mode: string;
    status: string;
    endReason?: string | null;
    durationSeconds?: number | null;
    startedAt: string;
    answeredAt?: string | null;
    endedAt?: string | null;
    lastSignalEvent?: string | null;
    usedTurnRelay: boolean;
    candidateTypes: unknown[];
    averageRttMs?: number | null;
    consultation: {
      status: string;
      patient?: {
        name?: string | null;
        mobile?: string | null;
        patientCode?: string | null;
      } | null;
      assignedDoctor?: { name?: string | null; email?: string | null } | null;
      disease?: { name?: string | null } | null;
    };
  }>;
};

@Component({
  selector: 'app-call-health-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './call-health-page.html',
  styleUrl: './call-health-page.scss',
})
export class CallHealthPage {
  readonly windowOptions = [
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 90 days' },
  ];
  readonly windowDays = signal(30);
  readonly report = signal<CallHealthReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const report = (await this.api.getCallHealth({
        days: this.windowDays(),
      })) as CallHealthReport;
      this.report.set(report);
    } catch {
      this.error.set('Could not load call health right now.');
      this.report.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  setWindowDays(value: string | number) {
    this.windowDays.set(Number(value) || 30);
    void this.load();
  }

  label(value: string | null | undefined): string {
    if (!value) return 'Unknown';
    return value
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  duration(seconds?: number | null): string {
    if (!seconds || seconds < 1) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins ? `${mins}m ${secs}s` : `${secs}s`;
  }

  dateTime(value?: string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  routeLabel(row: { usedTurnRelay: boolean; candidateTypes: unknown[] }): string {
    if (row.usedTurnRelay) return 'TURN relay';
    if (row.candidateTypes?.length) return 'Direct/STUN';
    return 'Unknown';
  }
}
