import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { io, type Socket } from 'socket.io-client';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { AuthService } from './auth/auth.service';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import { API_PATHS } from './core/constants/api-paths.constants';
import { SOCKET_EVENTS } from './core/constants/socket.constants';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import { environment } from '../environments/environment';
import type { Disease } from './models';

type OnlineProvider = {
  userId: string;
  name: string;
  profileImageUrl?: string | null;
  specialty: string;
  specialization?: string | null;
  providerType?: string;
  providerTypeLabel?: string;
  providerCategory?: string;
  doctorTypeLabel: string;
  category: 'GENERALIST' | 'SPECIALIST';
  specialtyDiseaseIds: string[];
  liveStatus: string;
  acceptsChat: boolean;
  acceptsVoiceCall: boolean;
  bio?: string | null;
  yearsOfExperience?: number | null;
};

@Component({
  selector: 'app-talk-to-doctor',
  imports: [AppHeaderComponent, AppFooterComponent, RouterLink, FormField],
  templateUrl: './talk-to-doctor.component.html',
  styleUrl: './talk-to-doctor.component.scss',
})
export class TalkToDoctorComponent implements OnInit, OnDestroy {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly client = inject(ClinicApiClient);

  readonly whatsappLink = this.whatsappSvc.url;
  readonly user = this.auth.user;
  readonly providers = signal<OnlineProvider[]>([]);
  readonly doctors = this.providers;
  readonly diseases = signal<Disease[]>([]);
  readonly loading = signal(true);
  readonly booking = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly selectedProvider = signal<OnlineProvider | null>(null);
  readonly selectedDoctor = this.selectedProvider;

  readonly formModel = signal({ diseaseId: '', concern: '' });
  readonly form = form(this.formModel);

  private socket: Socket | null = null;

  ngOnInit() {
    void this.load();
    this.socket = io(environment.apiUrl, { transports: ['websocket', 'polling'] });
    this.socket.emit(SOCKET_EVENTS.SUBSCRIBE_ONLINE_DOCTORS);
    this.socket.on(SOCKET_EVENTS.DOCTOR_PRESENCE, (provider: OnlineProvider) => {
      this.providers.update((list) => {
        const idx = list.findIndex((d) => d.userId === provider.userId);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = provider;
          return next;
        }
        return [...list, provider];
      });
    });
    this.socket.on(SOCKET_EVENTS.DOCTOR_OFFLINE, (payload: { userId: string }) => {
      this.providers.update((list) => list.filter((d) => d.userId !== payload.userId));
    });
  }

  ngOnDestroy() {
    this.socket?.disconnect();
  }

  private async load() {
    try {
      const [docRes, diseaseRes] = await Promise.all([
        this.client.get<{ doctors?: OnlineProvider[]; providers?: OnlineProvider[] }>(
          API_PATHS.ONLINE_PROVIDERS,
        ),
        this.client.get<{ diseases: Disease[] }>(`${API_PATHS.DISEASES}?grouped=false`),
      ]);
      this.providers.set(docRes.providers ?? docRes.doctors ?? []);
      this.diseases.set(diseaseRes.diseases ?? []);
    } catch {
      this.error.set('Could not load online providers.');
    } finally {
      this.loading.set(false);
    }
  }

  selectProvider(provider: OnlineProvider | null) {
    this.selectedProvider.set(provider);
  }

  selectDoctor(provider: OnlineProvider | null) {
    this.selectProvider(provider);
  }

  providerSpecialty(provider: OnlineProvider) {
    return (
      provider.specialization || provider.specialty || provider.providerTypeLabel || 'Provider'
    );
  }

  categoryLabel(provider: OnlineProvider) {
    return provider.category === 'SPECIALIST' ? 'Specialist' : 'General provider';
  }

  async startConsult() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/talk-to-provider' } });
      return;
    }
    const { diseaseId, concern } = this.formModel();
    if (!diseaseId || !concern.trim()) {
      this.error.set('Select a concern and describe your symptoms.');
      return;
    }

    this.booking.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const disease = this.diseases().find((d) => d.id === diseaseId);
      const res = await this.client.apiFetch<{ consultation: { id: string } }>(
        API_PATHS.CONSULTATIONS,
        {
          method: 'POST',
          body: JSON.stringify({
            diseaseId,
            consultationMode: 'INSTANT_ONLINE',
            clinicStoreId: null,
            preferredDoctorUserId: this.selectedProvider()?.userId ?? null,
            intakeAnswers: {
              'Main concern': concern.trim(),
              'Consultation type': 'Instant online provider',
            },
            purchaseType: 'ONE_TIME',
          }),
        },
      );
      this.message.set('Consultation created. Complete payment to connect.');
      await this.router.navigate([`/patient/instant-consult/${res.consultation.id}`]);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not start consultation.');
    } finally {
      this.booking.set(false);
    }
  }
}
