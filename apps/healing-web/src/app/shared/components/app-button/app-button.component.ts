import { booleanAttribute, Component, Input } from '@angular/core';

type AppButtonType = 'button' | 'submit' | 'reset';
type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type AppButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      class="app-button"
      [class.app-button--secondary]="variant === 'secondary'"
      [class.app-button--outline]="variant === 'outline'"
      [class.app-button--ghost]="variant === 'ghost'"
      [class.app-button--danger]="variant === 'danger'"
      [class.app-button--sm]="size === 'sm'"
      [class.app-button--lg]="size === 'lg'"
      [class.app-button--block]="block"
      [attr.type]="type"
      [disabled]="disabled || loading"
    >
      @if (loading) {
        <span class="app-button__spinner" aria-hidden="true"></span>
      }
      <span class="app-button__content"><ng-content /></span>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      :host(.app-button-host--block) {
        display: block;
      }

      .app-button {
        display: inline-flex;
        min-height: 2.5rem;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        border: 0;
        border-radius: 0.5rem;
        background: var(--color-primary-600, #2563eb);
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        font-size: 0.875rem;
        font-weight: 700;
        line-height: 1.2;
        padding: 0.7rem 1rem;
        text-align: center;
        transition:
          background-color 150ms ease,
          border-color 150ms ease,
          box-shadow 150ms ease,
          color 150ms ease;
      }

      .app-button:hover:not(:disabled) {
        background: var(--color-primary-700, #1d4ed8);
        box-shadow: 0 10px 24px rgba(37, 99, 235, 0.18);
      }

      .app-button:focus-visible {
        outline: 3px solid rgba(37, 99, 235, 0.24);
        outline-offset: 2px;
      }

      .app-button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .app-button--secondary {
        border: 1px solid rgba(37, 99, 235, 0.2);
        background: #eff6ff;
        color: var(--color-primary-700, #1d4ed8);
      }

      .app-button--outline {
        border: 1px solid rgba(37, 99, 235, 0.35);
        background: #ffffff;
        color: var(--color-primary-700, #1d4ed8);
      }

      .app-button--ghost {
        background: transparent;
        color: var(--color-primary-700, #1d4ed8);
      }

      .app-button--danger {
        background: #dc2626;
      }

      .app-button--sm {
        min-height: 2.25rem;
        border-radius: 0.45rem;
        font-size: 0.82rem;
        padding: 0.55rem 0.8rem;
      }

      .app-button--lg {
        min-height: 3rem;
        font-size: 1rem;
        padding: 0.9rem 1.25rem;
      }

      .app-button--block {
        width: 100%;
      }

      .app-button__spinner {
        width: 1rem;
        height: 1rem;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 999px;
        animation: app-button-spin 700ms linear infinite;
      }

      @keyframes app-button-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
  host: {
    '[class.app-button-host--block]': 'block',
  },
})
export class AppButtonComponent {
  @Input() type: AppButtonType = 'button';
  @Input() variant: AppButtonVariant = 'primary';
  @Input() size: AppButtonSize = 'md';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) block = false;
}
