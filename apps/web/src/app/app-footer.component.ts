import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="app-footer" role="contentinfo">
      <div class="footer-accent-line" aria-hidden="true"></div>

      <div class="footer-inner">
        <div class="footer-main-grid">
          <div class="footer-brand-block">
            <div class="footer-brand-row">
              <div class="footer-brand-mark" aria-hidden="true">VC</div>
              <div class="footer-brand-text">
                <strong class="footer-brand-title">Vitalis Care and Research Centre</strong>
                <p class="footer-brand-tagline">
                  Doctor-led digital consultations with structured intake, secure messaging, prescriptions, and follow-up —
                  all under one trusted clinic brand.
                </p>
              </div>
            </div>
            <p class="footer-brand-detail">
              We focus on chronic and recurring concerns where continuity matters. Your case is reviewed by a qualified
              clinician, not anonymous chatbots. Book online, complete guided intake, pay securely, and stay connected through
              your care journey.
            </p>
            <div class="footer-cta-row">
              <a href="/login" class="footer-btn footer-btn-primary" (click)="openAuthOverlay($event)">
                Book a consultation
              </a>
              @if (whatsappLink) {
              <a
                class="footer-btn footer-btn-whatsapp"
                [href]="whatsappLink"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg class="wa-icon footer-wa" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M19.05 4.91A9.82 9.82 0 0 0 12.07 2C6.64 2 2.2 6.41 2.2 11.85c0 1.74.45 3.43 1.31 4.93L2 22l5.38-1.41a9.9 9.9 0 0 0 4.69 1.2h.01c5.43 0 9.87-4.41 9.87-9.85a9.75 9.75 0 0 0-2.9-7.03zm-6.98 15.2h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.19.84.85-3.12-.2-.32a8.1 8.1 0 0 1-1.24-4.33c0-4.48 3.68-8.12 8.21-8.12 2.19 0 4.24.85 5.8 2.4a8.04 8.04 0 0 1 2.4 5.73c0 4.48-3.69 8.12-8.15 8.12zm4.45-6.07c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.17a7.1 7.1 0 0 1-1.33-1.65c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.68 2.57 4.08 3.6.57.25 1.02.4 1.37.52.58.18 1.1.15 1.52.09.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"
                  />
                </svg>
                Chat on WhatsApp
              </a>
              }
            </div>
          </div>

          <nav class="footer-nav-col" aria-labelledby="footer-nav-explore">
            <h2 id="footer-nav-explore" class="footer-col-heading">Explore</h2>
            <ul class="footer-link-list">
              <li><a routerLink="/about">About us</a></li>
              <li><a routerLink="/treatments">Treatments</a></li>
              <li><a routerLink="/chronic-care">Chronic care</a></li>
              <li><a routerLink="/why-successful">Why Vitalis works</a></li>
              <li><a routerLink="/faq">FAQ</a></li>
            </ul>
          </nav>

          <nav class="footer-nav-col" aria-labelledby="footer-nav-care">
            <h2 id="footer-nav-care" class="footer-col-heading">Care &amp; safety</h2>
            <ul class="footer-link-list">
              <li><a routerLink="/safety">Safety &amp; clarity</a></li>
              <li><a routerLink="/privacy-terms">Privacy &amp; terms</a></li>
              <li><a routerLink="/contact">Contact &amp; support</a></li>
              <li>
                <a href="/login" (click)="openAuthOverlay($event, 'patient')">Patient sign-in</a>
              </li>
            </ul>
          </nav>

          <div class="footer-nav-col footer-contact-card" aria-labelledby="footer-contact-h">
            <h2 id="footer-contact-h" class="footer-col-heading">Clinic hours &amp; help</h2>
            <p class="footer-contact-lead">
              Need help choosing a pathway or completing booking? Reach out — we respond as soon as we can during working
              hours.
            </p>
            <ul class="footer-contact-facts">
              <li>
                <span class="footer-fact-label">Online consultations</span>
                <span class="footer-fact-value">Structured intake → payment → doctor assignment → chat &amp; prescription</span>
              </li>
              <li>
                <span class="footer-fact-label">Support</span>
                <span class="footer-fact-value"
                  >Use <a routerLink="/contact">Contact</a> or WhatsApp for quick questions</span
                >
              </li>
            </ul>
          </div>
        </div>

        <div class="footer-trust-bar" aria-label="Trust highlights">
          <div class="footer-trust-item">
            <span class="footer-trust-icon" aria-hidden="true">◆</span>
            <span><strong>Doctor-led</strong> — every consultation is tied to a registered clinician</span>
          </div>
          <div class="footer-trust-item">
            <span class="footer-trust-icon" aria-hidden="true">◆</span>
            <span><strong>Transparent flow</strong> — fees, intake, and follow-up are clear upfront</span>
          </div>
          <div class="footer-trust-item">
            <span class="footer-trust-icon" aria-hidden="true">◆</span>
            <span><strong>Continuity</strong> — messaging, prescriptions, and reminders in one place</span>
          </div>
        </div>

        <div class="footer-bottom">
          <p class="footer-copy">
            © {{ year }} Vitalis Care and Research Centre. All rights reserved.
            <span class="footer-copy-sep">·</span>
            Digital clinic services are subject to our
            <a routerLink="/privacy-terms">privacy &amp; terms</a>
            and
            <a routerLink="/safety">safety</a>
            pages.
          </p>
          <p class="footer-disclaimer">
            Teleconsultation does not replace emergency care. For urgent or life-threatening symptoms, contact local emergency
            services immediately.
          </p>
        </div>
      </div>
    </footer>
  `
})
export class AppFooterComponent {
  @Input() whatsappLink = '';
  readonly year = new Date().getFullYear();

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
