import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CONSUMER_CONNECT_MODE_META } from '../../../core/constants/consumer-form-options.constants';
import { AppModalComponent } from '../app-modal/app-modal.component';

export type ComfortConnectMode = 'chat' | 'voice' | 'video';

@Component({
  selector: 'app-connect-comfort-dialog',
  standalone: true,
  imports: [AppModalComponent],
  templateUrl: './connect-comfort-dialog.component.html',
  styleUrl: './connect-comfort-dialog.component.scss',
})
export class ConnectComfortDialogComponent {
  @Input() open = false;
  @Input() mode: ComfortConnectMode = 'chat';

  @Output() confirmed = new EventEmitter<ComfortConnectMode>();
  @Output() cancelled = new EventEmitter<void>();

  label(): string {
    return CONSUMER_CONNECT_MODE_META[this.mode].label;
  }

  icon(): string {
    return CONSUMER_CONNECT_MODE_META[this.mode].icon;
  }

  comfortCopy(): string {
    if (this.mode === 'chat') {
      return 'You can write at your own pace. There is no pressure to share everything at once.';
    }
    if (this.mode === 'voice') {
      return 'You can talk without turning on your camera. Choose a place where you feel comfortable.';
    }
    return 'Your camera and microphone will be requested only after you continue. You can end the call whenever you need.';
  }

  confirm(): void {
    this.confirmed.emit(this.mode);
  }
}
