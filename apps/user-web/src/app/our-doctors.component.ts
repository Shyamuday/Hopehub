import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DetailRowsComponent, type DetailRow } from '@hopehub/platform-ui';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import { OUR_DOCTORS_PAGE_CONTENT } from './core/constants/public-site-content.constants';
import { API_PATHS } from './core/constants/api-paths.constants';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import { environment } from '../environments/environment';

interface PublicDoctor {
  id: string;
  userId: string;
  specialty?: string;
  doctorType?: string;
  bio?: string | null;
  yearsOfExperience?: number | null;
  focusAreas?: string[];
  designation?: string | null;
  registrationNo?: string | null;
  credentialVerified?: boolean;
  isAvailable?: boolean;
  nextAvailableSlot?: { date: string; startTime: string; endTime: string } | null;
  user: { id: string; name: string; profileImageUrl?: string | null };
}

@Component({
  selector: 'app-our-doctors',
  imports: [AppHeaderComponent, AppFooterComponent, DetailRowsComponent, RouterLink],
  templateUrl: './our-doctors.component.html',
})
export class OurDoctorsComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
  readonly copy = OUR_DOCTORS_PAGE_CONTENT;
  private readonly client = inject(ClinicApiClient);

  readonly doctors = signal<PublicDoctor[]>([]);
  readonly loading = signal(true);

  readonly process = [
    {
      step: '01',
      title: 'You describe your concern',
      detail: 'Share your symptoms and health history through our short intake form.',
    },
    {
      step: '02',
      title: 'Choose or let us match',
      detail:
        'Choose an available doctor, share a preference, or let our clinical team match your concern.',
    },
    {
      step: '03',
      title: 'Consultation begins',
      detail: 'Your assigned doctor reviews your case and begins a private chat consultation.',
    },
    {
      step: '04',
      title: 'Ongoing care',
      detail: 'Prescriptions, follow-ups, and care continuity — all managed under one roof.',
    },
  ];

  constructor() {
    void this.loadDoctors();
  }

  private async loadDoctors() {
    try {
      const res = await this.client.get<{ doctors: PublicDoctor[] }>(API_PATHS.DOCTORS);
      this.doctors.set(res.doctors ?? []);
    } catch {
      // show empty state silently
    } finally {
      this.loading.set(false);
    }
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  doctorImage(doctor: PublicDoctor): string | null {
    const value = doctor.user.profileImageUrl?.trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    return `${environment.apiUrl.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
  }

  nextOpening(doctor: PublicDoctor): string {
    const slot = doctor.nextAvailableSlot;
    if (!slot)
      return doctor.isAvailable ? 'Accepting consultation requests' : 'Availability on request';
    const date = new Date(slot.date);
    const dateLabel = Number.isNaN(date.getTime())
      ? 'Upcoming'
      : new Intl.DateTimeFormat('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }).format(date);
    return `Next opening: ${dateLabel}, ${slot.startTime}`;
  }

  processStepRows(step: { title: string; detail: string }): DetailRow[] {
    return [{ label: step.title, value: step.detail }];
  }
}
