import { booleanAttribute, Component, EventEmitter, Input, Output } from '@angular/core';
import { AppButtonComponent } from './app-button.component';

/**
 * A persistent, accessible save prompt for configuration pages. It only exposes
 * a save action while there are local changes, so an admin always knows whether
 * an edit is still only in the browser.
 */
@Component({
  selector: 'app-unsaved-changes-bar',
  standalone: true,
  imports: [AppButtonComponent],
  template: `
    <section
      class="unsaved-changes-bar"
      [class.unsaved-changes-bar--dirty]="dirty"
      aria-live="polite"
    >
      <div>
        <strong>{{ dirty ? dirtyLabel : savedLabel }}</strong>
        <small>{{ dirty ? dirtyHint : savedHint }}</small>
      </div>
      @if (dirty) {
        <div class="unsaved-changes-bar__actions">
          <app-button variant="secondary" size="sm" [disabled]="saving" (click)="discard.emit()">
            {{ discardLabel }}
          </app-button>
          <app-button size="sm" [loading]="saving" (click)="save.emit()">
            {{ saving ? savingLabel : saveLabel }}
          </app-button>
        </div>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .unsaved-changes-bar {
        align-items: center;
        background: color-mix(
          in srgb,
          var(--color-surface, #fff) 94%,
          var(--color-success, #0f766e)
        );
        border: 1px solid
          color-mix(in srgb, var(--color-success, #0f766e) 24%, var(--color-border, #dbe3ee));
        border-radius: var(--radius-md, 12px);
        box-shadow: var(--shadow-sm, 0 2px 8px rgba(15, 23, 42, 0.08));
        display: flex;
        gap: 1rem;
        justify-content: space-between;
        padding: 0.8rem 1rem;
      }
      .unsaved-changes-bar--dirty {
        background: color-mix(
          in srgb,
          var(--color-warning, #d97706) 9%,
          var(--color-surface, #fff)
        );
        border-color: color-mix(
          in srgb,
          var(--color-warning, #d97706) 30%,
          var(--color-border, #dbe3ee)
        );
      }
      .unsaved-changes-bar > div:first-child {
        display: grid;
        gap: 0.12rem;
      }
      strong {
        color: var(--color-text, #0f172a);
      }
      small {
        color: var(--color-text-secondary, #64748b);
        line-height: 1.35;
      }
      .unsaved-changes-bar__actions {
        display: flex;
        flex: 0 0 auto;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      @media (max-width: 640px) {
        .unsaved-changes-bar {
          align-items: stretch;
          flex-direction: column;
        }
        .unsaved-changes-bar__actions > app-button {
          flex: 1;
        }
      }
    `,
  ],
})
export class AppUnsavedChangesBarComponent {
  @Input({ transform: booleanAttribute }) dirty = false;
  @Input({ transform: booleanAttribute }) saving = false;
  @Input() dirtyLabel = 'You have unsaved changes';
  @Input() savedLabel = 'All changes are saved';
  @Input() dirtyHint = 'Save or discard your edits before leaving this screen.';
  @Input() savedHint = 'The values shown here are already live.';
  @Input() saveLabel = 'Save changes';
  @Input() savingLabel = 'Saving…';
  @Input() discardLabel = 'Discard';
  @Output() readonly save = new EventEmitter<void>();
  @Output() readonly discard = new EventEmitter<void>();
}
