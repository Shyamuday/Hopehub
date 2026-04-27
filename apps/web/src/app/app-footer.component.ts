import { Component, Input } from '@angular/core';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="app-footer">
      <div>
        <strong>Vitalis Clinic</strong>
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
        <a [href]="whatsappLink" target="_blank" rel="noopener">WhatsApp support</a>
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
