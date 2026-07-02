import { Component } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';

@Component({
  selector: 'app-about',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './about.component.html'
})
export class AboutComponent {
  readonly whatsappLink =
    'https://wa.me/919876543210?text=Hi%20Vitalis%20Care%20and%20Research%20Centre%2C%20I%20want%20to%20know%20more%20about%20your%20care';
}
