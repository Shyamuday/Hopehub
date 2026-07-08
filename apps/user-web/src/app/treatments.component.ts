import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { CURRENCY_CODE } from './core/constants/billing.constants';
import { TREATMENTS_PAGE_CONTENT } from './core/constants/public-site-content.constants';
import { ClinicApiService } from './clinic-api.service';
import { Disease } from './models';
import { AppOverlayService } from './overlay.service';

type TreatmentCategory = {
  key: string;
  label: string;
  diseases: Disease[];
};

@Component({
  selector: 'app-treatments',
  imports: [CommonModule, CurrencyPipe, RouterLink, AppHeaderComponent, AppFooterComponent],
  templateUrl: './treatments.component.html',
})
export class TreatmentsComponent implements OnInit {
  private readonly api = inject(ClinicApiService);
  private readonly overlayService = inject(AppOverlayService);

  readonly whatsappLink = WHATSAPP_CONTACT_URL;
  readonly copy = TREATMENTS_PAGE_CONTENT;
  readonly currencyCode = CURRENCY_CODE;
  readonly dashboardPath = `/${ROUTE_PATHS.PATIENT_DASHBOARD}`;

  readonly categories = signal<TreatmentCategory[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly selectedCategoryKey = signal('');
  readonly selectedDisease = signal<Disease | null>(null);

  readonly visibleCategories = computed(() => this.categories().filter((group) => group.diseases.length > 0));

  readonly selectedCategory = computed(
    () => this.visibleCategories().find((group) => group.key === this.selectedCategoryKey()) || null
  );

  ngOnInit() {
    void this.loadCatalog();
  }

  async loadCatalog() {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await firstValueFrom(this.api.diseasesGrouped());
      const groups: TreatmentCategory[] = (response.categories || [])
        .filter((group) => group.diseases.length > 0)
        .map((group) => ({
          key: group.key,
          label: group.label,
          diseases: group.diseases
        }));

      if (response.uncategorized?.length) {
        groups.push({
          key: 'other',
          label: 'Other',
          diseases: response.uncategorized
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
    return { diseaseId };
  }

  openAuthOverlay(event: Event, diseaseId: string) {
    event.preventDefault();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pendingDiseaseId', diseaseId);
    }
    this.overlayService.open(AuthFormOverlayComponent, {
      width: '480px',
      panelClass: 'app-overlay-panel',
    });
  }
}
