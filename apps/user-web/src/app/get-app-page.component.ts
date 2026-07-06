import { Component } from '@angular/core';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { AppDownloadQrComponent } from './shared/app-download-qr/app-download-qr.component';

@Component({
  selector: 'app-get-app-page',
  standalone: true,
  imports: [AppHeaderComponent, AppFooterComponent, AppDownloadQrComponent],
  templateUrl: './get-app-page.component.html',
  styleUrl: './get-app-page.component.scss'
})
export class GetAppPageComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;
}
