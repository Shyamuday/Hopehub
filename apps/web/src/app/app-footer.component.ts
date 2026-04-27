import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="app-footer">
      <div>
        <strong>Betelgeuse Clinic</strong>
        <p>Doctor-led online consultations under one trusted clinic brand.</p>
      </div>

      <div class="footer-links">
        <a href="/about">About us</a>
        <a href="/treatments">Treatments</a>
        <a href="/faq">FAQ</a>
        <a href="/contact">Contact</a>
        <a href="/privacy-terms">Privacy / Terms</a>
        <a href="/safety">Safety</a>
        <a href="#login-card">Book consultation</a>
        <a [href]="whatsappLink" target="_blank" rel="noopener">WhatsApp support</a>
      </div>
    </footer>
  `
})
export class AppFooterComponent {
  @Input() whatsappLink = '';
}
