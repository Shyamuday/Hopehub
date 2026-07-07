import { Component } from '@angular/core';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import { ABOUT_CONTENT } from './core/constants/public-site-content.constants';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';

@Component({
  selector: 'app-about',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './about.component.html',
})
export class AboutComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
  readonly copy = ABOUT_CONTENT;
}
