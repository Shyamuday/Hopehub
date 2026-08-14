import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CONSUMER_ROUTES } from '../../../core/constants/consumer-routes.constants';

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
  @Input() message = 'You can book a time, meet the care team, or join the community chat.';
  @Input() bookQueryParams: Record<string, unknown> = {};
  @Input() careTeamQueryParams: Record<string, unknown> = {};
  @Input() compact = false;

  @Output() dismissed = new EventEmitter<void>();
}
