import { Component, Input } from '@angular/core';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="app-footer">
      <div>
        <strong>Vitalis Care and Research Centre</strong>
        <p>Doctor-led online consultations under one trusted clinic brand.</p>
      </div>

      <div class="footer-links">
        <a href="/about">About us</a>
        <a href="/treatments">Treatments</a>
        <a href="/faq">FAQ</a>
        <a href="/contact">Contact</a>
        <a href="/privacy-terms">Privacy / Terms</a>
        <a href="/safety">Safety</a>
        <a href="/login" (click)="openAuthOverlay($event)">Book consultation</a>
        <a [href]="whatsappLink" target="_blank" rel="noopener" aria-label="WhatsApp support">
          <svg class="wa-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M19.05 4.91A9.82 9.82 0 0 0 12.07 2C6.64 2 2.2 6.41 2.2 11.85c0 1.74.45 3.43 1.31 4.93L2 22l5.38-1.41a9.9 9.9 0 0 0 4.69 1.2h.01c5.43 0 9.87-4.41 9.87-9.85a9.75 9.75 0 0 0-2.9-7.03zm-6.98 15.2h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.19.84.85-3.12-.2-.32a8.1 8.1 0 0 1-1.24-4.33c0-4.48 3.68-8.12 8.21-8.12 2.19 0 4.24.85 5.8 2.4a8.04 8.04 0 0 1 2.4 5.73c0 4.48-3.69 8.12-8.15 8.12zm4.45-6.07c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.17a7.1 7.1 0 0 1-1.33-1.65c-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.68 2.57 4.08 3.6.57.25 1.02.4 1.37.52.58.18 1.1.15 1.52.09.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/>
          </svg>
        </a>
      </div>
    </footer>
  `
})
export class AppFooterComponent {
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
