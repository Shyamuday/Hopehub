import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    @if (open) {
      <div class="modal-backdrop" (mousedown)="onBackdrop($event)">
        <section
          class="modal-card"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
        >
          <header>
            <div>
              @if (eyebrow) {
                <small>{{ eyebrow }}</small>
              }
              <h2 [id]="titleId">{{ title }}</h2>
            </div>
            <button type="button" aria-label="Close" (click)="closed.emit()">×</button>
          </header>
          <div class="modal-body"><ng-content /></div>
        </section>
      </div>
    }
  `,
  styles: [
    `
      .modal-backdrop {
        align-items: flex-end;
        background: rgba(15, 23, 42, 0.52);
        display: flex;
        inset: 0;
        justify-content: center;
        padding: 1rem;
        position: fixed;
        z-index: 1000;
      }

      .modal-card {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        max-height: min(88vh, 46rem);
        max-width: 34rem;
        overflow: auto;
        width: 100%;
      }

      header {
        align-items: center;
        border-bottom: 1px solid var(--color-border);
        display: flex;
        justify-content: space-between;
        padding: 0.9rem 1rem;
        position: sticky;
        top: 0;
        background: var(--color-surface);
        z-index: 1;
      }

      h2 {
        color: var(--color-text);
        font-size: var(--text-lg);
        margin: 0;
      }

      small {
        color: var(--color-brand);
        display: block;
        font-size: var(--text-xs);
        font-weight: 800;
        margin-bottom: 0.15rem;
        text-transform: uppercase;
      }

      header button {
        align-items: center;
        background: var(--color-surface-muted);
        border: 1px solid var(--color-border);
        border-radius: 50%;
        color: var(--color-text-secondary);
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-size: 1.3rem;
        height: var(--touch-min);
        justify-content: center;
        padding: 0;
        width: var(--touch-min);
      }

      .modal-body {
        padding: 1rem;
      }

      @media (min-width: 640px) {
        .modal-backdrop {
          align-items: center;
        }
      }

      @media (max-width: 639px) {
        .modal-backdrop {
          padding: 0;
        }

        .modal-card {
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          max-height: 92vh;
          max-width: none;
        }
      }
    `,
  ],
})
export class AppModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() eyebrow = '';
  @Output() readonly closed = new EventEmitter<void>();

  readonly titleId = `app-modal-title-${Math.random().toString(36).slice(2)}`;

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.open) this.closed.emit();
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }
}
