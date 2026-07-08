import { Component, inject } from '@angular/core';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import { ABOUT_CONTENT } from './core/constants/public-site-content.constants';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';

@Component({
  selector: 'app-about',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './about.component.html',
})
export class AboutComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
  readonly copy = ABOUT_CONTENT;
}
