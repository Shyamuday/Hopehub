import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import { CURRENCY_CODE } from './core/constants/billing.constants';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';

type FilterOption = { value: string; label: string };

type HealthService = {
  id: string;
  slug: string;
  title: string;
  shortTitle?: string | null;
  category: string;
  subCategory?: string | null;
  expertTypes: string[];
  expertTypeLabels: string[];
  summary: string;
  priceInPaise: number;
  compareAtPriceInPaise?: number | null;
  durationMinutes?: number | null;
  tags: string[];
  isFeatured: boolean;
};

type ServiceResponse = {
  services: HealthService[];
  filterOptions: {
    categories: string[];
    subCategories: string[];
    subCategoriesByCategory: Record<string, string[]>;
    expertTypes: FilterOption[];
    tags: string[];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

@Component({
  selector: 'app-services',
  imports: [CommonModule, CurrencyPipe, RouterLink, AppHeaderComponent, AppFooterComponent],
  templateUrl: './services.component.html',
})
export class ServicesComponent implements OnInit {
  private readonly api = inject(ClinicApiClient);
  private readonly whatsappSvc = inject(WhatsappLinkService);

  readonly whatsappLink = this.whatsappSvc.url;
  readonly currencyCode = CURRENCY_CODE;
  readonly dashboardPath = `/${ROUTE_PATHS.PATIENT_DASHBOARD}`;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly services = signal<HealthService[]>([]);
  readonly categories = signal<string[]>([]);
  readonly subCategories = signal<string[]>([]);
  readonly subCategoriesByCategory = signal<Record<string, string[]>>({});
  readonly expertTypes = signal<FilterOption[]>([]);
  readonly tags = signal<string[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly q = signal('');
  readonly category = signal('');
  readonly subCategory = signal('');
  readonly expertType = signal('');
  readonly tag = signal('');
  readonly sort = signal('featured');
  readonly hasFilters = computed(() =>
    Boolean(this.q() || this.category() || this.subCategory() || this.expertType() || this.tag()),
  );
  readonly visibleSubCategories = computed(() => {
    const category = this.category();
    if (!category) return this.subCategories();
    return this.subCategoriesByCategory()[category] || [];
  });

  ngOnInit() {
    void this.load();
  }

  async load(page = this.page()) {
    this.loading.set(true);
    this.error.set('');
    this.page.set(page);
    try {
      const params = new URLSearchParams({
        page: String(this.page()),
        pageSize: '9',
        sort: this.sort(),
      });
      if (this.q().trim()) params.set('q', this.q().trim());
      if (this.category()) params.set('category', this.category());
      if (this.subCategory()) params.set('subCategory', this.subCategory());
      if (this.expertType()) params.set('expertType', this.expertType());
      if (this.tag()) params.set('tag', this.tag());
      const res = await this.api.get<ServiceResponse>(`/services?${params}`);
      this.services.set(res.services || []);
      this.categories.set(res.filterOptions?.categories || []);
      this.subCategories.set(res.filterOptions?.subCategories || []);
      this.subCategoriesByCategory.set(res.filterOptions?.subCategoriesByCategory || {});
      this.expertTypes.set(res.filterOptions?.expertTypes || []);
      this.tags.set(res.filterOptions?.tags || []);
      this.total.set(res.pagination?.total || 0);
      this.totalPages.set(res.pagination?.totalPages || 1);
    } catch {
      this.error.set('Could not load services. Please try again.');
      this.services.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  reset() {
    this.q.set('');
    this.category.set('');
    this.subCategory.set('');
    this.expertType.set('');
    this.tag.set('');
    this.sort.set('featured');
    void this.load(1);
  }

  onCategoryChange(value: string) {
    this.category.set(value);
    this.subCategory.set('');
    void this.load(1);
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
