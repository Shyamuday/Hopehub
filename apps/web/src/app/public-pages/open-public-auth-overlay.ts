import { AuthFormOverlayComponent } from '../auth/auth-form-overlay.component';
import type { AppOverlayService } from '../overlay.service';

export function openPublicAuthOverlay(
  overlay: AppOverlayService,
  event: Event,
  mode: 'patient' | 'staff' = 'patient'
): void {
  event.preventDefault();
  overlay.open(AuthFormOverlayComponent, {
    data: { mode },
    width: '480px',
    panelClass: 'app-overlay-panel'
  });
}
