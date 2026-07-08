import { Component, inject } from '@angular/core';
import { LEGAL_HUB_CONTENT } from '../core/constants/legal-pages-content.constants';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { WHATSAPP_CONTACT_URL } from '../core/constants/branding.constants';

@Component({
  selector: 'app-legal-hub',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './legal-hub.component.html',
  styleUrl: './legal-hub.component.scss'
})
export class LegalHubComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
  readonly copy = LEGAL_HUB_CONTENT;
}
