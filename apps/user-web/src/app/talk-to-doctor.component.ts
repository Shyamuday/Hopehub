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

type OnlineDoctor = {
  userId: string;
  name: string;
  profileImageUrl?: string | null;
  providerDomain: 'HOMEOPATHY' | 'HOPE_HUB';
  credentialVerified?: boolean;
  specialty: string;
  doctorTypeLabel: string;
  category: 'GENERALIST' | 'SPECIALIST';
  specialtyDiseaseIds: string[];
  liveStatus: string;
  acceptsChat: boolean;
  acceptsVoiceCall: boolean;
  acceptsVideoCall: boolean;
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
  readonly doctors = signal<OnlineDoctor[]>([]);
  readonly diseases = signal<Disease[]>([]);
  readonly loading = signal(true);
  readonly booking = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly selectedDoctor = signal<OnlineDoctor | null>(null);

  readonly formModel = signal({ diseaseId: '', concern: '' });
  readonly form = form(this.formModel);

  private socket: Socket | null = null;

  ngOnInit() {
    void this.load();
    this.socket = io(environment.apiUrl, { transports: ['websocket', 'polling'] });
    this.socket.emit(SOCKET_EVENTS.SUBSCRIBE_ONLINE_DOCTORS);
    this.socket.on(SOCKET_EVENTS.DOCTOR_PRESENCE, (doctor: OnlineDoctor) => {
      if (!this.isAvailableHomeopathyDoctor(doctor)) {
        this.removeDoctor(doctor.userId);
        return;
      }
      this.doctors.update((list) => {
        const idx = list.findIndex((d) => d.userId === doctor.userId);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = doctor;
          return next;
        }
        return [...list, doctor];
      });
    });
    this.socket.on(SOCKET_EVENTS.DOCTOR_OFFLINE, (payload: { userId: string }) => {
      this.removeDoctor(payload.userId);
    });
  }

  ngOnDestroy() {
    this.socket?.disconnect();
  }

  private async load() {
    try {
      const [docRes, diseaseRes] = await Promise.all([
        this.client.get<{ doctors: OnlineDoctor[] }>(API_PATHS.ONLINE_DOCTORS),
        this.client.get<{ diseases: Disease[] }>(`${API_PATHS.DISEASES}?grouped=false`),
      ]);
      this.doctors.set(
        (docRes.doctors ?? []).filter((doctor) => this.isAvailableHomeopathyDoctor(doctor)),
      );
      this.diseases.set(diseaseRes.diseases ?? []);
    } catch {
      this.error.set('Could not load online doctors.');
    } finally {
      this.loading.set(false);
    }
  }

  selectDoctor(doctor: OnlineDoctor | null) {
    this.selectedDoctor.set(doctor);
  }

  categoryLabel(doctor: OnlineDoctor) {
    return doctor.category === 'SPECIALIST' ? 'Homeopathy specialist' : 'Homeopathy doctor';
  }

  doctorImage(doctor: OnlineDoctor): string | null {
    const value = doctor.profileImageUrl?.trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    return `${environment.apiUrl.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  selectedDisease(): Disease | null {
    return this.diseases().find((disease) => disease.id === this.formModel().diseaseId) ?? null;
  }

  consultationFeeLabel(): string {
    const amount = this.selectedDisease()?.feeInPaise;
    return amount == null
      ? 'Select a health concern to see the fee'
      : new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(amount / 100);
  }

  private isAvailableHomeopathyDoctor(doctor: OnlineDoctor): boolean {
    return doctor.providerDomain === 'HOMEOPATHY' && doctor.liveStatus === 'ONLINE';
  }

  private removeDoctor(userId: string) {
    this.doctors.update((list) => list.filter((doctor) => doctor.userId !== userId));
    if (this.selectedDoctor()?.userId === userId) this.selectedDoctor.set(null);
  }

  async startConsult() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/talk-to-doctor' } });
      return;
    }
    const { diseaseId, concern } = this.formModel();
    if (!diseaseId || !concern.trim()) {
      this.error.set('Select a concern and describe your symptoms.');
      return;
    }
    if (!this.doctors().length) {
      this.error.set('No doctor is live right now. Please book a scheduled consultation instead.');
      return;
    }

    this.booking.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const res = await this.client.apiFetch<{ consultation: { id: string } }>(
        API_PATHS.CONSULTATIONS,
        {
          method: 'POST',
          body: JSON.stringify({
            diseaseId,
            consultationMode: 'INSTANT_ONLINE',
            clinicStoreId: null,
            preferredDoctorUserId: this.selectedDoctor()?.userId ?? null,
            intakeAnswers: {
              'Main concern': concern.trim(),
              'Consultation type': 'Instant online doctor',
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
