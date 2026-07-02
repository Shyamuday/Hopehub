import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { APP_OVERLAY_DATA, APP_OVERLAY_REF } from '../overlay.tokens';
import { AppOverlayRef } from '../overlay.service';

type AuthStatusOverlayData = {
  state: 'loading' | 'success' | 'error';
  label: string;
  message: string;
};

@Component({
  selector: 'app-auth-status-overlay',
  imports: [CommonModule],
  templateUrl: './auth-status-overlay.component.html'
})
export class AuthStatusOverlayComponent {
  readonly data = inject(APP_OVERLAY_DATA) as AuthStatusOverlayData;
  readonly overlayRef = inject(APP_OVERLAY_REF) as AppOverlayRef;
}
