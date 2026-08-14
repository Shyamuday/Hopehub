import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-admin-confirm-dialog',
  standalone: true,
  template: `
    @if (open()) {
      <button
        class="backdrop"
        type="button"
        aria-label="Cancel"
        (click)="cancelled.emit()"
      ></button>
      <section
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
      >
        <div>
          <p>{{ eyebrow() }}</p>
          <h2 id="admin-confirm-title">{{ title() }}</h2>
          <span>{{ message() }}</span>
        </div>
        <footer>
          <button type="button" (click)="cancelled.emit()" [disabled]="busy()">Cancel</button>
          <button type="button" class="confirm" (click)="confirmed.emit()" [disabled]="busy()">
            {{ busy() ? 'Working…' : confirmLabel() }}
          </button>
        </footer>
      </section>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .backdrop {
      position: fixed;
      z-index: 290;
      inset: 0;
      border: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(2px);
    }
    .dialog {
      position: fixed;
      z-index: 300;
      top: 50%;
      left: 50%;
      width: min(28rem, calc(100vw - 2rem));
      transform: translate(-50%, -50%);
      border-radius: 16px;
      background: #fff;
      padding: 1.1rem;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.3);
    }
    p,
    h2,
    span {
      margin: 0;
    }
    p {
      color: #b45309;
      font-size: 0.68rem;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    h2 {
      margin-top: 0.2rem;
      color: #0f172a;
      font-size: 1.1rem;
    }
    span {
      display: block;
      margin-top: 0.4rem;
      color: #64748b;
      font-size: 0.84rem;
      line-height: 1.5;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.65rem;
      margin-top: 1rem;
    }
    button {
      min-height: 2.65rem;
      border: 1px solid #cbd5e1;
      border-radius: 9px;
      background: #fff;
      padding: 0.55rem 0.85rem;
      color: #334155;
      font: inherit;
      font-weight: 800;
    }
    .confirm {
      border-color: #b91c1c;
      background: #b91c1c;
      color: #fff;
    }
    button:disabled {
      opacity: 0.55;
    }
    @media (max-width: 480px) {
      footer {
        flex-direction: column-reverse;
      }
      footer button {
        width: 100%;
      }
    }
  `,
})
export class AdminConfirmDialogComponent {
  readonly open = input(false);
  readonly eyebrow = input('Please confirm');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
