import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ConsumerSelectionRailOption = {
  value: string;
  label: string;
  description?: string;
  meta?: string;
  icon?: string;
};

@Component({
  selector: 'app-consumer-selection-rail',
  standalone: true,
  templateUrl: './consumer-selection-rail.component.html',
  styleUrl: './consumer-selection-rail.component.scss',
})
export class ConsumerSelectionRailComponent {
  @Input() options: ConsumerSelectionRailOption[] = [];
  @Input() selected = '';
  @Input() ariaLabel = 'Choose an option';
  @Output() selectedChange = new EventEmitter<string>();

  choose(value: string): void {
    this.selectedChange.emit(value);
  }
}
