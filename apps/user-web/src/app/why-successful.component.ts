import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import { homeopathyApproaches } from './treatment-approach/homeopathy-approaches.constants';

@Component({
  selector: 'app-why-successful',
  imports: [CommonModule, AppHeaderComponent, AppFooterComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './why-successful.component.html',
})
export class WhySuccessfulComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
  readonly approaches = homeopathyApproaches;
}
