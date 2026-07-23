import { CommonModule, CurrencyPipe } from '@angular/common';

import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { RouterLink } from '@angular/router';

import { firstValueFrom } from 'rxjs';

import { AppFooterComponent } from './app-footer.component';

import { AppHeaderComponent } from './app-header.component';

import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';

import { ROUTE_PATHS } from './core/constants/app-routes.constants';

import { CURRENCY_CODE } from './core/constants/billing.constants';

import { TREATMENTS_PAGE_CONTENT } from './core/constants/public-site-content.constants';

import { WhatsappLinkService } from './core/services/whatsapp-link.service';

import { diseaseDetailPath } from './core/utils/disease-slug.util';

import { ClinicApiService } from './clinic-api.service';

import { Disease } from './models';

import { AppOverlayService } from './overlay.service';

type TreatmentCategory = {
  key: string;

  label: string;

  diseases: Disease[];
};

type ClinicOption = {
  id: string;

  name: string;

  address?: string | null;
};

@Component({
  selector: 'app-treatments',

  imports: [CommonModule, CurrencyPipe, RouterLink, AppHeaderComponent, AppFooterComponent],

  templateUrl: './treatments.component.html',
})
export class TreatmentsComponent implements OnInit {
  private readonly api = inject(ClinicApiService);

  private readonly overlayService = inject(AppOverlayService);

  private readonly whatsappSvc = inject(WhatsappLinkService);

  readonly whatsappLink = this.whatsappSvc.url;

  readonly copy = TREATMENTS_PAGE_CONTENT;

  readonly currencyCode = CURRENCY_CODE;

  readonly dashboardPath = `/${ROUTE_PATHS.PATIENT_DASHBOARD}`;

  readonly detailPath = diseaseDetailPath;

  readonly categories = signal<TreatmentCategory[]>([]);

  readonly clinics = signal<ClinicOption[]>([]);

  readonly selectedClinicStoreId = signal('');

  readonly loading = signal(true);

  readonly clinicsLoading = signal(true);

  readonly error = signal('');

  readonly selectedCategoryKey = signal('');

  readonly selectedDisease = signal<Disease | null>(null);

  readonly visibleCategories = computed(() =>
    this.categories().filter((group) => group.diseases.length > 0),
  );

  readonly selectedCategory = computed(
    () =>
      this.visibleCategories().find((group) => group.key === this.selectedCategoryKey()) || null,
  );

  ngOnInit() {
    void this.bootstrap();
  }

  async bootstrap() {
    await this.loadClinics();

    await this.loadCatalog();
  }

  async loadClinics() {
    this.clinicsLoading.set(true);

    try {
      const response = await firstValueFrom(this.api.clinics());

      this.clinics.set(response.clinics || []);

      const first = response.clinics?.[0];

      if (first) {
        this.selectedClinicStoreId.set(first.id);
      }
    } catch {
      this.clinics.set([]);
    } finally {
      this.clinicsLoading.set(false);
    }
  }

  async onClinicChange(clinicStoreId: string) {
    this.selectedClinicStoreId.set(clinicStoreId);

    await this.loadCatalog();
  }

  async loadCatalog() {
    this.loading.set(true);

    this.error.set('');

    try {
      const clinicStoreId = this.selectedClinicStoreId() || undefined;

      const response = await firstValueFrom(this.api.diseasesGrouped({ clinicStoreId }));

      const groups: TreatmentCategory[] = (response.categories || [])

        .filter((group) => group.diseases.length > 0)

        .map((group) => ({
          key: group.key,

          label: group.label,

          diseases: group.diseases,
        }));

      if (response.uncategorized?.length) {
        groups.push({
          key: 'other',

          label: 'Other',

          diseases: response.uncategorized,
        });
      }

      this.categories.set(groups);

      const first = groups[0];

      this.selectedCategoryKey.set(first?.key || '');

      this.selectedDisease.set(null);
    } catch {
      this.error.set('Could not load treatments. Please refresh and try again.');

      this.categories.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  selectCategory(categoryKey: string) {
    this.selectedCategoryKey.set(categoryKey);

    this.selectedDisease.set(null);
  }

  selectDisease(disease: Disease) {
    this.selectedDisease.set(disease);
  }

  bookingQuery(diseaseId: string) {
    const query: Record<string, string> = { diseaseId };

    if (this.selectedClinicStoreId()) {
      query['clinicStoreId'] = this.selectedClinicStoreId();
    }

    return query;
  }

  openAuthOverlay(event: Event, diseaseId: string) {
    event.preventDefault();

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pendingDiseaseId', diseaseId);

      if (this.selectedClinicStoreId()) {
        sessionStorage.setItem('pendingClinicStoreId', this.selectedClinicStoreId());
      }
    }

    this.overlayService.open(AuthFormOverlayComponent, {
      width: '440px',

      panelClass: 'app-overlay-panel',
    });
  }
}
