import { Component, computed, signal } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import { API_PATHS } from './core/constants/api-paths.constants';
import { ClinicApiClient } from './clinic-api/clinic-api.client';
import { FAQ_FALLBACK_ENTRIES, type FaqAccordionItem } from './faq/constants/faq-fallback.constants';
import { FaqAccordionComponent } from './faq/faq-accordion/faq-accordion.component';

@Component({
  selector: 'app-faq',
  imports: [AppHeaderComponent, AppFooterComponent, FaqAccordionComponent],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
  readonly fallbackEntries = FAQ_FALLBACK_ENTRIES;
  readonly entries = signal<FaqAccordionItem[]>([]);
  readonly loading = signal(true);
  private readonly client = new ClinicApiClient();

  readonly displayEntries = computed(() => {
    const loaded = this.entries();
    return loaded.length ? loaded : this.fallbackEntries;
  });

  readonly categories = computed(() => {
    const cats = [...new Set(this.displayEntries().map((e) => e.category || 'General'))];
    return cats.sort((a, b) => a.localeCompare(b));
  });

  constructor() {
    void this.load();
  }

  private async load() {
    try {
      const res = await this.client.get<{ entries: FaqAccordionItem[] }>(API_PATHS.FAQ);
      this.entries.set(res.entries ?? []);
    } catch {
      /* fallback entries shown */
    } finally {
      this.loading.set(false);
    }
  }

  entriesForCategory(cat: string): FaqAccordionItem[] {
    return this.displayEntries().filter((e) => (e.category || 'General') === cat);
  }
}
