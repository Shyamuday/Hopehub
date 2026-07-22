import { Component, inject } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { PublicPagesService } from './core/services/public-pages.service';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';

@Component({
  selector: 'app-safety',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './safety.component.html',
})
export class SafetyComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  private readonly publicPages = inject(PublicPagesService);
  readonly whatsappLink = this.whatsappSvc.url;
  copy = {
    headerSubtitle: 'Safety and trust',
    eyebrow: 'Safety / Trust',
    title: 'Not for emergency care.',
    body: 'HopeHub Care and Research Centre is for planned online consultation and follow-up. If you have severe symptoms, sudden worsening, breathing difficulty, chest pain, fainting, heavy bleeding, severe allergic reaction, high fever, or any emergency, seek immediate offline medical care.',
  };

  constructor() {
    void this.loadPageCopy();
  }

  private async loadPageCopy() {
    const page = await this.publicPages.bySlug('safety');
    if (!page) return;
    this.copy = {
      ...this.copy,
      headerSubtitle: page.subtitle || this.copy.headerSubtitle,
      eyebrow: page.subtitle || this.copy.eyebrow,
      title: page.title,
      body: page.summary || this.copy.body,
    };
  }
}
