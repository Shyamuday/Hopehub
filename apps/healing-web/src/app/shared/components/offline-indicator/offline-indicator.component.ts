import { Component, OnInit, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [],
  templateUrl: './offline-indicator.component.html',
  styleUrl: './offline-indicator.component.scss'
})
export class OfflineIndicatorComponent implements OnInit {
  isOnline = signal(true);
  wasOffline = signal(false);
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.isOnline.set(navigator.onLine);
    }
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    // Listen to online/offline events
    merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).pipe(
      startWith(navigator.onLine),
      takeUntilDestroyed()
    ).subscribe((online: boolean) => {
      if (!online && this.isOnline()) {
        // Just went offline
        this.wasOffline.set(true);
      } else if (online && !this.isOnline() && this.wasOffline()) {
        // Just came back online
        setTimeout(() => {
          this.wasOffline.set(false);
        }, 3000); // Hide "back online" message after 3 seconds
      }

      this.isOnline.set(online);
    });
  }
}