import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CONSUMER_CONNECT_MODE_META } from '../../../core/constants/consumer-form-options.constants';
import { ConnectComfortDialogComponent } from '../connect-comfort-dialog/connect-comfort-dialog.component';

export type ConnectOptionMode = 'chat' | 'voice' | 'video' | 'book';

@Component({
  selector: 'app-connect-options',
  standalone: true,
  imports: [ConnectComfortDialogComponent],
  templateUrl: './connect-options.component.html',
  styleUrl: './connect-options.component.scss',
})
export class ConnectOptionsComponent {
  @Input() title = 'Choose how you want to connect';
  @Input() subtitle = 'Start gently by chat, talk by voice, meet by video, or book a slot.';
  @Input() compact = false;
  @Input() showBook = true;
  @Input() chatAvailable = true;
  @Input() voiceAvailable = true;
  @Input() videoAvailable = true;
  @Input() bookLabel = 'Book slot';

  @Output() selected = new EventEmitter<ConnectOptionMode>();
  readonly pendingMode = signal<ConnectOptionMode | null>(null);

  readonly options: Array<{
    mode: ConnectOptionMode;
    label: string;
    icon: string;
    description: string;
  }> = [
    { mode: 'chat', ...CONSUMER_CONNECT_MODE_META.chat },
    { mode: 'voice', ...CONSUMER_CONNECT_MODE_META.voice },
    { mode: 'video', ...CONSUMER_CONNECT_MODE_META.video },
    { mode: 'book', ...CONSUMER_CONNECT_MODE_META.book },
  ];

  isVisible(mode: ConnectOptionMode): boolean {
    return mode !== 'book' || this.showBook;
  }

  isAvailable(mode: ConnectOptionMode): boolean {
    if (mode === 'chat') return this.chatAvailable;
    if (mode === 'voice') return this.voiceAvailable;
    if (mode === 'video') return this.videoAvailable;
    return true;
  }

  labelFor(mode: ConnectOptionMode, label: string): string {
    return mode === 'book' ? this.bookLabel : label;
  }

  choose(mode: ConnectOptionMode): void {
    if (mode !== 'book') {
      this.pendingMode.set(mode);
      return;
    }
    this.selected.emit(mode);
  }

  confirmChoice(): void {
    const mode = this.pendingMode();
    if (!mode) return;
    this.pendingMode.set(null);
    this.selected.emit(mode);
  }

  cancelChoice(): void {
    this.pendingMode.set(null);
  }
}
