import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GroupChatTeaserService {
  private readonly openRequestedSubject = new Subject<void>();
  private pendingOpen = false;

  readonly openRequested$ = this.openRequestedSubject.asObservable();
  readonly unreadCount = signal(0);

  requestOpen(): void {
    this.pendingOpen = true;
    this.openRequestedSubject.next();
  }

  consumePendingOpen(): boolean {
    const pending = this.pendingOpen;
    this.pendingOpen = false;
    return pending;
  }

  incrementUnread(): void {
    this.unreadCount.update((count) => Math.min(count + 1, 99));
  }

  clearUnread(): void {
    this.unreadCount.set(0);
  }
}
