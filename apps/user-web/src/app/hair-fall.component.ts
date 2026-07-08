import { Component, inject } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';

@Component({
  selector: 'app-hair-fall',
  imports: [AppHeaderComponent, AppFooterComponent]
,
  templateUrl: './hair-fall.component.html',
})
export class HairFallComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
}
