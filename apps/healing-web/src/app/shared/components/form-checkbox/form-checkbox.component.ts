import { Component, Input, booleanAttribute, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type FormCheckboxTone = 'neutral' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-form-checkbox',
  standalone: true,
  templateUrl: './form-checkbox.component.html',
  styleUrl: './form-checkbox.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormCheckboxComponent),
      multi: true,
    },
  ],
})
export class FormCheckboxComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() helper = '';
  @Input() tone: FormCheckboxTone = 'neutral';
  @Input({ transform: booleanAttribute }) disabled = false;

  checked = false;

  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: boolean | null): void {
    this.checked = Boolean(value);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggle(value: boolean): void {
    this.checked = value;
    this.onChange(value);
  }

  markTouched(): void {
    this.onTouched();
  }
}
