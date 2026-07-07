import { Component, Input } from '@angular/core';
import { FOOTER_CONTENT } from './core/constants/footer-content.constants';
import { PUBLIC_SITE_BRAND } from './core/constants/public-site-content.constants';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-footer',
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss'
})
export class AppFooterComponent {
  @Input() whatsappLink = '';

  readonly brand = PUBLIC_SITE_BRAND;
  readonly footer = FOOTER_CONTENT;

  constructor(private readonly overlayService: AppOverlayService) {}

  openAuthOverlay(event: Event) {
    event.preventDefault();
    this.overlayService.open(AuthFormOverlayComponent, {
      width: '480px',
      panelClass: 'app-overlay-panel'
    });
  }
}
