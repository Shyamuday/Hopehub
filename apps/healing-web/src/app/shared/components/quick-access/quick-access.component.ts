import { Component, inject } from '@angular/core';
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

  openChatTeaser(): void {
    this.groupChatTeaser.requestOpen();
  }
}
