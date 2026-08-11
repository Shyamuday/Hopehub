import { Component, Input } from '@angular/core';

export type EmptyStateTone = 'neutral' | 'soft' | 'warning' | 'danger';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  @Input() icon = '💛';
  @Input() eyebrow = '';
  @Input() title = 'Nothing here yet';
  @Input() message = '';
  @Input() tone: EmptyStateTone = 'neutral';
  @Input() compact = false;
}
