import { Component, Input } from '@angular/core';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-home-hero-section',
  template: `
    <section class="panel">
      <div class="home-hero">
        <p class="eyebrow">Vitalis Clinic</p>
        <h1>Doctor-led care for your health concerns.</h1>
        <p class="hero-copy">
          Choose your health concern, complete a short intake, pay securely, and get assigned to our internal doctor panel.
        </p>

        <div class="home-actions">
          <a class="primary home-action" href="/login" (click)="openAuthOverlay($event)">Book consultation</a>
          <a class="whatsapp-action" [href]="whatsappLink" target="_blank" rel="noopener">
            Chat on WhatsApp
          </a>
        </div>

        <div class="trust-grid">
          <div>
            <strong>₹499</strong>
            <span>Hair fall consult</span>
          </div>
          <div>
            <strong>Chat-first</strong>
            <span>Low data usage</span>
          </div>
          <div>
            <strong>Private</strong>
            <span>No public doctor listings</span>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeHeroSectionComponent {
  @Input() whatsappLink = '';

  constructor(private readonly overlayService: AppOverlayService) { }

  openAuthOverlay(event: Event, mode: 'patient' | 'staff' = 'patient') {
    event.preventDefault();
    this.overlayService.open(AuthFormOverlayComponent, {
      data: { mode },
      width: '480px',
      panelClass: 'app-overlay-panel'
    });
  }
}
