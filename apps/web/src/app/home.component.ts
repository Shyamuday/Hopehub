import { Component } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';

@Component({
  selector: 'app-home',
  imports: [AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="Digital clinic" [whatsappLink]="whatsappLink" />

      <main class="auth-page">
        <div class="home-hero">
          <p class="eyebrow">Vitalis Clinic</p>
          <h1>Doctor-led care for your health concerns.</h1>
          <p class="hero-copy">
            Choose your health concern, complete a short intake, pay securely, and get assigned to our internal doctor panel.
          </p>

          <div class="home-actions">
            <a class="primary home-action" href="/login">Book consultation</a>
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
      </main>

      <app-footer [whatsappLink]="whatsappLink" />

      <a class="whatsapp-float" [href]="whatsappLink" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
        WhatsApp
      </a>
    </section>
  `
})
export class HomeComponent {
  readonly whatsappLink =
    'https://wa.me/919876543210?text=Hi%20Vitalis%20Clinic%2C%20I%20want%20to%20book%20a%20consultation';
}
