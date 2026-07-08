import { Component, inject } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';

@Component({
  selector: 'app-contact',
  imports: [AppHeaderComponent, AppFooterComponent]
,
  templateUrl: './contact.component.html',
})
export class ContactComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
}
