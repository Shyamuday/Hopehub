import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AdminMobileLayoutService {
  readonly pageFocus = signal(false);

  setPageFocus(on: boolean) {
    this.pageFocus.set(on);
  }

  clearPageFocus() {
    this.pageFocus.set(false);
  }
}
