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
        min-height: 2.75rem;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        border: 0;
        border-radius: 0.9rem;
        background: #4f46e5;
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        font-size: 0.95rem;
        font-weight: 800;
        line-height: 1.2;
        padding: 0.8rem 1.1rem;
        text-align: center;
        transition:
          background-color 150ms ease,
          border-color 150ms ease,
          box-shadow 150ms ease,
          color 150ms ease;
      }

      .app-button:hover:not(:disabled) {
        background: #4338ca;
        box-shadow: 0 10px 24px rgba(79, 70, 229, 0.22);
      }

      .app-button:focus-visible {
        outline: 3px solid rgba(99, 102, 241, 0.28);
        outline-offset: 2px;
      }

      .app-button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .app-button--secondary {
        border: 1px solid #c7d2fe;
        background: #eef2ff;
        color: #4338ca;
      }

      .app-button--outline {
        border: 1px solid #a5b4fc;
        background: #ffffff;
        color: #4f46e5;
      }

      .app-button--ghost {
        background: transparent;
        color: #4f46e5;
      }

      .app-button--danger {
        background: #dc2626;
      }

      .app-button--sm {
        min-height: 2.25rem;
        border-radius: 0.7rem;
        font-size: 0.84rem;
        padding: 0.5rem 0.75rem;
      }

      .app-button--lg {
        min-height: 3.1rem;
        font-size: 1rem;
        padding: 0.95rem 1.3rem;
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
    `
  ],
  host: {
    '[class.app-button-host--block]': 'block'
  }
})
export class AppButtonComponent {
  @Input() type: AppButtonType = 'button';
  @Input() variant: AppButtonVariant = 'primary';
  @Input() size: AppButtonSize = 'md';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) block = false;
}
