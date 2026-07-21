import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { buildDetailRows, DetailRowsComponent } from '@hopehub/platform-ui';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import { homeopathyApproaches } from './treatment-approach/homeopathy-approaches.constants';
import { HOMEOPATHY_APPROACH_SUMMARY_FIELDS } from './treatment-approach/constants/approach-summary.fields';
import type { HomeopathyApproach } from './models';

@Component({
  selector: 'app-why-successful',
  imports: [CommonModule, AppHeaderComponent, AppFooterComponent, DetailRowsComponent],
  templateUrl: './why-successful.component.html',
})
export class WhySuccessfulComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
  readonly approaches = homeopathyApproaches;

  approachSummaryRows(method: HomeopathyApproach) {
    return buildDetailRows(method, HOMEOPATHY_APPROACH_SUMMARY_FIELDS);
  }
}
