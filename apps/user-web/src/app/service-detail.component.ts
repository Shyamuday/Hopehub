import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import { CURRENCY_CODE } from './core/constants/billing.constants';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';

type HealthService = {
  id: string;
  slug: string;
  title: string;
  category: string;
  subCategory?: string | null;
  expertTypes: string[];
  expertTypeLabels: string[];
  summary: string;
  description?: string | null;
  priceInPaise: number;
  compareAtPriceInPaise?: number | null;
  durationMinutes?: number | null;
  imageUrl?: string | null;
  tags: string[];
  includes: string[];
  outcomes: string[];
  whoIsItFor: string[];
  howItWorks: string[];
  faqs: Array<{ question: string; answer: string }>;
};

@Component({
  selector: 'app-service-detail',
  imports: [CommonModule, CurrencyPipe, RouterLink, AppHeaderComponent, AppFooterComponent],
  templateUrl: './service-detail.component.html',
})
export class ServiceDetailComponent implements OnInit {
  private readonly api = inject(ClinicApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly whatsappSvc = inject(WhatsappLinkService);

  readonly whatsappLink = this.whatsappSvc.url;
  readonly currencyCode = CURRENCY_CODE;
  readonly dashboardPath = `/${ROUTE_PATHS.PATIENT_DASHBOARD}`;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly service = signal<HealthService | null>(null);
  readonly relatedServices = signal<HealthService[]>([]);

  ngOnInit() {
    void this.load();
  }

  async load() {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.api.get<{ service: HealthService; relatedServices: HealthService[] }>(
        `/services/${encodeURIComponent(slug)}`,
      );
      this.service.set(res.service);
      this.relatedServices.set(res.relatedServices || []);
    } catch {
      this.error.set('Could not load this service.');
      this.service.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  bookingQuery(service: HealthService) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pendingServiceSlug', service.slug);
    }
    return {
      serviceSlug: service.slug,
      serviceTitle: service.title,
      expertType: service.expertTypes[0] || '',
    };
  }
}
