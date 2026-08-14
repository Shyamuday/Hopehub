import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { ProviderConsumerSessionMode } from '@hopehub/contracts';

export type ConnectOptionMode = ProviderConsumerSessionMode | 'book';
type DirectConnectOptionMode = Exclude<ConnectOptionMode, 'book'>;

@Component({
  selector: 'app-connect-options',
  standalone: true,
  templateUrl: './connect-options.component.html',
  styleUrl: './connect-options.component.scss',
})
export class ConnectOptionsComponent {
  @Input() title = 'Connect in the way that feels comfortable';
  @Input() subtitle = 'Chat, voice, and video are available. You can switch during the session.';
  @Input() compact = false;
  @Input() showBook = true;
  @Input() chatAvailable = true;
  @Input() voiceAvailable = true;
  @Input() videoAvailable = true;
  @Input() bookLabel = 'Book slot';

  @Output() selected = new EventEmitter<ConnectOptionMode>();

  connectNow(): void {
    const mode: DirectConnectOptionMode = this.chatAvailable
      ? 'chat'
      : this.voiceAvailable
        ? 'voice'
        : 'video';
    this.selected.emit(mode);
  }
}
