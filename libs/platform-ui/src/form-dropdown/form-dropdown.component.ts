import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, ViewChild, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type FormDropdownOption = {
  value: string;
  label: string;
};

@Component({
  selector: 'app-form-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-dropdown.component.html',
  styleUrl: './form-dropdown.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormDropdownComponent),
      multi: true
    }
  ]
})
export class FormDropdownComponent implements ControlValueAccessor {
  @Input() options: FormDropdownOption[] = [];
  @Input() placeholder = 'Select an option';
  @Input() invalid = false;
  @Input() panelMaxHeight = '16rem';

  @ViewChild('toggleButton') toggleButton?: ElementRef<HTMLButtonElement>;

  value = '';
  isOpen = false;
  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  get selectedLabel(): string {
    return this.options.find((option) => option.value === this.value)?.label || this.placeholder;
  }

  writeValue(value: string | null): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (isDisabled) this.isOpen = false;
  }

  toggle(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    this.onTouched();
  }

  selectOption(option: FormDropdownOption): void {
    if (this.disabled) return;
    this.value = option.value;
    this.onChange(option.value);
    this.onTouched();
    this.isOpen = false;
    this.toggleButton?.nativeElement.focus();
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.onTouched();
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      this.toggleButton?.nativeElement.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node | null;
    if (!target || this.elementRef.nativeElement.contains(target)) return;
    this.close();
  }

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}
}
