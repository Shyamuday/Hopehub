import { Component, Input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-home-final-cta-section',
  imports: [TranslatePipe],
  template: `
    <!-- Why Choose Us Section -->
    <section class="why-choose-section">
      <div class="section-header">
        <p class="eyebrow">{{ 'home.finalCta.benefitsEyebrow' | translate }}</p>
        <h2 class="section-title">{{ 'home.finalCta.benefitsTitle' | translate }}</h2>
      </div>

      <div class="benefits-grid">
        <div class="benefit-card">
          <div class="benefit-icon">🔒</div>
          <h4>{{ 'home.finalCta.bPrivateTitle' | translate }}</h4>
          <p>{{ 'home.finalCta.bPrivateBody' | translate }}</p>
        </div>
        <div class="benefit-card">
          <div class="benefit-icon">📊</div>
          <h4>{{ 'home.finalCta.bPatternTitle' | translate }}</h4>
          <p>{{ 'home.finalCta.bPatternBody' | translate }}</p>
        </div>
        <div class="benefit-card">
          <div class="benefit-icon">🩺</div>
          <h4>{{ 'home.finalCta.bDoctorTitle' | translate }}</h4>
          <p>{{ 'home.finalCta.bDoctorBody' | translate }}</p>
        </div>
        <div class="benefit-card">
          <div class="benefit-icon">📱</div>
          <h4>{{ 'home.finalCta.bFollowUpsTitle' | translate }}</h4>
          <p>{{ 'home.finalCta.bFollowUpsBody' | translate }}</p>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="final-cta-section panel">
      <div class="cta-content">
        <p class="eyebrow">{{ 'home.finalCta.ctaEyebrow' | translate }}</p>
        <h2>{{ 'home.finalCta.ctaTitle' | translate }}</h2>
        <p>{{ 'home.finalCta.ctaBody' | translate }}</p>
      </div>
      <div class="cta-actions">
        <a
          class="primary home-action"
          href="/login"
          (click)="openAuthOverlay($event)"
          [attr.aria-label]="'home.finalCta.bookConsultAria' | translate">
          <span class="btn-icon">→</span>
          {{ 'home.finalCta.bookConsultation' | translate }}
        </a>
        <a
          class="whatsapp-action"
          [href]="whatsappLink"
          target="_blank"
          rel="noopener"
          [attr.aria-label]="'common.chatWhatsAppAria' | translate">
          <svg class="wa-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M19.05 4.91A9.82 9.82 0 0 0 12.07 2C6.64 2 2.2 6.41 2.2 11.85c0 1.74.45 3.43 1.31 4.93L2 22l5.38-1.41a9.9 9.9 0 0 0 4.69 1.2h.01c5.43 0 9.87-4.41 9.87-9.85a9.75 9.75 0 0 0-2.9-7.03zm-6.98 15.2h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.19.84.85-3.12-.2-.32a8.1 8.1 0 0 1-1.24-4.33c0-4.48 3.68-8.12 8.21-8.12 2.19 0 4.24.85 5.8 2.4a8.04 8.04 0 0 1 2.4 5.73c0 4.48-3.69 8.12-8.15 8.12zm4.45-6.07c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.17a7.1 7.1 0 0 1-1.33-1.65c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.68 2.57 4.08 3.6.57.25 1.02.4 1.37.52.58.18 1.1.15 1.52.09.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/>
          </svg>
        </a>
      </div>
    </section>
  `
})
export class HomeFinalCtaSectionComponent {
  @Input() whatsappLink = '';

  constructor(private readonly overlayService: AppOverlayService) {}

  openAuthOverlay(event: Event, mode: 'patient' | 'staff' = 'patient') {
    event.preventDefault();
    this.overlayService.open(AuthFormOverlayComponent, {
      data: { mode },
      width: '480px',
      panelClass: 'app-overlay-panel'
    });
  }
}
