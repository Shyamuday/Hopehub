import { booleanAttribute, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';

type AppModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [NgClass],
  templateUrl: './app-modal.component.html',
  styleUrl: './app-modal.component.scss',
})
export class AppModalComponent {
  @Input({ transform: booleanAttribute }) open = false;
  @Input({ transform: booleanAttribute }) showClose = true;
  @Input({ transform: booleanAttribute }) closeOnBackdrop = true;
  @Input() title = '';
  @Input() description = '';
  @Input() labelledBy = 'appModalTitle';
  @Input() size: AppModalSize = 'md';
  @Input() panelClass = '';
  @Input() bodyClass = '';

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop) {
      this.close();
    }
  }
}
