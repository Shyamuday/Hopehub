import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GroupChatTeaserService {
  private readonly openRequestedSubject = new Subject<void>();
  readonly openRequested$ = this.openRequestedSubject.asObservable();

  requestOpen(): void {
    this.openRequestedSubject.next();
  }
}
