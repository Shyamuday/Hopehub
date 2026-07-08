import { Component, inject } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import { CHRONIC_CARE_PAGE_CONTENT } from './core/constants/public-site-content.constants';

@Component({
  selector: 'app-chronic-care',
  imports: [AppHeaderComponent, AppFooterComponent]
,
  templateUrl: './chronic-care.component.html',
})
export class ChronicCareComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
  readonly copy = CHRONIC_CARE_PAGE_CONTENT;
}
