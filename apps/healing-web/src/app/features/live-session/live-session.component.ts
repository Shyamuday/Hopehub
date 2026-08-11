import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import type { ConsultationCallSession } from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';
import { HopeHubRealtimeService } from '../../core/services/realtime.service';
import { User } from '../../core/models/auth.model';
import type { CallSignalingSocket, IceServerConfig } from '@hopehub/platform-ui';
import { ConsultationCallPanelComponent } from '@hopehub/platform-ui';

type LiveSessionMessage = {
  id: string;
  consultationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: { id: string; name?: string | null } | null;
};

type LiveSessionConsultation = {
  id: string;
  status: string;
  createdAt: string;
  assignedDoctor?: { id: string; name?: string | null } | null;
  disease?: { name?: string | null } | null;
  intakeAnswers?: {
    sessionMode?: string;
    quickTalkMode?: string;
    concernCategory?: string;
    preferredLanguage?: string;
    serviceName?: string;
    requestedProviderName?: string;
    careTeamPricingLabel?: string;
    preferredExpertType?: string;
  } | null;
  pricingSnapshot?: {
    serviceName?: string | null;
    requestedProviderName?: string | null;
    careTeamPricingLabel?: string | null;
    sessionDurationMinutes?: number | null;
    sessionOutcome?: {
      outcome?: string | null;
      closedAt?: string | null;
      userSummary?: string | null;
      recommendedNextStep?: string | null;
    } | null;
  } | null;
  payment?: {
    status?: string | null;
    amountInPaise?: number | null;
  } | null;
  messages?: LiveSessionMessage[];
};

