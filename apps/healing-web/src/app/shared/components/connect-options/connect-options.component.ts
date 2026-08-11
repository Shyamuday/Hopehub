import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ConnectOptionMode = 'chat' | 'voice' | 'video' | 'book';

@Component({
  selector: 'app-connect-options',
  standalone: true,
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

  readonly options: Array<{
    mode: ConnectOptionMode;
    label: string;
    icon: string;
    description: string;
  }> = [
    { mode: 'chat', label: 'Chat', icon: '💬', description: 'Private text support' },
    { mode: 'voice', label: 'Voice', icon: '🎧', description: 'Speak without camera' },
    { mode: 'video', label: 'Video', icon: '🎥', description: 'Face-to-face support' },
    { mode: 'book', label: 'Book slot', icon: '📅', description: 'Choose a time' },
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
    this.selected.emit(mode);
  }
}
