import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { PromoPopupService } from '../core/services/promo-popup.service';
import { PROMO_POPUP_DELAY_MS } from '../core/constants/promo-popup.constants';
import { AppOverlayService } from '../overlay.service';
import { FreeConsultationPromoComponent } from './free-consultation-promo.component';

@Component({
  selector: 'app-promo-popup-host',
  standalone: true,
  template: ''
})
export class PromoPopupHostComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly promo = inject(PromoPopupService);
  private readonly overlay = inject(AppOverlayService);

  ngOnInit() {
    this.schedulePromo();
  }

  private schedulePromo() {
    if (this.auth.isLoggedIn()) return;
    if (!this.promo.canShow()) return;

    window.setTimeout(() => {
      if (this.auth.isLoggedIn()) return;
      if (!this.promo.canShow()) return;

      this.promo.markShown();
      this.overlay.open(FreeConsultationPromoComponent, {
        width: '460px',
        panelClass: 'app-overlay-panel promo-overlay-panel'
      });
    }, PROMO_POPUP_DELAY_MS);
  }
}
