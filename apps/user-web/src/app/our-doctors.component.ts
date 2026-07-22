import { Component, inject, signal } from '@angular/core';
import { DetailRowsComponent, type DetailRow } from '@hopehub/platform-ui';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import { OUR_DOCTORS_PAGE_CONTENT } from './core/constants/public-site-content.constants';
import { API_PATHS } from './core/constants/api-paths.constants';
import { ClinicApiClient } from './clinic-api/clinic-api.client';

interface PublicDoctor {
  id: string;
  specialty?: string;
  specialization?: string | null;
  providerType?: string;
  providerTypeLabel?: string;
  providerCategory?: string;
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

  readonly providers = signal<PublicDoctor[]>([]);
  readonly doctors = this.providers;
  readonly loading = signal(true);

  readonly process = [
    {
      step: '01',
      title: 'You describe your concern',
      detail: 'Share your symptoms and health history through our short intake form.',
    },
    {
      step: '02',
      title: 'We assign the right provider',
      detail: 'Our team matches you to the provider best suited for your condition.',
    },
    {
      step: '03',
      title: 'Consultation begins',
      detail: 'Your assigned provider reviews your case and begins a private chat consultation.',
    },
    {
      step: '04',
      title: 'Ongoing care',
      detail: 'Prescriptions, follow-ups, and care continuity — all managed under one roof.',
    },
  ];

  constructor() {
    void this.loadProviders();
  }

  private async loadProviders() {
    try {
      const res = await this.client.get<{ doctors?: PublicDoctor[]; providers?: PublicDoctor[] }>(
        API_PATHS.PROVIDERS,
      );
      this.providers.set(res.providers ?? res.doctors ?? []);
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

  providerTitle(provider: PublicDoctor): string {
    return (
      provider.designation ||
      provider.specialization ||
      provider.specialty ||
      provider.providerTypeLabel ||
      'Healthcare Provider'
    );
  }

  providerQualification(provider: PublicDoctor): string {
    const specialty = provider.specialization || provider.specialty || provider.providerTypeLabel;
    return provider.yearsOfExperience && specialty
      ? `${specialty} - ${provider.yearsOfExperience} yrs experience`
      : specialty || '';
  }
}
