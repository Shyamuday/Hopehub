import { Component, inject } from '@angular/core';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import {
  ABOUT_CONTENT,
  type RuntimePublicCopy,
} from './core/constants/public-site-content.constants';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { PublicPagesService } from './core/services/public-pages.service';

@Component({
  selector: 'app-about',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './about.component.html',
})
export class AboutComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  private readonly publicPages = inject(PublicPagesService);
  readonly whatsappLink = this.whatsappSvc.url;
  copy: RuntimePublicCopy<typeof ABOUT_CONTENT> = ABOUT_CONTENT;

  constructor() {
    void this.loadPageCopy();
  }

  private async loadPageCopy() {
    const page = await this.publicPages.bySlug('about');
    if (!page) return;
    this.copy = {
      ...ABOUT_CONTENT,
      page: {
        ...ABOUT_CONTENT.page,
        headerSubtitle: page.subtitle || ABOUT_CONTENT.page.headerSubtitle,
        eyebrow: page.subtitle || ABOUT_CONTENT.page.eyebrow,
        title: page.title,
        body: page.summary || ABOUT_CONTENT.page.body,
      },
    };
  }
}
