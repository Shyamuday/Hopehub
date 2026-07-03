import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';

@Component({
  selector: 'app-privacy-terms',
  imports: [AppHeaderComponent, AppFooterComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './privacy-terms.component.html',
})
export class PrivacyTermsComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
}
