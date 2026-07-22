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
  publicProfileDetails?: Array<{ key: string; label: string; value: string }>;
  designation?: string | null;
  user: { id: string; name: string };
}

type FilterOption = { value: string; label: string };
type ProviderFilters = {
  q: string;
  providerType: string;
  providerCategory: string;
  focus: string;
};

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
  readonly filterLoading = signal(false);
  readonly filters = signal({
    q: '',
    providerType: '',
    providerCategory: '',
    focus: '',
  });
  readonly filterOptions = signal<{
    providerTypes: FilterOption[];
    providerCategories: FilterOption[];
    focusAreas: string[];
  }>({
    providerTypes: [],
    providerCategories: [],
    focusAreas: [],
  });

  readonly process = [
    {
      step: '01',
      title: 'You describe your concern',
      detail: 'Share your symptoms and health history through our short intake form.',
    },
    {
      step: '02',
      title: 'We assign the right expert',
      detail: 'Our team matches you to the expert best suited for your condition.',
    },
    {
      step: '03',
      title: 'Consultation begins',
      detail: 'Your assigned expert reviews your case and begins a private chat consultation.',
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
      this.filterLoading.set(true);
      const res = await this.client.get<{
        doctors?: PublicDoctor[];
        providers?: PublicDoctor[];
        filterOptions?: {
          providerTypes: FilterOption[];
          providerCategories: FilterOption[];
          focusAreas: string[];
        };
      }>(this.providerListPath());
      this.providers.set(res.providers ?? res.doctors ?? []);
      if (res.filterOptions) {
        this.filterOptions.set(res.filterOptions);
      }
    } catch {
      // show empty state silently
    } finally {
      this.loading.set(false);
      this.filterLoading.set(false);
    }
  }

  updateFilter(key: keyof ProviderFilters, value: string) {
    this.filters.update((current) => ({ ...current, [key]: value }));
    void this.loadProviders();
  }

  resetFilters() {
    this.filters.set({ q: '', providerType: '', providerCategory: '', focus: '' });
    void this.loadProviders();
  }

  hasActiveFilters() {
    const filters = this.filters();
    return Boolean(filters.q || filters.providerType || filters.providerCategory || filters.focus);
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
      'Healthcare Expert'
    );
  }

  providerQualification(provider: PublicDoctor): string {
    const specialty = provider.specialization || provider.specialty || provider.providerTypeLabel;
    return provider.yearsOfExperience && specialty
      ? `${specialty} - ${provider.yearsOfExperience} yrs experience`
      : specialty || '';
  }

  private providerListPath() {
    const filters = this.filters();
    const params = new URLSearchParams();
    if (filters.q.trim()) params.set('q', filters.q.trim());
    if (filters.providerType) params.set('providerType', filters.providerType);
    if (filters.providerCategory) params.set('providerCategory', filters.providerCategory);
    if (filters.focus) params.set('focus', filters.focus);
    const qs = params.toString();
    return qs ? `${API_PATHS.PROVIDERS}?${qs}` : API_PATHS.PROVIDERS;
  }
}
