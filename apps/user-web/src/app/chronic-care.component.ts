import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { ClinicApiService } from './clinic-api.service';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { CURRENCY_CODE } from './core/constants/billing.constants';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import {
  CHRONIC_CARE_PAGE_CONTENT,
  type RuntimePublicCopy,
} from './core/constants/public-site-content.constants';
import { PublicPagesService } from './core/services/public-pages.service';
import { diseaseDetailPath } from './core/utils/disease-slug.util';
import { Disease } from './models';

type CategoryGroup = {
  key: string;
  label: string;
  diseases: Disease[];
};

@Component({
  selector: 'app-chronic-care',
  imports: [CommonModule, CurrencyPipe, RouterLink, AppHeaderComponent, AppFooterComponent],
  templateUrl: './chronic-care.component.html',
})
export class ChronicCareComponent implements OnInit {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  private readonly api = inject(ClinicApiService);
  private readonly publicPages = inject(PublicPagesService);

  readonly whatsappLink = this.whatsappSvc.url;
  copy: RuntimePublicCopy<typeof CHRONIC_CARE_PAGE_CONTENT> = CHRONIC_CARE_PAGE_CONTENT;
  readonly currencyCode = CURRENCY_CODE;
  readonly dashboardPath = `/${ROUTE_PATHS.PATIENT_DASHBOARD}`;
  readonly detailPath = diseaseDetailPath;

  readonly categories = signal<CategoryGroup[]>([]);
  readonly loading = signal(true);

  ngOnInit() {
    void this.bootstrap();
  }

  private async bootstrap() {
    await this.loadPageCopy();
    await this.loadCatalog();
  }

  private async loadPageCopy() {
    const page = await this.publicPages.bySlug('chronic-care');
    if (!page) return;
    this.copy = {
      ...CHRONIC_CARE_PAGE_CONTENT,
      headerSubtitle: page.subtitle || CHRONIC_CARE_PAGE_CONTENT.headerSubtitle,
      eyebrow: page.subtitle || CHRONIC_CARE_PAGE_CONTENT.eyebrow,
      title: page.title,
      body: page.summary || CHRONIC_CARE_PAGE_CONTENT.body,
    };
  }

  private async loadCatalog() {
    this.loading.set(true);
    try {
      const response = await firstValueFrom(this.api.diseasesGrouped());
      const groups = (response.categories || [])
        .filter((group) => group.diseases.length > 0)
        .map((group) => ({
          key: group.key,
          label: group.label,
          diseases: group.diseases,
        }));

      if (response.uncategorized?.length) {
        groups.push({ key: 'other', label: 'Other', diseases: response.uncategorized });
      }

      this.categories.set(groups);
    } catch {
      this.categories.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
