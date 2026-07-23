import { isPlatformBrowser } from '@angular/common';
import { Component, HostListener, PLATFORM_ID, inject, signal } from '@angular/core';

@Component({
  selector: 'app-scroll-to-top',
  standalone: true,
  templateUrl: './scroll-to-top.component.html',
  styleUrl: './scroll-to-top.component.scss',
})
export class ScrollToTopComponent {
  readonly visible = signal(false);
  private readonly platformId = inject(PLATFORM_ID);

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.visible.set(window.scrollY > 500);
  }

  scrollToTop(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
