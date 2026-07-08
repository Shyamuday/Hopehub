import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Input, OnChanges, OnDestroy, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { ConsultationCallPanelComponent, type IceServerConfig } from '@vitalis/platform-ui';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import { ConsultationApiService } from '../../core/services/consultation-api.service';
import { DoctorRealtimeService } from '../../core/services/doctor-realtime.service';
import type { ConsultationMessage } from '../../core/types/consultation.types';

@Component({
  selector: 'app-consultation-chat-panel',
  imports: [FormField, DatePipe, ConsultationCallPanelComponent],
  templateUrl: './consultation-chat-panel.html',
  styleUrl: './consultation-chat-panel.scss'
})
export class ConsultationChatPanelComponent implements OnChanges, OnDestroy {
  private readonly consultationApi = inject(ConsultationApiService);
  private readonly realtime = inject(DoctorRealtimeService);
  private readonly http = inject(HttpClient);

  @Input({ required: true }) consultationId = '';

  readonly messages = signal<ConsultationMessage[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal('');
  readonly patientUserId = signal('');
  readonly iceServers = signal<IceServerConfig[]>([{ urls: 'stun:stun.l.google.com:19302' }]);
  readonly draftModel = signal({ body: '' });
  readonly draftForm = form(this.draftModel);

  ngOnChanges() {
    if (this.consultationId) {
      this.realtime.subscribeConsultation(this.consultationId);
      void this.load();
    } else {
      this.messages.set([]);
      this.patientUserId.set('');
    }
  }

  ngOnDestroy() {
    // socket owned by shell — do not disconnect here
  }

  constructor() {
    this.realtime.connect(() => undefined, () => {
      if (this.consultationId) void this.load();
    });
    void this.loadIceServers();
  }

  callEnabled() {
    return !!this.patientUserId() && !!this.consultationId;
  }

  consultationSocket() {
    return this.realtime.getSocket();
  }

  private async loadIceServers() {
    try {
      const res = await firstValueFrom(
        this.http.get<{ iceServers: IceServerConfig[] }>(`${environment.apiUrl}${API_PATHS.RTC_ICE_SERVERS}`)
      );
      this.iceServers.set(res.iceServers);
    } catch {
      // keep default STUN
    }
  }

  async load() {
    if (!this.consultationId) return;

    this.loading.set(true);
    this.error.set('');
    try {
      const consultation = await this.consultationApi.loadConsultation(this.consultationId);
      this.messages.set(consultation.messages || []);
      this.patientUserId.set(consultation.patient?.id ?? '');
    } catch {
      this.error.set('Could not load messages.');
      this.messages.set([]);
      this.patientUserId.set('');
    } finally {
      this.loading.set(false);
    }
  }

  async send() {
    const body = this.draftModel().body.trim();
    if (!this.consultationId || !body) return;

    this.sending.set(true);
    this.error.set('');
    try {
      const message = await this.consultationApi.sendMessage(this.consultationId, body);
      this.messages.set([...this.messages(), message]);
      this.draftModel.set({ body: '' });
    } catch {
      this.error.set('Could not send message.');
    } finally {
      this.sending.set(false);
    }
  }
}
