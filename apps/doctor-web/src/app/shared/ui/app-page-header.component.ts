import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="app-page-header">
      <div>
        @if (eyebrow) {
          <p class="app-page-header__eyebrow">{{ eyebrow }}</p>
        }
        <h1>{{ title }}</h1>
        @if (description) {
          <p class="app-page-header__description">{{ description }}</p>
        }
      </div>
      <div class="app-page-header__actions"><ng-content select="[pageAction]" /></div>
    </header>
  `,
  styles: [
    `
      .app-page-header {
        align-items: flex-start;
        display: flex;
        gap: 1rem;
        justify-content: space-between;
        margin-bottom: 1.25rem;
      }
      h1 {
        color: var(--color-text);
        font-size: clamp(1.4rem, 2.5vw, 1.85rem);
        font-weight: 600;
        letter-spacing: -0.02em;
        margin: 0;
      }
      .app-page-header__eyebrow {
        color: var(--color-brand);
        font-size: var(--text-xs);
        font-weight: 700;
        letter-spacing: 0.07em;
        margin: 0 0 0.35rem;
        text-transform: uppercase;
      }
      .app-page-header__description {
        color: var(--color-text-muted);
        font-size: var(--text-sm);
        line-height: var(--leading-relaxed);
        margin: 0.35rem 0 0;
        max-width: 46rem;
      }
      .app-page-header__actions {
        display: flex;
        flex-shrink: 0;
        gap: 0.5rem;
      }
      @media (max-width: 560px) {
        .app-page-header {
          flex-direction: column;
        }
        .app-page-header__actions {
          width: 100%;
        }
      }
    `,
  ],
})
export class AppPageHeaderComponent {
  @Input() title = '';
  @Input() eyebrow = '';
  @Input() description = '';
}
