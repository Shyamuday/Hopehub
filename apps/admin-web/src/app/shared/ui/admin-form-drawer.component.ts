import { DOCUMENT } from '@angular/common';
import { Component, HostListener, computed, effect, inject, input, output } from '@angular/core';

export type AdminFormStep = {
  id: string;
  label: string;
};

@Component({
  selector: 'app-admin-form-drawer',
  standalone: true,
  template: `
    @if (open()) {
      <button
        type="button"
        class="form-drawer__backdrop"
        aria-label="Close form"
        (click)="closed.emit()"
      ></button>
      <aside class="form-drawer" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
        <header class="form-drawer__header">
          <div>
            <p>{{ progressLabel() }}</p>
            <h2 [id]="titleId">{{ title() }}</h2>
            @if (description()) {
              <span>{{ description() }}</span>
            }
          </div>
          <button
            type="button"
            class="form-drawer__close"
            aria-label="Close"
            (click)="closed.emit()"
          >
            ×
          </button>
        </header>

        <div class="form-drawer__progress" aria-hidden="true">
          <span [style.width.%]="progressPercent()"></span>
        </div>

        <ol class="form-drawer__steps" aria-label="Form progress">
          @for (step of steps(); track step.id; let index = $index) {
            <li [class.active]="index === currentStep()" [class.done]="index < currentStep()">
              <i>{{ index < currentStep() ? '✓' : index + 1 }}</i>
              <span>{{ step.label }}</span>
            </li>
          }
        </ol>

        <div class="form-drawer__body">
          <ng-content />
        </div>

        <footer class="form-drawer__footer">
          @if (currentStep() > 0) {
            <button
              type="button"
              class="form-drawer__secondary"
              [disabled]="busy()"
              (click)="previous.emit()"
            >
              Back
            </button>
          } @else {
            <button
              type="button"
              class="form-drawer__secondary"
              [disabled]="busy()"
              (click)="closed.emit()"
            >
              Cancel
            </button>
          }
          @if (isLastStep()) {
            <button
              type="button"
              class="form-drawer__primary"
              [disabled]="busy() || nextDisabled()"
              (click)="submitted.emit()"
            >
              {{ busy() ? 'Saving…' : submitLabel() }}
            </button>
          } @else {
            <button
              type="button"
              class="form-drawer__primary"
              [disabled]="busy() || nextDisabled()"
              (click)="next.emit()"
            >
              Continue
            </button>
          }
        </footer>
      </aside>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
    .form-drawer__backdrop {
      position: fixed;
      inset: 0;
      z-index: 190;
      border: 0;
      background: rgba(15, 23, 42, 0.48);
      backdrop-filter: blur(2px);
    }
    .form-drawer {
      position: fixed;
      z-index: 200;
      inset: 0 0 0 auto;
      display: grid;
      grid-template-rows: auto auto auto minmax(0, 1fr) auto;
      width: min(36rem, 94vw);
      background: #fff;
      color: #0f172a;
      box-shadow: -18px 0 48px rgba(15, 23, 42, 0.2);
      animation: drawer-in 180ms ease-out;
    }
    .form-drawer__header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.1rem 1.25rem 0.85rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .form-drawer__header p,
    .form-drawer__header h2,
    .form-drawer__header span {
      margin: 0;
    }
    .form-drawer__header p {
      color: #0f766e;
      font-size: 0.68rem;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .form-drawer__header h2 {
      margin-top: 0.15rem;
      font-size: 1.2rem;
    }
    .form-drawer__header span {
      display: block;
      margin-top: 0.25rem;
      color: #64748b;
      font-size: 0.8rem;
      line-height: 1.4;
    }
    .form-drawer__close {
      flex: 0 0 auto;
      width: 2.4rem;
      height: 2.4rem;
      border: 0;
      border-radius: 10px;
      background: #f1f5f9;
      color: #334155;
      font-size: 1.35rem;
    }
    .form-drawer__progress {
      height: 3px;
      background: #e2e8f0;
    }
    .form-drawer__progress span {
      display: block;
      height: 100%;
      background: #0f766e;
      transition: width 160ms ease;
    }
    .form-drawer__steps {
      display: flex;
      gap: 0.4rem;
      margin: 0;
      padding: 0.75rem 1.25rem;
      overflow-x: auto;
      border-bottom: 1px solid #f1f5f9;
      list-style: none;
    }
    .form-drawer__steps li {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      flex: 0 0 auto;
      color: #94a3b8;
      font-size: 0.7rem;
      font-weight: 700;
    }
    .form-drawer__steps i {
      display: inline-grid;
      width: 1.35rem;
      height: 1.35rem;
      place-items: center;
      border-radius: 999px;
      background: #e2e8f0;
      color: #64748b;
      font-size: 0.65rem;
      font-style: normal;
    }
    .form-drawer__steps li.active {
      color: #0f172a;
    }
    .form-drawer__steps li.active i {
      background: #0f766e;
      color: #fff;
    }
    .form-drawer__steps li.done i {
      background: #ccfbf1;
      color: #0f766e;
    }
    .form-drawer__body {
      overflow-y: auto;
      padding: 1.1rem 1.25rem 1.5rem;
    }
    .form-drawer__footer {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.85rem 1.25rem calc(0.85rem + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid #e2e8f0;
      background: #fff;
    }
    .form-drawer__footer button {
      min-height: 2.75rem;
      border-radius: 10px;
      padding: 0.65rem 1rem;
      font: inherit;
      font-weight: 800;
    }
    .form-drawer__secondary {
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #334155;
    }
    .form-drawer__primary {
      min-width: 8rem;
      border: 0;
      background: #0f766e;
      color: #fff;
    }
    .form-drawer__footer button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    @keyframes drawer-in {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }
    @media (max-width: 640px) {
      .form-drawer {
        width: 100%;
      }
      .form-drawer__header {
        padding-top: calc(0.9rem + env(safe-area-inset-top, 0px));
      }
      .form-drawer__steps li span {
        display: none;
      }
      .form-drawer__steps {
        justify-content: center;
      }
      .form-drawer__body {
        padding: 1rem;
      }
      .form-drawer__footer {
        padding-inline: 1rem;
      }
      .form-drawer__footer button {
        flex: 1;
      }
    }
  `,
})
export class AdminFormDrawerComponent {
  private readonly document = inject(DOCUMENT);
  readonly open = input(false);
  readonly title = input('Edit');
  readonly description = input('');
  readonly steps = input<readonly AdminFormStep[]>([]);
  readonly currentStep = input(0);
  readonly busy = input(false);
  readonly nextDisabled = input(false);
  readonly submitLabel = input('Save changes');

  readonly closed = output<void>();
  readonly previous = output<void>();
  readonly next = output<void>();
  readonly submitted = output<void>();

  readonly titleId = `admin-form-drawer-${Math.random().toString(36).slice(2)}`;
  readonly isLastStep = computed(() => this.currentStep() >= this.steps().length - 1);
  readonly progressPercent = computed(() =>
    this.steps().length ? ((this.currentStep() + 1) / this.steps().length) * 100 : 100,
  );
  readonly progressLabel = computed(
    () =>
      `Step ${Math.min(this.currentStep() + 1, this.steps().length || 1)} of ${this.steps().length || 1}`,
  );

  private readonly lockPageScroll = effect((onCleanup) => {
    if (!this.open()) return;
    const previousOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
    onCleanup(() => (this.document.body.style.overflow = previousOverflow));
  });

  @HostListener('document:keydown.escape')
  closeOnEscape() {
    if (this.open() && !this.busy()) this.closed.emit();
  }
}
