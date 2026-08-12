import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <section class="empty-state">
      @if (icon) {
        <span class="empty-state__icon" aria-hidden="true">{{ icon }}</span>
      }
      <h2>{{ title }}</h2>
      @if (description) {
        <p>{{ description }}</p>
      }
      <div class="empty-state__actions"><ng-content /></div>
    </section>
  `,
  styles: [
    `
      .empty-state {
        align-items: center;
        border: 1px dashed var(--color-border-strong);
        border-radius: var(--radius-md);
        color: var(--color-text-muted);
        display: grid;
        justify-items: center;
        padding: 2rem 1rem;
        text-align: center;
      }
      .empty-state__icon {
        font-size: 1.5rem;
        margin-bottom: 0.45rem;
      }
      h2 {
        color: var(--color-text);
        font-size: var(--text-base);
        font-weight: 600;
        margin: 0;
      }
      p {
        font-size: var(--text-sm);
        line-height: var(--leading-relaxed);
        margin: 0.4rem 0 0;
        max-width: 34rem;
      }
      .empty-state__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        justify-content: center;
        margin-top: 1rem;
      }
    `,
  ],
})
export class AppEmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() description = '';
  @Input() icon = '';
}
