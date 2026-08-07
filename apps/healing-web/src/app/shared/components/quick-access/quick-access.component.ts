import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_CONSTANTS } from '../../../core';
import { GroupChatTeaserService } from '../../../core/services';

@Component({
  selector: 'app-quick-access',
  standalone: true,
  templateUrl: './quick-access.component.html',
  styleUrl: './quick-access.component.scss',
})
export class QuickAccessComponent {
  readonly APP_CONSTANTS = APP_CONSTANTS;
  private readonly groupChatTeaser = inject(GroupChatTeaserService);
  private readonly router = inject(Router);
  readonly unreadCount = this.groupChatTeaser.unreadCount;

  openChatTeaser(): void {
    this.groupChatTeaser.requestOpen();
    const currentPath = this.router.url.split('?')[0].split('#')[0];
    if (currentPath !== '/') {
      void this.router.navigate(['/']);
    }
  }
}
