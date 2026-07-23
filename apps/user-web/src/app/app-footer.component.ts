import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FOOTER_CONTENT } from './core/constants/footer-content.constants';
import { PUBLIC_SITE_BRAND } from './core/constants/public-site-content.constants';
import {
  PublicConfigService,
  type PublicFooterContact,
} from './core/services/public-config.service';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-footer',
  templateUrl: './app-footer.component.html',
  styleUrl: './app-footer.component.scss',
})
export class AppFooterComponent implements OnInit {
  @Input() whatsappLink = '';

  readonly brand = PUBLIC_SITE_BRAND;
  readonly footer = FOOTER_CONTENT;
  readonly contact = signal<PublicFooterContact | null>(null);

  private readonly configSvc = inject(PublicConfigService);
  private readonly overlayService = inject(AppOverlayService);

  ngOnInit() {
    void this.configSvc.get().then((cfg) => this.contact.set(this.configSvc.footerContact(cfg)));
  }

  openAuthOverlay(event: Event) {
    event.preventDefault();
    this.overlayService.open(AuthFormOverlayComponent, {
      width: '440px',
      panelClass: 'app-overlay-panel',
    });
  }
}
