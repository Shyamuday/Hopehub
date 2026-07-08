import { Component, inject } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';

@Component({
  selector: 'app-safety',
  imports: [AppHeaderComponent, AppFooterComponent]
,
  templateUrl: './safety.component.html',
})
export class SafetyComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
}
