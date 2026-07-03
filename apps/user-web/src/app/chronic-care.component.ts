import { Component, ChangeDetectionStrategy } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';

@Component({
  selector: 'app-chronic-care',
  imports: [AppHeaderComponent, AppFooterComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  templateUrl: './chronic-care.component.html',
})
export class ChronicCareComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
}
