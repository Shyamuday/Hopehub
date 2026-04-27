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
        <a href="#login-card">Book consultation</a>
        <a [href]="whatsappLink" target="_blank" rel="noopener">WhatsApp support</a>
      </div>
    </footer>
  `
})
export class AppFooterComponent {
  @Input() whatsappLink = '';
}
