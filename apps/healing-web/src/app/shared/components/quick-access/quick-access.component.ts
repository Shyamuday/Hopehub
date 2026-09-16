import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../../core';
import { CONSUMER_UX_COPY } from '../../../core/constants/consumer-ux-copy.constants';
import { CONSUMER_ROUTES } from '../../../core/constants/consumer-routes.constants';

@Component({
  selector: 'app-quick-access',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './quick-access.component.html',
  styleUrl: './quick-access.component.scss',
})
export class QuickAccessComponent {
  readonly APP_CONSTANTS = APP_CONSTANTS;
  readonly UX = CONSUMER_UX_COPY;
  readonly ROUTES = CONSUMER_ROUTES;
  // The four-item mobile bar is intentionally paused while the main home actions
  // are being simplified. Keep the switch so it can be restored without markup changes.
  readonly showBottomQuickActions = false;
}
