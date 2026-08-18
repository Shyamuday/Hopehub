import { booleanAttribute, Component, Input } from '@angular/core';
import { AppButtonComponent } from './app-button.component';

/** A consistent save/apply action for editable admin settings. */
@Component({
  selector: 'app-apply-button',
  standalone: true,
  imports: [AppButtonComponent],
  template: `
    <app-button [disabled]="disabled" [loading]="loading" [size]="size">
      {{ loading ? pendingLabel : label }}
    </app-button>
  `,
})
export class AppApplyButtonComponent {
  @Input() label = 'Save changes';
  @Input() pendingLabel = 'Saving…';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) loading = false;
}
