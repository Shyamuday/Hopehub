import { Component } from '@angular/core';

@Component({
  selector: 'app-action-bar',
  standalone: true,
  template: `<div class="action-bar"><ng-content /></div>`,
  styles: [
    `
      :host {
        display: block;
        position: sticky;
        bottom: 0;
        z-index: 5;
      }
      .action-bar {
        background: color-mix(in srgb, var(--color-surface) 94%, transparent);
        border-top: 1px solid var(--color-border);
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
        justify-content: flex-end;
        margin-top: 1.25rem;
        padding: 0.75rem 0 calc(0.75rem + env(safe-area-inset-bottom, 0px));
      }
      @media (max-width: 480px) {
        .action-bar {
          align-items: stretch;
          flex-direction: column-reverse;
        }
      }
    `,
  ],
})
export class AppActionBarComponent {}
