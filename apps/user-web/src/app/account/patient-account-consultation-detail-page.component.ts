import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { CallMode, IceServerConfig, MediaAccessResult } from '@vitalis/platform-ui';
import { ConsultationDetailComponent, SendMessagePayload } from '../consultation-detail.component';
import { ClinicApiService } from '../clinic-api.service';
import { NativePermissionsService } from '../core/services/native-permissions.service';
import { Consultation } from '../models';
import type { RealtimeSubscription } from '../clinic-api/clinic-api.types';

@Component({
  selector: 'app-patient-account-consultation-detail-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ConsultationDetailComponent],
  templateUrl: './patient-account-consultation-detail-page.component.html',
  styleUrl: './patient-account-consultation-detail-page.component.scss',
})
export class PatientAccountConsultationDetailPageComponent implements OnInit, OnDestroy {
  private readonly api = inject(ClinicApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly nativePermissions = inject(NativePermissionsService);
  private realtimeChannel?: RealtimeSubscription;

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
      },
    });
  }

  onMessageSent(payload: SendMessagePayload) {
    this.processing.set(true);
    this.api.sendMessage(payload.consultation.id, payload.body).subscribe({
      next: () => this.load(payload.consultation.id),
      error: (error) => {
        this.processing.set(false);
        this.notice.set(error.error?.message || error.message || 'Could not send message.');
      },
      complete: () => this.processing.set(false),
    });
  }

  private loadIceServers() {
    this.api.fetchIceServers().subscribe({
      next: ({ iceServers }) => this.iceServers.set(iceServers),
      error: () => undefined
    });
  }

  ngOnDestroy() {
    this.realtimeChannel?.unsubscribe();
  }
}
