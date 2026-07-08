import { Component, inject } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';

@Component({
  selector: 'app-skin-care',
  imports: [AppHeaderComponent, AppFooterComponent]
,
  templateUrl: './skin-care.component.html',
})
export class SkinCareComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
}
