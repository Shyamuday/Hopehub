import { Component, Input } from '@angular/core';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-home-final-cta-section',
  template: `
    <section class="about-cta panel">
      <div>
        <p class="eyebrow">Ready to begin?</p>
        <h2>Start your consultation with Vitalis Clinic.</h2>
        <p>Book online in minutes, or chat with us first on WhatsApp for guidance.</p>
      </div>
      <div class="home-actions">
        <a class="primary home-action" href="/login" (click)="openAuthOverlay($event)">Book consultation</a>
        <a class="whatsapp-action" [href]="whatsappLink" target="_blank" rel="noopener">Chat on WhatsApp</a>
      </div>
    </section>
  `
})
export class HomeFinalCtaSectionComponent {
  @Input() whatsappLink = '';

  constructor(private readonly overlayService: AppOverlayService) { }

  openAuthOverlay(event: Event) {
    event.preventDefault();
    this.overlayService.open(AuthFormOverlayComponent, {
      width: '480px',
      panelClass: 'app-overlay-panel'
    });
  }
}
