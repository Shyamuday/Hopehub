import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { BookingService } from '../../core/services/booking.service';
import { NotificationService } from '../../core/services/notification.service';
import { HopeHubRealtimeService } from '../../core/services/realtime.service';
import { User } from '../../core/models/auth.model';
import { ConsultationCallPanelComponent } from '../../shared/components/consultation-call/consultation-call-panel.component';
import type {
  CallSignalingSocket,
  IceServerConfig,
} from '../../shared/components/consultation-call/webrtc-call.types';

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
  } | null;
  pricingSnapshot?: {
    serviceName?: string | null;
    requestedProviderName?: string | null;
    careTeamPricingLabel?: string | null;
    sessionDurationMinutes?: number | null;
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

  private consultationId = '';
  private readonly handleIncomingMessage = (raw: unknown) => {
    const message = raw as Partial<LiveSessionMessage>;
    if (!message?.id || message.consultationId !== this.consultationId) return;
    this.mergeMessage(message as LiveSessionMessage);
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
    return status.replaceAll('_', ' ') || 'Session';
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

  backToDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  private connectRealtime(): void {
    const socket = this.realtimeService.connect();
    if (!socket) return;
    socket.off?.('message:new', this.handleIncomingMessage);
    socket.on('message:new', this.handleIncomingMessage);
    this.socket.set(socket);
  }

  private loadIceServers(): void {
    this.bookingService.iceServers().subscribe({
      next: (res) =>
        this.iceServers.set(res.iceServers?.length ? res.iceServers : this.iceServers()),
      error: () => undefined,
    });
  }

  private loadSession(id: string): void {
    this.loading.set(true);
    this.error.set('');
    this.bookingService.consultation(id).subscribe({
      next: (res) => {
        this.consultation.set(res.consultation);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(this.readErrorMessage(error));
        this.loading.set(false);
      },
    });
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