@Component({
  selector: 'app-live-session',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, ConsultationCallPanelComponent],
  templateUrl: './live-session.component.html',
  styleUrl: './live-session.component.scss',
})
export class LiveSessionComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly bookingService = inject(BookingService);
  private readonly notificationService = inject(NotificationService);
  private readonly realtimeService = inject(HopeHubRealtimeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = signal<User | null>(null);
  readonly consultation = signal<LiveSessionConsultation | null>(null);
  readonly loading = signal(true);
  readonly sending = signal(false);
  readonly error = signal('');
  readonly draft = signal('');
  readonly socket = signal<CallSignalingSocket | null>(null);
  readonly iceServers = signal<IceServerConfig[]>([{ urls: 'stun:stun.l.google.com:19302' }]);
  readonly callSessions = signal<ConsultationCallSession[]>([]);
  readonly callSessionsLoading = signal(false);
  readonly refreshing = signal(false);
  readonly lastRefreshedAt = signal<Date | null>(null);

  private consultationId = '';
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private readonly handleIncomingMessage = (raw: unknown) => {
    const message = raw as Partial<LiveSessionMessage>;
    if (!message?.id || message.consultationId !== this.consultationId) return;
    this.mergeMessage(message as LiveSessionMessage);
  };
  private readonly handleConsultationUpdated = (raw: unknown) => {
    const payload = raw as { consultationId?: string };
    if (payload?.consultationId !== this.consultationId) return;
    this.loadSession(this.consultationId, { silent: true });
  };

  ngOnInit(): void {
    this.authService.user$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((user) => {
      this.user.set(user);
    });
    this.loadIceServers();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('consultationId') || '';
      if (!id) {
        this.error.set('Live session not found.');
        this.loading.set(false);
        return;
      }
      this.consultationId = id;
      this.connectRealtime();
      this.realtimeService.subscribeConsultation(id);
      this.loadSession(id);
    });
  }

  ngOnDestroy(): void {
    this.socket()?.off?.('message:new', this.handleIncomingMessage);
    this.socket()?.off?.('consultation:updated', this.handleConsultationUpdated);
    this.stopAutoRefresh();
    this.realtimeService.disconnect();
  }

  providerName(): string {
    const consultation = this.consultation();
    return (
      consultation?.assignedDoctor?.name ||
      consultation?.pricingSnapshot?.requestedProviderName ||
      consultation?.intakeAnswers?.requestedProviderName ||
      'Assigned expert'
    );
  }

  serviceName(): string {
    const consultation = this.consultation();
    return (
      consultation?.pricingSnapshot?.serviceName ||
      consultation?.intakeAnswers?.serviceName ||
      consultation?.disease?.name ||
      'Hope Hub live session'
    );
  }

  isListenerSupportSession(): boolean {
    const consultation = this.consultation();
    const text = [
      this.serviceName(),
      this.providerName(),
      consultation?.pricingSnapshot?.careTeamPricingLabel,
      consultation?.intakeAnswers?.careTeamPricingLabel,
      consultation?.intakeAnswers?.preferredExpertType,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return /listener|emotional support|peer support|student support|non-clinical/.test(text);
  }

  sessionModeLabel(): string {
    const mode = this.normalizedMode();
    if (mode === 'video') return 'Video session';
    if (mode === 'voice') return 'Voice session';
    if (mode === 'chat') return 'Chat session';
    return 'Live session';
  }

  normalizedMode(): 'chat' | 'voice' | 'video' | 'session' {
    const consultation = this.consultation();
    const raw = (
      consultation?.intakeAnswers?.quickTalkMode ||
      consultation?.intakeAnswers?.sessionMode ||
      ''
    ).toLowerCase();
    if (raw.includes('video')) return 'video';
    if (raw.includes('voice') || raw.includes('audio')) return 'voice';
    if (raw.includes('chat')) return 'chat';
    return 'session';
  }

  statusLabel(): string {
    const status = (this.consultation()?.status || '').toUpperCase();
    if (status === 'ASSIGNED') return 'Expert assigned';
    if (status === 'IN_PROGRESS') return 'In progress';
    if (status === 'PAYMENT_PENDING') return 'Payment pending';
    if (status === 'PAID') return 'Matching expert';
    if (status === 'COMPLETED') return 'Session completed';
    if (status === 'CANCELLED') return 'Session closed';
    return status.replaceAll('_', ' ') || 'Session';
  }

  isSessionClosed(): boolean {
    const status = (this.consultation()?.status || '').toUpperCase();
    return ['COMPLETED', 'CANCELLED'].includes(status);
  }

  closedTitle(): string {
    const outcome = this.consultation()?.pricingSnapshot?.sessionOutcome?.outcome || '';
    if (outcome === 'USER_MISSED') return 'This session was marked missed';
    if (outcome === 'PROVIDER_NO_SHOW') return 'This session was closed for provider no-show';
    if (outcome === 'RESCHEDULE_NEEDED') return 'This session needs rescheduling';
    return 'This live session has ended';
  }

  closedCopy(): string {
    const snapshot = this.consultation()?.pricingSnapshot?.sessionOutcome;
    if (snapshot?.recommendedNextStep) return snapshot.recommendedNextStep;
    if (snapshot?.userSummary) return snapshot.userSummary;
    return 'You can review the conversation here. New messages and calls are locked after closure.';
  }

  waitingTitle(): string {
    const status = (this.consultation()?.status || '').toUpperCase();
    if (status === 'PAYMENT_PENDING') return 'Payment confirmation is pending';
    if (!this.consultation()?.assignedDoctor?.id) return 'Finding your live expert';
    return 'Preparing your live room';
  }

  waitingCopy(): string {
    const status = (this.consultation()?.status || '').toUpperCase();
    if (status === 'PAYMENT_PENDING') {
      return 'Once payment is verified, we will assign an available expert and unlock this room automatically.';
    }
    if (!this.consultation()?.assignedDoctor?.id) {
      return 'We are matching you with an available Hope Hub expert. This page refreshes automatically.';
    }
    return 'This usually takes a few seconds. Please keep the page open.';
  }

  showWaitingPanel(): boolean {
    return Boolean(this.consultation()) && !this.canInteract() && !this.isSessionClosed();
  }

  refreshStatusLabel(): string {
    if (this.refreshing()) return 'Checking now...';
    const last = this.lastRefreshedAt();
    if (!last) return 'Auto-checking for updates';
    return `Last checked ${last.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  callStatusLabel(status: string): string {
    return status ? status.replaceAll('_', ' ').toLowerCase() : 'unknown';
  }

  callReasonLabel(reason?: string | null): string {
    if (!reason) return '';
    const labels: Record<string, string> = {
      active_call_exists: 'Another call was already active',
      consultation_call_already_active: 'Session already had an active call',
      no_answer: 'No answer',
      media_timeout: 'Media did not connect',
      connection_failed: 'Connection failed',
      reconnect_timeout: 'Disconnected during call',
      rejected: 'Declined',
      not_connected: 'Ended before connecting',
      ended_by_user: 'Ended by participant',
      stale_setup_cleanup: 'Previous call attempt expired',
      stale_connected_cleanup: 'Old active call auto-closed',
    };
    return labels[reason] || reason.replaceAll('_', ' ');
  }

  callNetworkLabel(call: ConsultationCallSession): string {
    const metadata = call.metadata;
    if (!metadata) return '';
    if (metadata.usedTurnRelay === true) return 'TURN relay';
    if (
      ['host', 'srflx', 'prflx'].includes(String(metadata.localCandidateType || '')) ||
      ['host', 'srflx', 'prflx'].includes(String(metadata.remoteCandidateType || ''))
    ) {
      return 'Direct/P2P';
    }
    return '';
  }

  callDurationLabel(call: ConsultationCallSession): string {
    const seconds = Math.max(0, Number(call.durationSeconds || 0));
    if (!seconds) return call.endedAt ? '0s' : 'In progress';
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
  }

  canInteract(): boolean {
    const consultation = this.consultation();
    const status = (consultation?.status || '').toUpperCase();
    return Boolean(
      consultation?.assignedDoctor?.id &&
      ['ASSIGNED', 'IN_PROGRESS', 'PRESCRIPTION_UPLOADED'].includes(status),
    );
  }

  showCallPanel(): boolean {
    const mode = this.normalizedMode();
    return this.canInteract() && mode !== 'chat';
  }

  allowAudioCall(): boolean {
    const mode = this.normalizedMode();
    return mode === 'voice' || mode === 'video' || mode === 'session';
  }

  allowVideoCall(): boolean {
    const mode = this.normalizedMode();
    return mode === 'video' || mode === 'session';
  }

  isOwnMessage(message: LiveSessionMessage): boolean {
    return message.senderId === this.user()?.id || message.sender?.id === this.user()?.id;
  }

  sendMessage(): void {
    const body = this.draft().trim();
    if (!this.consultationId || !body || this.sending()) return;
    this.sending.set(true);
    this.bookingService.sendConsultationMessage(this.consultationId, body).subscribe({
      next: (res) => {
        this.mergeMessage(res.message as LiveSessionMessage);
        this.draft.set('');
        this.sending.set(false);
      },
      error: () => {
        this.notificationService.error('Could not send message right now.');
        this.sending.set(false);
      },
    });
  }

  refresh(): void {
    if (this.consultationId) this.loadSession(this.consultationId);
  }

  loadCallSessions(): void {
    if (!this.consultationId) return;
    this.callSessionsLoading.set(true);
    this.bookingService.consultationCallSessions(this.consultationId).subscribe({
      next: (res) => {
        this.callSessions.set(res.callSessions || []);
        this.callSessionsLoading.set(false);
      },
      error: () => {
        this.callSessions.set([]);
        this.callSessionsLoading.set(false);
      },
    });
  }

  backToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  openSafetyHelp(): void {
    this.notificationService.warning(
      'If there is immediate danger, call local emergency services now. Hope Hub chat is not an emergency service.',
    );
  }

  reportSafetyConcern(): void {
    const message =
      '[SAFETY] I need urgent support or want this session reviewed by the Hope Hub care/admin team.';
    this.draft.set(message);
    this.notificationService.info(
      'Safety message prepared. Press Send to notify your expert in this room.',
    );
  }

  private connectRealtime(): void {
    const socket = this.realtimeService.connect();
    if (!socket) return;
    socket.off?.('message:new', this.handleIncomingMessage);
    socket.off?.('consultation:updated', this.handleConsultationUpdated);
    socket.on('message:new', this.handleIncomingMessage);
    socket.on('consultation:updated', this.handleConsultationUpdated);
    this.socket.set(socket);
  }

  private loadIceServers(): void {
    this.bookingService.iceServers().subscribe({
      next: (res) =>
        this.iceServers.set(res.iceServers?.length ? res.iceServers : this.iceServers()),
      error: () => undefined,
    });
  }

  private loadSession(id: string, options: { silent?: boolean } = {}): void {
    if (options.silent) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set('');
    this.bookingService.consultation(id).subscribe({
      next: (res) => {
        this.consultation.set(res.consultation);
        this.loadCallSessions();
        this.lastRefreshedAt.set(new Date());
        this.configureAutoRefresh();
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: (error) => {
        this.error.set(this.readErrorMessage(error));
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  private configureAutoRefresh(): void {
    if (this.showWaitingPanel()) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  private startAutoRefresh(): void {
    if (this.autoRefreshTimer || !this.consultationId) return;
    this.autoRefreshTimer = setInterval(() => {
      if (!this.consultationId || !this.showWaitingPanel()) {
        this.stopAutoRefresh();
        return;
      }
      this.loadSession(this.consultationId, { silent: true });
    }, 5000);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshTimer) clearInterval(this.autoRefreshTimer);
    this.autoRefreshTimer = null;
  }

  private mergeMessage(message: LiveSessionMessage): void {
    this.consultation.update((consultation) => {
      if (!consultation || consultation.id !== message.consultationId) return consultation;
      const messages = consultation.messages || [];
      const withoutDuplicate = messages.filter((item) => item.id !== message.id);
      return {
        ...consultation,
        messages: [...withoutDuplicate, message].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      };
    });
  }

  private readErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const inner = (error as { error?: { message?: string } }).error;
      if (inner?.message) return inner.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return 'Could not open this live session.';
  }
}
