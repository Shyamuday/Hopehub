import { Component, EventEmitter, Input, Output } from '@angular/core';

export type MultiSelectOption = {
  value: string;
  label: string;
  helper?: string;
  badge?: string;
  disabled?: boolean;
};

@Component({
  selector: 'hopehub-multi-select',
  standalone: true,
  templateUrl: './multi-select.component.html',
  styleUrl: './multi-select.component.scss'
})
export class MultiSelectComponent {
  @Input() label = '';
  @Input() hint = '';
  @Input() placeholder = 'Select one or more options';
  @Input() options: readonly MultiSelectOption[] = [];
  @Input() selected: readonly string[] = [];
  @Input() allowEmpty = false;
  @Input() columns: 'auto' | 'one' | 'two' = 'auto';
  @Input() tone: 'brand' | 'hope' | 'neutral' = 'brand';

  @Output() selectedChange = new EventEmitter<string[]>();

  isSelected(value: string): boolean {
    return this.selected.includes(value);
  }

  selectedOptions(): MultiSelectOption[] {
    return this.selected
      .map((value) => this.options.find((option) => option.value === value))
      .filter((option): option is MultiSelectOption => Boolean(option));
  }

  toggle(value: string): void {
    const option = this.options.find((item) => item.value === value);
    if (option?.disabled) return;

    const selected = this.isSelected(value)
      ? this.selected.filter((item) => item !== value)
      : [...this.selected, value];

    if (!selected.length && !this.allowEmpty) return;
    this.selectedChange.emit(selected);
  }

  remove(value: string, event?: Event): void {
    event?.stopPropagation();
    if (!this.isSelected(value)) return;
    const selected = this.selected.filter((item) => item !== value);
    if (!selected.length && !this.allowEmpty) return;
    this.selectedChange.emit(selected);
  }
}
