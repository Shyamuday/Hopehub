import { Injectable } from '@angular/core';
import {
  PROMO_POPUP_COOLDOWN_MS,
  PROMO_POPUP_STORAGE_KEY
} from '../constants/promo-popup.constants';

@Injectable({ providedIn: 'root' })
export class PromoPopupService {
  canShow(): boolean {
    if (typeof localStorage === 'undefined') return false;

    const raw = localStorage.getItem(PROMO_POPUP_STORAGE_KEY);
    if (!raw) return true;

    const shownAt = Number(raw);
    if (!Number.isFinite(shownAt)) return true;

    return Date.now() - shownAt >= PROMO_POPUP_COOLDOWN_MS;
  }

  markShown() {
    localStorage.setItem(PROMO_POPUP_STORAGE_KEY, String(Date.now()));
  }
}
