import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

@Component({
  selector: 'app-tag-input',
  standalone: true,
  template: `
    <div class="tag-input" (click)="entry.focus()">
      @for (item of items(); track item) {
        <span class="tag">
          {{ item }}
          <button type="button" [attr.aria-label]="'Remove ' + item" (click)="remove(item, $event)">
            ×
          </button>
        </span>
      }
      <input
        #entry
        [value]="draft()"
        [attr.aria-label]="ariaLabel"
        [placeholder]="items().length ? 'Add another' : placeholder"
        (input)="draft.set($any($event.target).value)"
        (keydown)="onKeydown($event)"
        (blur)="commitDraft()"
      />
    </div>
    @if (availableSuggestions().length) {
      <div class="suggestions" aria-label="Suggested options">
        @for (suggestion of availableSuggestions(); track suggestion) {
          <button
            type="button"
            (mousedown)="$event.preventDefault()"
            (click)="addSuggestion(suggestion)"
          >
            + {{ suggestion }}
          </button>
        }
      </div>
    }
    <small class="tag-hint">Type an item and press Enter</small>
  `,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      }

      .tag-input {
        align-items: center;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        cursor: text;
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        min-height: var(--touch-min);
        padding: 0.42rem 0.5rem;
        transition:
          border-color 150ms ease,
          box-shadow 150ms ease;
      }

      .tag-input:focus-within {
        border-color: var(--color-brand);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-brand) 14%, transparent);
      }

      .tag {
        align-items: center;
        background: var(--color-brand-soft);
        border: 1px solid var(--color-brand-muted);
        border-radius: var(--radius-pill);
        color: var(--color-brand-dark);
        display: inline-flex;
        font-size: var(--text-xs);
        font-weight: 700;
        gap: 0.25rem;
        line-height: 1.25;
        max-width: 100%;
        padding: 0.28rem 0.35rem 0.28rem 0.55rem;
      }

      .tag button {
        align-items: center;
        background: transparent;
        border: 0;
        border-radius: 50%;
        color: currentColor;
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-size: 1rem;
        height: 1.25rem;
        justify-content: center;
        padding: 0;
        width: 1.25rem;
      }

      input {
        border: 0;
        box-shadow: none;
        flex: 1 1 9rem;
        font: inherit;
        min-height: 2rem;
        min-width: 7rem;
        outline: 0;
        padding: 0.2rem;
      }

      .tag-hint {
        color: var(--color-text-muted);
        display: block;
        font-size: var(--text-xs);
        margin-top: 0.25rem;
      }

      .suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-top: 0.45rem;
      }

      .suggestions button {
        background: var(--color-surface-muted);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-pill);
        color: var(--color-text-muted);
        cursor: pointer;
        font: inherit;
        font-size: var(--text-xs);
        font-weight: 600;
        padding: 0.3rem 0.55rem;
      }

      .suggestions button:hover,
      .suggestions button:focus-visible {
        border-color: var(--color-brand);
        color: var(--color-brand-dark);
        outline: none;
      }
    `,
  ],
})
export class AppTagInputComponent {
  @Input() value = '';
  @Input() placeholder = 'Add an item';
  @Input() ariaLabel = 'Add items';
  @Input() suggestions: readonly string[] = [];
  @Output() readonly valueChange = new EventEmitter<string>();

  readonly draft = signal('');

  items(): string[] {
    return this.value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  availableSuggestions(): string[] {
    const selected = new Set(this.items().map((item) => item.toLocaleLowerCase()));
    return this.suggestions
      .filter((suggestion) => !selected.has(suggestion.toLocaleLowerCase()))
      .slice(0, 8);
  }

  addSuggestion(suggestion: string): void {
    this.emitItems([...this.items(), suggestion]);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commitDraft();
      return;
    }
    if (event.key === 'Backspace' && !this.draft() && this.items().length) {
      this.emitItems(this.items().slice(0, -1));
    }
  }

  commitDraft(): void {
    const candidates = this.draft()
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!candidates.length) return;

    const items = [...this.items()];
    const existing = new Set(items.map((item) => item.toLocaleLowerCase()));
    for (const candidate of candidates) {
      const key = candidate.toLocaleLowerCase();
      if (!existing.has(key)) {
        items.push(candidate);
        existing.add(key);
      }
    }
    this.draft.set('');
    this.emitItems(items);
  }

  remove(item: string, event: Event): void {
    event.stopPropagation();
    this.emitItems(this.items().filter((current) => current !== item));
  }

  private emitItems(items: string[]): void {
    this.value = items.join('\n');
    this.valueChange.emit(this.value);
  }
}
