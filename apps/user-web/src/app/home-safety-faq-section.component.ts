import { Component, OnInit, signal, inject } from '@angular/core';
import { HOME_CONTENT } from './core/constants/public-site-content.constants';
import { API_PATHS } from './core/constants/api-paths.constants';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import {
  FAQ_FALLBACK_ENTRIES,
  type FaqAccordionItem,
} from './faq/constants/faq-fallback.constants';
import { FaqAccordionComponent } from './faq/faq-accordion/faq-accordion.component';

@Component({
  selector: 'app-home-safety-faq-section',
  imports: [FaqAccordionComponent],
  templateUrl: './home-safety-faq-section.component.html',
})
export class HomeSafetyFaqSectionComponent implements OnInit {
  readonly copy = HOME_CONTENT;
  readonly faqItems = signal<FaqAccordionItem[]>([]);
  readonly faqLoading = signal(true);

  private readonly client = inject(ClinicApiClient);

  ngOnInit() {
    void this.loadFaq();
  }

  private async loadFaq() {
    this.faqLoading.set(true);
    try {
      const res = await this.client.get<{
        entries: Array<{ id: string; question: string; answer: string }>;
      }>(API_PATHS.FAQ);
      const items = (res.entries || []).slice(0, 4).map((entry) => ({
        id: entry.id,
        question: entry.question,
        answer: entry.answer,
      }));
      this.faqItems.set(items.length ? items : FAQ_FALLBACK_ENTRIES.slice(0, 4));
    } catch {
      this.faqItems.set(FAQ_FALLBACK_ENTRIES.slice(0, 4));
    } finally {
      this.faqLoading.set(false);
    }
  }
}
