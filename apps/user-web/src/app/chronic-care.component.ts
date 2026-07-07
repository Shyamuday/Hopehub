import { Component } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import { CHRONIC_CARE_PAGE_CONTENT } from './core/constants/public-site-content.constants';

@Component({
  selector: 'app-chronic-care',
  imports: [AppHeaderComponent, AppFooterComponent]
,
  templateUrl: './chronic-care.component.html',
})
export class ChronicCareComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
  readonly copy = CHRONIC_CARE_PAGE_CONTENT;
}
