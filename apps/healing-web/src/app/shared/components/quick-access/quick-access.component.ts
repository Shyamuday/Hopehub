import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { APP_CONSTANTS } from '../../../core';
import { CONSUMER_UX_COPY } from '../../../core/constants/consumer-ux-copy.constants';
import { CONSUMER_ROUTES } from '../../../core/constants/consumer-routes.constants';
import { GroupChatTeaserService } from '../../../core/services';

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
  private readonly groupChatTeaser = inject(GroupChatTeaserService);
  private readonly router = inject(Router);
  readonly unreadCount = this.groupChatTeaser.unreadCount;

  openChatTeaser(): void {
    this.groupChatTeaser.requestOpen();
    const currentPath = this.router.url.split('?')[0].split('#')[0];
    if (currentPath !== '/') {
      void this.router.navigate([...CONSUMER_ROUTES.links.home]);
    }
  }
}
