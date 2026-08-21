import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { AdminApi } from '../../core/services/admin-api';

type CallHealthRow = { key: string; count: number };

type CallHealthTimeline = {
  session: {
    id: string;
    consultationId: string;
    callId?: string | null;
    mode: string;
    status: string;
    endReason?: string | null;
    startedAt: string;
    answeredAt?: string | null;
    endedAt?: string | null;
    durationSeconds?: number | null;
    reconnectCount: number;
    usedTurnRelay?: boolean | null;
    averageRttMs?: number | null;
    packetLossPercent?: number | null;
    maxJitterMs?: number | null;
    consultation: {
      patient?: { name?: string | null; patientCode?: string | null } | null;
      assignedDoctor?: { name?: string | null } | null;
    };
  };
  events: Array<{
    id: string;
    event: string;
    phase: string;
    outcome: string;
    reason?: string | null;
    sequence?: number | null;
    clientOccurredAt?: string | null;
    serverReceivedAt: string;
    actor?: { id: string; name?: string | null; role?: string | null } | null;
    target?: { id: string; name?: string | null; role?: string | null } | null;
    metadata?: Record<string, unknown> | null;
  }>;
};

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
    callId?: string | null;
    reconnectCount: number;
    usedTurnRelay: boolean;
    candidateTypes: unknown[];
    averageRttMs?: number | null;
    packetLossPercent?: number | null;
    maxJitterMs?: number | null;
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
  readonly timeline = signal<CallHealthTimeline | null>(null);
  readonly timelineLoadingId = signal('');
  readonly timelineError = signal('');

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

  async inspectCall(sessionId: string) {
    if (this.timeline()?.session.id === sessionId) {
      this.timeline.set(null);
      return;
    }
    this.timelineLoadingId.set(sessionId);
    this.timelineError.set('');
    try {
      this.timeline.set((await this.api.getCallHealthEvents(sessionId)) as CallHealthTimeline);
    } catch {
      this.timeline.set(null);
      this.timelineError.set('Could not load this call timeline.');
    } finally {
      this.timelineLoadingId.set('');
    }
  }

  closeTimeline() {
    this.timeline.set(null);
    this.timelineError.set('');
  }

  eventTitle(event: string): string {
    return this.label(event.replace(/^call:/, ''));
  }

  metadataSummary(metadata?: Record<string, unknown> | null): string[] {
    if (!metadata) return [];
    const labels: Record<string, string> = {
      networkType: 'Network',
      networkEffectiveType: 'Speed',
      connectionState: 'Peer',
      iceConnectionState: 'ICE',
      localCandidateType: 'Local route',
      remoteCandidateType: 'Remote route',
      transportProtocol: 'Transport',
      usedTurnRelay: 'TURN',
      relayRequiredByNetwork: 'Relay needed',
      averageRttMs: 'RTT',
      packetLossPercent: 'Packet loss',
      maxJitterMs: 'Jitter',
      errorName: 'Browser error',
      attempt: 'Attempt',
      connectivityPreflightSource: 'Preflight',
      connectivityCheckMs: 'Network check',
      mediaAcquisitionMs: 'Media access',
      preparedStreamReused: 'Prepared media reused',
    };
    return Object.entries(labels).flatMap(([key, display]) => {
      const value = metadata[key];
      if (value === undefined || value === null || value === '') return [];
      const suffix =
        key === 'averageRttMs' ||
        key === 'maxJitterMs' ||
        key === 'connectivityCheckMs' ||
        key === 'mediaAcquisitionMs'
          ? ' ms'
          : key === 'packetLossPercent'
            ? '%'
            : '';
      return [`${display}: ${String(value)}${suffix}`];
    });
  }
}
