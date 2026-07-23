import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { buildDetailRows, DetailRowsComponent } from '@hopehub/platform-ui';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { ClinicApiService } from './clinic-api.service';
import { ROUTE_PATHS } from './core/constants/app-routes.constants';
import { CURRENCY_CODE } from './core/constants/billing.constants';
import { NOTE_CONTENT } from './core/constants/note-content.constants';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import {
  DISEASE_COMMON_IN_FIELDS,
  DISEASE_QUICK_FACT_FIELDS,
  DISEASE_REVIEW_FIELDS,
  DISEASE_TREATMENT_OPTION_FIELDS,
} from './disease/constants/disease-detail.fields';
import { Disease, DiseaseFaqItem, DiseaseInfo } from './models';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-disease-detail',
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    AppHeaderComponent,
    AppFooterComponent,
    DetailRowsComponent,
  ],
  templateUrl: './disease-detail.component.html',
})
export class DiseaseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly overlayService = inject(AppOverlayService);
  private readonly api = inject(ClinicApiService);
  private readonly whatsappSvc = inject(WhatsappLinkService);

  readonly whatsappLink = this.whatsappSvc.url;
  readonly notes = NOTE_CONTENT;
  readonly defaultWarning = NOTE_CONTENT.diseaseSafety.defaultText;
  readonly currencyCode = CURRENCY_CODE;
  readonly dashboardPath = `/${ROUTE_PATHS.PATIENT_DASHBOARD}`;

  readonly liveDisease = signal<Disease | null>(null);
  readonly loading = signal(true);

  readonly pageInfo = computed(() => this.liveDisease()?.publicPage || undefined);
  readonly pageReady = computed(() => !this.loading() && !!(this.pageInfo() || this.liveDisease()));
  readonly displayName = computed(() => this.pageInfo()?.name || this.liveDisease()?.name || '');
  readonly displaySummary = computed(
    () =>
      this.pageInfo()?.summary ||
      this.liveDisease()?.publicDescription ||
      this.liveDisease()?.description ||
      '',
  );
  readonly headerSubtitle = computed(() => this.pageInfo()?.shortName || this.displayName());
  readonly heroImageUrl = computed(
    () => this.liveDisease()?.publicImageUrl || this.pageInfo()?.imageUrl || null,
  );
  readonly heroImageAlt = computed(() => this.pageInfo()?.imageAlt || this.displayName());
  readonly displayFaq = computed(() => {
    const dbFaq = this.liveDisease()?.publicFaq;
    if (dbFaq?.length) return dbFaq;
    return this.pageInfo()?.faq || [];
  });

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.loading.set(false);
        return;
      }
      void this.loadPage(slug);
      window.scrollTo(0, 0);
    });
  }

  private async loadPage(slug: string) {
    this.loading.set(true);
    this.liveDisease.set(null);

    try {
      const response = await firstValueFrom(this.api.diseaseBySlug(slug));
      this.liveDisease.set(response.disease);
    } catch {
      this.liveDisease.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  openAuthOverlay(event: Event, diseaseId?: string) {
    event.preventDefault();
    if (diseaseId && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pendingDiseaseId', diseaseId);
    }
    this.overlayService.open(AuthFormOverlayComponent, {
      width: '440px',
      panelClass: 'app-overlay-panel',
    });
  }

  quickFactRows(disease: DiseaseInfo) {
    return buildDetailRows(disease, DISEASE_QUICK_FACT_FIELDS);
  }

  commonInRows(disease: DiseaseInfo) {
    return disease.commonIn ? buildDetailRows(disease.commonIn, DISEASE_COMMON_IN_FIELDS) : [];
  }

  reviewRows(disease: DiseaseInfo) {
    return buildDetailRows(disease, DISEASE_REVIEW_FIELDS);
  }

  treatmentOptionRows(disease: DiseaseInfo) {
    return disease.treatmentOptions
      ? buildDetailRows(disease.treatmentOptions, DISEASE_TREATMENT_OPTION_FIELDS)
      : [];
  }

  faqRows(items: DiseaseFaqItem[]) {
    return items.map((item) => ({ label: item.question, value: item.answer }));
  }
}
