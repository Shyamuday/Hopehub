import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CONSUMER_ROUTES } from '../../../core/constants/consumer-routes.constants';
import type { ConnectOptionMode } from '../connect-options/connect-options.component';

@Component({
  selector: 'app-connect-fallback-panel',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './connect-fallback-panel.component.html',
  styleUrl: './connect-fallback-panel.component.scss',
})
export class ConnectFallbackPanelComponent {
  readonly ROUTES = CONSUMER_ROUTES;

  @Input() title = 'No one is live right now';
  @Input() message =
    'You can still book the nearest slot, see similar care-team members, or join the open support chat.';
  @Input() bookQueryParams: Record<string, unknown> = {};
  @Input() careTeamQueryParams: Record<string, unknown> = {};
  @Input() showTryModes = true;
  @Input() compact = false;

  @Output() tryMode = new EventEmitter<Exclude<ConnectOptionMode, 'book'>>();
  @Output() dismissed = new EventEmitter<void>();

  readonly modes: Array<{ mode: Exclude<ConnectOptionMode, 'book'>; label: string; icon: string }> =
    [
      { mode: 'chat', label: 'Try chat', icon: '💬' },
      { mode: 'voice', label: 'Try voice', icon: '🎧' },
      { mode: 'video', label: 'Try video', icon: '🎥' },
    ];
}
