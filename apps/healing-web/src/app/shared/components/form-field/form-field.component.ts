import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  booleanAttribute,
  forwardRef,
  numberAttribute,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type FormFieldKind = 'input' | 'textarea';
export type FormFieldSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-field.component.html',
  styleUrl: './form-field.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormFieldComponent),
      multi: true,
    },
  ],
})
export class FormFieldComponent implements ControlValueAccessor {
  @Input() kind: FormFieldKind = 'input';
  @Input() type = 'text';
  @Input() label = '';
  @Input() placeholder = '';
  @Input() helper = '';
  @Input() error = '';
  @Input() autocomplete = '';
  @Input() inputMode = '';
  @Input() name = '';
  @Input({ transform: numberAttribute }) rows = 3;
  @Input() maxLength: number | null = null;
  @Input() size: FormFieldSize = 'md';
  @Input() customClass = '';
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) required = false;
  @Input({ transform: booleanAttribute }) invalid = false;
  @Input({ transform: booleanAttribute }) uppercase = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() blurred = new EventEmitter<void>();

  value = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  @Input()
  set modelValue(value: string | null | undefined) {
    this.value = value ?? '';
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  updateValue(value: string): void {
    this.value = this.uppercase ? value.toUpperCase() : value;
    this.onChange(this.value);
    this.valueChange.emit(this.value);
  }

  markTouched(): void {
    this.onTouched();
    this.blurred.emit();
  }

  controlId(): string {
    return (
      this.name ||
      `hope-field-${this.label || this.placeholder || 'input'}`.replace(/[^a-z0-9_-]+/gi, '-')
    );
  }

  showInvalid(): boolean {
    return this.invalid || Boolean(this.error);
  }
}
