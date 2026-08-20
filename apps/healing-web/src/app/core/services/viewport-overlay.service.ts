import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ViewportOverlayService {
  private readonly document = inject(DOCUMENT);
  private readonly activeOwners = new Set<string>();
  readonly activeCount = signal(0);

  acquire(owner: string): void {
    if (!owner || this.activeOwners.has(owner)) return;
    this.activeOwners.add(owner);
    this.sync();
  }

  release(owner: string): void {
    if (!this.activeOwners.delete(owner)) return;
    this.sync();
  }

  private sync(): void {
    this.activeCount.set(this.activeOwners.size);
    this.document.body?.classList.toggle('hope-overlay-open', this.activeOwners.size > 0);
  }
}
