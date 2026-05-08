import { Component, HostListener, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/** Shown when the document is scrolled to (or near) the bottom; scrolls to top in one click. */
@Component({
  selector: 'app-scroll-to-top',
  imports: [TranslatePipe],
  template: `
    @if (visible()) {
      <button
        type="button"
        class="scroll-to-top-fab"
        (click)="goTop()"
        [attr.aria-label]="'common.backToTopAria' | translate">
        <svg class="scroll-to-top-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
        </svg>
        <span class="scroll-to-top-label">{{ 'common.backToTop' | translate }}</span>
      </button>
    }
  `,
  styles: [
    `
      .scroll-to-top-fab {
        position: fixed;
        left: max(1rem, env(safe-area-inset-left, 0px));
        bottom: max(1rem, env(safe-area-inset-bottom, 0px));
        z-index: 10;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        min-height: 46px;
        padding: 0.55rem 1rem;
        border: none;
        border-radius: 999px;
        font: inherit;
        font-weight: 700;
        font-size: 0.875rem;
        color: #fff;
        background: linear-gradient(135deg, #0f62fe, #174ea6);
        box-shadow: 0 12px 28px rgba(15, 98, 254, 0.35);
        cursor: pointer;
      }

      .scroll-to-top-fab:hover {
        filter: brightness(1.06);
      }

      .scroll-to-top-fab:focus-visible {
        outline: 2px solid #0f62fe;
        outline-offset: 3px;
      }

      .scroll-to-top-icon {
        flex-shrink: 0;
        width: 22px;
        height: 22px;
        display: block;
      }

      @media (max-width: 480px) {
        .scroll-to-top-label {
          max-width: 9rem;
          text-align: left;
          line-height: 1.2;
        }
      }
    `
  ]
})
export class ScrollToTopComponent {
  readonly visible = signal(false);

  @HostListener('window:scroll')
  @HostListener('window:resize')
  updateVisibility(): void {
    const root = document.documentElement;
    const scrollTop = window.scrollY ?? root.scrollTop;
    const viewHeight = window.innerHeight;
    const scrollHeight = root.scrollHeight;
    const distanceFromBottom = scrollHeight - (scrollTop + viewHeight);
    const hasRoomToScroll = scrollHeight > viewHeight + 48;
    const nearBottom = distanceFromBottom <= 120;
    this.visible.set(hasRoomToScroll && nearBottom);
  }

  goTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
