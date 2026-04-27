import { Component, Input } from '@angular/core';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-home-hero-section',
  template: `
    <section class="panel hero-panel">
      <div class="home-hero">
        <p class="eyebrow">Vitalis Care | Doctor-led digital clinic</p>
        <h1>Chronic care that actually follows through.</h1>
        <p class="hero-copy">
          We specialize in long-running conditions that need deeper history, pattern tracking, and disciplined follow-up — not quick-fix consultations.
        </p>

        <div class="home-actions">
          <a class="primary home-action" href="/login" (click)="openAuthOverlay($event)">
            <span class="btn-icon">→</span>
            Start your consultation
          </a>
          <a class="whatsapp-action" [href]="whatsappLink" target="_blank" rel="noopener">
            <span class="btn-icon">💬</span>
            Chat on WhatsApp
          </a>
        </div>

        <div class="hero-trust-row">
          <div class="trust-item">
            <span class="trust-icon">✓</span>
            <span>Licensed doctors</span>
          </div>
          <div class="trust-item">
            <span class="trust-icon">✓</span>
            <span>Secure & private</span>
          </div>
          <div class="trust-item">
            <span class="trust-icon">✓</span>
            <span>Follow-up included</span>
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
