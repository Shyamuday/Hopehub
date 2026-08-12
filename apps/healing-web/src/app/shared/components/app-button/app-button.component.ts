import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

type AppButtonType = 'button' | 'submit' | 'reset';
type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'link';
type AppButtonSize = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  template: `
    <ng-template #buttonContent>
      @if (icon && !loading) {
        <span class="app-button__icon" aria-hidden="true">{{ icon }}</span>
      }
      <span class="app-button__content"><ng-content /></span>
      @if (trailingIcon) {
        <span class="app-button__icon" aria-hidden="true">{{ trailingIcon }}</span>
      }
    </ng-template>

    @if (normalizedRouterLink()) {
      <a
        class="app-button"
        [class.app-button--secondary]="variant === 'secondary'"
        [class.app-button--outline]="variant === 'outline'"
        [class.app-button--ghost]="variant === 'ghost'"
        [class.app-button--danger]="variant === 'danger'"
        [class.app-button--link]="variant === 'link'"
        [class.app-button--xs]="size === 'xs'"
        [class.app-button--sm]="size === 'sm'"
        [class.app-button--lg]="size === 'lg'"
        [class.app-button--block]="block"
        [class.app-button--pill]="pill"
        [routerLink]="normalizedRouterLink()"
        [queryParams]="queryParams || null"
        [fragment]="fragment || undefined"
        [attr.aria-label]="ariaLabel || null"
      >
        <ng-container [ngTemplateOutlet]="buttonContent" />
      </a>
    } @else if (href) {
      <a
        class="app-button"
        [class.app-button--secondary]="variant === 'secondary'"
        [class.app-button--outline]="variant === 'outline'"
        [class.app-button--ghost]="variant === 'ghost'"
        [class.app-button--danger]="variant === 'danger'"
        [class.app-button--link]="variant === 'link'"
        [class.app-button--xs]="size === 'xs'"
        [class.app-button--sm]="size === 'sm'"
        [class.app-button--lg]="size === 'lg'"
        [class.app-button--block]="block"
        [class.app-button--pill]="pill"
        [attr.href]="disabled ? null : href"
        [attr.target]="target || null"
        [attr.rel]="rel || null"
        [attr.aria-label]="ariaLabel || null"
        [attr.aria-disabled]="disabled || null"
      >
        <ng-container [ngTemplateOutlet]="buttonContent" />
      </a>
    } @else {
      <button
        class="app-button"
        [class.app-button--secondary]="variant === 'secondary'"
        [class.app-button--outline]="variant === 'outline'"
        [class.app-button--ghost]="variant === 'ghost'"
        [class.app-button--danger]="variant === 'danger'"
        [class.app-button--link]="variant === 'link'"
        [class.app-button--xs]="size === 'xs'"
        [class.app-button--sm]="size === 'sm'"
        [class.app-button--lg]="size === 'lg'"
        [class.app-button--block]="block"
        [class.app-button--pill]="pill"
        [attr.type]="type"
        [attr.aria-label]="ariaLabel || null"
        [disabled]="disabled || loading"
      >
        @if (loading) {
          <span class="app-button__spinner" aria-hidden="true"></span>
        }
        <ng-container [ngTemplateOutlet]="buttonContent" />
      </button>
    }
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
        border-radius: var(--hope-radius-md, 0.625rem);
        background: var(--brand-primary, var(--color-primary-600, #059669));
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        font-size: var(--hope-font-size-sm, 0.875rem);
        font-weight: 650;
        line-height: 1.25;
        padding: 0.68rem 1rem;
        text-align: center;
        text-decoration: none;
        transition:
          background-color 150ms ease,
          border-color 150ms ease,
          box-shadow 150ms ease,
          color 150ms ease,
          transform 150ms ease;
      }

      .app-button:hover:not(:disabled) {
        background: var(--brand-primary-dark, var(--color-primary-700, #047857));
        box-shadow: 0 10px 24px rgba(5, 150, 105, 0.18);
        transform: translateY(-1px);
      }

      .app-button:focus-visible {
        outline: 3px solid var(--hope-field-focus-ring, rgba(16, 185, 129, 0.18));
        outline-offset: 2px;
      }

      .app-button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .app-button--secondary {
        border: 1px solid var(--hope-chip-border, rgba(16, 185, 129, 0.18));
        background: var(--brand-primary-light, #ecfdf5);
        color: var(--brand-primary, #047857);
      }

      .app-button--outline {
        border: 1px solid var(--hope-field-border, rgba(148, 163, 184, 0.35));
        background: #ffffff;
        color: var(--brand-primary, #047857);
      }

      .app-button--ghost {
        background: transparent;
        color: var(--brand-primary, #047857);
      }

      .app-button--danger {
        background: #dc2626;
      }

      .app-button--link {
        min-height: auto;
        background: transparent;
        color: var(--brand-primary, #047857);
        padding: 0;
      }

      .app-button--link:hover:not(:disabled) {
        background: transparent;
        box-shadow: none;
        text-decoration: underline;
        text-underline-offset: 3px;
        transform: none;
      }

      .app-button--xs {
        min-height: 1.9rem;
        border-radius: var(--hope-radius-sm, 0.5rem);
        font-size: var(--hope-font-size-xs, 0.75rem);
        padding: 0.35rem 0.6rem;
      }

      .app-button--sm {
        min-height: 2.25rem;
        border-radius: var(--hope-radius-sm, 0.5rem);
        font-size: var(--hope-font-size-sm, 0.875rem);
        padding: 0.55rem 0.8rem;
      }

      .app-button--lg {
        min-height: 3rem;
        font-size: var(--hope-font-size-lg, 1.0625rem);
        padding: 0.9rem 1.25rem;
      }

      .app-button--block {
        width: 100%;
      }

      .app-button--pill {
        border-radius: 999px;
      }

      .app-button__icon {
        display: inline-flex;
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
  @Input() icon = '';
  @Input() trailingIcon = '';
  @Input() ariaLabel = '';
  @Input() routerLink: string | readonly string[] | null = null;
  @Input() queryParams: Record<string, unknown> | null = null;
  @Input() fragment = '';
  @Input() href = '';
  @Input() target = '';
  @Input() rel = '';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) block = false;
  @Input({ transform: booleanAttribute }) pill = false;

  normalizedRouterLink(): string | string[] | null {
    const link = this.routerLink;
    if (!link || typeof link === 'string') return link;
    return [...link];
  }
}
