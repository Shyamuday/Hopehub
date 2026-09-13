import { Component, input } from '@angular/core';

export type AdminPageMetric = {
  label: string;
  value: string | number;
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

/** Consistent, responsive heading for dense admin workspaces. */
@Component({
  selector: 'app-admin-page-header',
  standalone: true,
  template: `
    <header class="page-header" [class.page-header--dark]="tone() === 'dark'">
      <div class="page-header__copy">
        @if (eyebrow()) {
          <p class="page-header__eyebrow">{{ eyebrow() }}</p>
        }
        <h1>{{ title() }}</h1>
        @if (description()) {
          <p class="page-header__description">{{ description() }}</p>
        }
      </div>

      @if (metrics().length || actionsVisible()) {
        <div class="page-header__side">
          @if (metrics().length) {
            <dl class="page-header__metrics" aria-label="Page summary">
              @for (metric of metrics(); track metric.label) {
                <div [attr.data-tone]="metric.tone || 'default'">
                  <dt>{{ metric.label }}</dt>
                  <dd>{{ metric.value }}</dd>
                </div>
              }
            </dl>
          }
          <div class="page-header__actions">
            <ng-content select="[adminPageActions]" />
          </div>
        </div>
      }
    </header>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1.25rem;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: var(--radius-md, 14px);
      background:
        radial-gradient(circle at 100% 0, rgba(20, 184, 166, 0.11), transparent 38%),
        var(--color-surface, #fff);
      box-shadow: var(--shadow-sm, 0 8px 24px rgba(15, 23, 42, 0.05));
      padding: 1.1rem 1.2rem;
    }
    .page-header__copy {
      min-width: 0;
      max-width: 58rem;
    }
    .page-header__eyebrow,
    h1,
    .page-header__description,
    dl,
    dd {
      margin: 0;
    }
    .page-header__eyebrow {
      color: var(--color-brand, #0f766e);
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }
    h1 {
      margin-top: 0.18rem;
      color: var(--color-text, #0f172a);
      font-size: clamp(1.35rem, 2.6vw, 1.9rem);
      line-height: 1.2;
    }
    .page-header__description {
      margin-top: 0.38rem;
      color: var(--color-text-secondary, #64748b);
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .page-header__side {
      display: grid;
      justify-items: end;
      gap: 0.7rem;
      min-width: min(100%, 18rem);
    }
    .page-header__metrics {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.45rem;
    }
    .page-header__metrics div {
      display: grid;
      gap: 0.08rem;
      min-width: 6.2rem;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 10px;
      background: rgba(248, 250, 252, 0.88);
      padding: 0.48rem 0.62rem;
    }
    .page-header__metrics div[data-tone='success'] {
      border-color: #a7f3d0;
      background: #ecfdf5;
    }
    .page-header__metrics div[data-tone='warning'] {
      border-color: #fde68a;
      background: #fffbeb;
    }
    .page-header__metrics div[data-tone='danger'] {
      border-color: #fecaca;
      background: #fef2f2;
    }
    dt {
      color: var(--color-text-secondary, #64748b);
      font-size: 0.68rem;
      font-weight: 750;
    }
    dd {
      color: var(--color-text, #0f172a);
      font-size: 1rem;
      font-weight: 900;
    }
    .page-header__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .page-header--dark {
      border-color: rgba(148, 163, 184, 0.2);
      background:
        radial-gradient(circle at 100% 0, rgba(20, 184, 166, 0.16), transparent 40%), #111827;
    }
    .page-header--dark h1 {
      color: #f8fafc;
    }
    .page-header--dark .page-header__description {
      color: #94a3b8;
    }
    .page-header--dark .page-header__metrics div {
      border-color: rgba(148, 163, 184, 0.2);
      background: rgba(255, 255, 255, 0.055);
    }
    .page-header--dark dt {
      color: #94a3b8;
    }
    .page-header--dark dd {
      color: #f8fafc;
    }
    @media (max-width: 760px) {
      .page-header {
        flex-direction: column;
        padding: 0.95rem;
      }
      .page-header__side {
        width: 100%;
        min-width: 0;
        justify-items: stretch;
      }
      .page-header__metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .page-header__metrics div {
        min-width: 0;
      }
      .page-header__actions {
        justify-content: stretch;
      }
      .page-header__actions ::ng-deep > * {
        flex: 1 1 auto;
      }
    }
  `,
})
export class AdminPageHeaderComponent {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly description = input('');
  readonly tone = input<'light' | 'dark'>('light');
  readonly metrics = input<readonly AdminPageMetric[]>([]);
  readonly actionsVisible = input(true);
}
