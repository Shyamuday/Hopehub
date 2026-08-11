import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';

@Component({
  selector: 'app-selectable-card',
  standalone: true,
  templateUrl: './selectable-card.component.html',
  styleUrl: './selectable-card.component.scss',
})
export class SelectableCardComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() icon = '';
  @Input() meta = '';
  @Input() tone: 'neutral' | 'success' | 'warning' | 'brand' = 'neutral';
  @Input({ transform: booleanAttribute }) selected = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) compact = false;

  @Output() selectedChange = new EventEmitter<void>();
}
