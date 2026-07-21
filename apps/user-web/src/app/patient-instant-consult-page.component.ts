import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { CallMode, IceServerConfig, MediaAccessResult } from '@hopehub/platform-ui';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { ConsultationDetailComponent, SendMessagePayload } from './consultation-detail.component';
import { ClinicApiService } from './clinic-api.service';
import { DashboardPaymentService } from './dashboard-data.service';
import { AuthService } from './auth/auth.service';
import { NativePermissionsService } from './core/services/native-permissions.service';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import { Consultation } from './models';
import type { RealtimeSubscription } from './clinic-api/clinic-api.types';

@Component({
  selector: 'app-patient-instant-consult-page',
  standalone: true,
  imports: [CommonModule, RouterLink, AppHeaderComponent, AppFooterComponent, ConsultationDetailComponent],
  templateUrl: './patient-instant-consult-page.component.html',
  styleUrl: './patient-instant-consult-page.component.scss'
})
export class PatientInstantConsultPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ClinicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly paymentService = inject(DashboardPaymentService);
  private readonly nativePermissions = inject(NativePermissionsService);
  private readonly auth = inject(AuthService);
  private readonly whatsappSvc = inject(WhatsappLinkService);

  private realtimeChannel?: RealtimeSubscription;

  readonly whatsappLink = this.whatsappSvc.url;
  readonly user = this.auth.user;
  readonly loading = signal(true);
  readonly processing = signal(false);
  readonly consultation = signal<Consultation | null>(null);
  readonly notice = signal('');
  readonly iceServers = signal<IceServerConfig[]>([{ urls: 'stun:stun.l.google.com:19302' }]);

  readonly ensureMediaAccess = (mode: CallMode): Promise<MediaAccessResult> =>
    mode === 'video'
      ? this.nativePermissions.ensureVideoCallPermissions()
      : this.nativePermissions.ensureVoiceCallPermissions();

  get consultationSocket() {
    return this.realtimeChannel?.socket ?? null;
  }

  ngOnInit() {
    this.realtimeChannel = this.api.watchClinicChanges(() => {
      const active = this.consultation();
      if (active) this.load(active.id);
    });
    void this.loadIceServers();

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.consultation.set(null);
        this.loading.set(false);
        return;
      }
      this.load(id);
    });
  }

  ngOnDestroy() {
    this.realtimeChannel?.unsubscribe();
  }

  roomPhase(): 'payment' | 'waiting' | 'active' | 'done' | 'unknown' {
    const c = this.consultation();
    if (!c) return 'unknown';
    if (c.status === 'PAYMENT_PENDING') return 'payment';
    if (['PAID'].includes(c.status) && !c.assignedDoctor) return 'waiting';
    if (['ASSIGNED', 'IN_PROGRESS', 'PRESCRIPTION_UPLOADED'].includes(c.status)) return 'active';
    if (['COMPLETED', 'CANCELLED'].includes(c.status)) return 'done';
    return 'waiting';
  }

  phaseLabel() {
    const map: Record<string, string> = {
      payment: 'Complete payment to connect with a doctor',
      waiting: 'Finding an online doctor for you…',
      active: 'You are connected — chat or start a call below',
      done: 'This consultation has ended',
      unknown: 'Loading…'
    };
    return map[this.roomPhase()] ?? '';
  }

  payNow() {
    const c = this.consultation();
    if (!c) return;
    this.processing.set(true);
    this.paymentService.pay(
      c,
      () => {
        this.notice.set('Payment successful. Matching you with a doctor…');
        this.load(c.id);
      },
      (message) => this.notice.set(message),
      (busy) => this.processing.set(busy)
    );
  }

  onMessageSent(payload: SendMessagePayload) {
    this.processing.set(true);
    this.api.sendMessage(payload.consultation.id, payload.body).subscribe({
      next: () => this.load(payload.consultation.id),
      error: (error) => {
        this.processing.set(false);
        this.notice.set(error.error?.message || error.message || 'Could not send message.');
      },
      complete: () => this.processing.set(false)
    });
  }

  private load(id: string) {
    this.loading.set(true);
    this.api.consultations().subscribe({
      next: ({ consultations }) => {
        const found = consultations.find((c) => c.id === id) ?? null;
        this.consultation.set(found);
        if (found && this.realtimeChannel?.socket) {
          this.api.subscribeToConsultation(this.realtimeChannel.socket, found.id);
        }
        this.loading.set(false);
      },
      error: () => {
        this.notice.set('Could not load consultation.');
        this.loading.set(false);
      }
    });
  }

  private loadIceServers() {
    this.api.fetchIceServers().subscribe({
      next: ({ iceServers }) => this.iceServers.set(iceServers),
      error: () => undefined
    });
  }
}
