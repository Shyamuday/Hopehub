import { Component, inject, signal } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { TESTIMONIALS_PAGE_CONTENT } from './core/constants/public-site-content.constants';
import { API_PATHS } from './core/constants/api-paths.constants';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import { PublicConfigService } from './core/services/public-config.service';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';

interface Testimonial {
  id: string;
  patientName: string;
  location?: string | null;
  condition?: string | null;
  duration?: string | null;
  quote: string;
  stars: number;
}

@Component({
  selector: 'app-testimonials',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './testimonials.component.html',
})
export class TestimonialsComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
  readonly copy = TESTIMONIALS_PAGE_CONTENT;
  readonly testimonials = signal<Testimonial[]>([]);
  readonly loading = signal(true);
  readonly starRange = [1, 2, 3, 4, 5];

  readonly stats = signal([
    { value: '4,800+', label: 'Patients treated' },
    { value: '92%', label: 'Report improvement within 3 months' },
    { value: '4.8 / 5', label: 'Average patient satisfaction' },
    { value: '15+', label: 'Conditions treated' },
  ]);

  private readonly client = inject(ClinicApiClient);

  constructor(private readonly configSvc: PublicConfigService) {
    void this.load();
  }

  private async load() {
    try {
      const [tsRes, cfg] = await Promise.all([
        this.client.get<{ testimonials: Testimonial[] }>(API_PATHS.TESTIMONIALS),
        this.configSvc.get(),
      ]);
      this.testimonials.set(tsRes.testimonials ?? []);
      this.stats.set([
        { value: cfg.statPatientsTreated, label: 'Patients treated' },
        { value: cfg.statImprovement, label: 'Report improvement within 3 months' },
        { value: cfg.statSatisfaction, label: 'Average patient satisfaction' },
        { value: cfg.statConditionsTreated, label: 'Conditions treated' },
      ]);
    } catch {
      /* silently use fallback */
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
}
