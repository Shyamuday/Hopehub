import { Component, inject, signal } from '@angular/core';
import { DetailRowsComponent, type DetailRow } from '@vitalis/platform-ui';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import { OUR_DOCTORS_PAGE_CONTENT } from './core/constants/public-site-content.constants';
import { API_PATHS } from './core/constants/api-paths.constants';
import { ClinicApiClient } from './clinic-api/clinic-api.client';

interface PublicDoctor {
  id: string;
  specialty?: string;
  doctorType?: string;
  bio?: string | null;
  yearsOfExperience?: number | null;
  focusAreas?: string[];
  designation?: string | null;
  user: { id: string; name: string };
}

@Component({
  selector: 'app-our-doctors',
  imports: [AppHeaderComponent, AppFooterComponent, DetailRowsComponent],
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
      title: 'We assign the right doctor',
      detail: 'Our team matches you to the doctor best suited for your condition.',
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

  processStepRows(step: { title: string; detail: string }): DetailRow[] {
    return [{ label: step.title, value: step.detail }];
  }
}
