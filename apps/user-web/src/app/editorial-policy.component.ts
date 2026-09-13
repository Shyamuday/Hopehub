import { Component, inject } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';

@Component({
  selector: 'app-editorial-policy',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './editorial-policy.component.html',
  styles: `
    .editorial-stack {
      display: grid;
      gap: 18px;
    }
    .editorial-stack ul {
      margin: 12px 0 0;
      padding-left: 22px;
    }
    .editorial-stack li + li {
      margin-top: 9px;
    }
    .editorial-note {
      border-left: 4px solid #0f766e;
    }
  `,
})
export class EditorialPolicyComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
}
