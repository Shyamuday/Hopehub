import { Component, Input } from '@angular/core';
import { HOME_CONTENT } from './core/constants/public-site-content.constants';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-home-final-cta-section',
  templateUrl: './home-final-cta-section.component.html',
})
export class HomeFinalCtaSectionComponent {
  @Input() whatsappLink = '';

  readonly copy = HOME_CONTENT;

  constructor(private readonly overlayService: AppOverlayService) {}

  openAuthOverlay(event: Event) {
    event.preventDefault();
    this.overlayService.open(AuthFormOverlayComponent, {
      width: '480px',
      panelClass: 'app-overlay-panel',
    });
  }
}
