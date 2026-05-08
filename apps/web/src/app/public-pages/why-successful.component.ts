import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';
import { homeopathyApproaches } from '../constants';
import { PUBLIC_WHATSAPP_LINK } from './public-whatsapp';

@Component({
  selector: 'app-why-successful',
  imports: [CommonModule, AppHeaderComponent, AppFooterComponent],
  templateUrl: './why-successful.component.html'
})
export class WhySuccessfulComponent {
  readonly whatsappLink = PUBLIC_WHATSAPP_LINK;
  readonly approaches = homeopathyApproaches;
}
