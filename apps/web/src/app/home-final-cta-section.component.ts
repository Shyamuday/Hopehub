import { Component, Input } from '@angular/core';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-home-final-cta-section',
  template: `
    <!-- Why Choose Us Section -->
    <section class="why-choose-section">
      <div class="section-header">
        <p class="eyebrow">Why Vitalis Care</p>
        <h2 class="section-title">Built for chronic conditions, not quick fixes</h2>
      </div>
      
      <div class="benefits-grid">
        <div class="benefit-card">
          <div class="benefit-icon">🔒</div>
          <h4>Private & secure</h4>
          <p>End-to-end encrypted consultations with strict data privacy.</p>
        </div>
        <div class="benefit-card">
          <div class="benefit-icon">📊</div>
          <h4>Pattern tracking</h4>
          <p>We track symptom patterns over time, not just single episodes.</p>
        </div>
        <div class="benefit-card">
          <div class="benefit-icon">🩺</div>
          <h4>Doctor continuity</h4>
          <p>Same doctor follows your case through the entire care journey.</p>
        </div>
        <div class="benefit-card">
          <div class="benefit-icon">📱</div>
          <h4>Easy follow-ups</h4>
          <p>Secure chat and scheduled check-ins without rebooking fees.</p>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="final-cta-section panel">
      <div class="cta-content">
        <p class="eyebrow">Ready to start?</p>
        <h2>Begin your chronic care journey today.</h2>
        <p>Book a consultation now, or chat with us on WhatsApp to see if your condition fits our chronic-care pathway.</p>
      </div>
      <div class="cta-actions">
        <a class="primary home-action" href="/login" (click)="openAuthOverlay($event)">
          <span class="btn-icon">→</span>
          Book consultation
        </a>
        <a class="whatsapp-action" [href]="whatsappLink" target="_blank" rel="noopener">
          <span class="btn-icon">💬</span>
          Chat on WhatsApp
        </a>
      </div>
    </section>
  `
})
export class HomeFinalCtaSectionComponent {
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
