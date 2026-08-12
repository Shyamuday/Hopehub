import { booleanAttribute, Component, EventEmitter, Input, Output } from '@angular/core';

type AppModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-modal',
  standalone: true,
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

  panelCssClass(): string {
    return [
      'app-modal__panel',
      this.size === 'sm' ? 'app-modal__panel--sm' : '',
      this.size === 'lg' ? 'app-modal__panel--lg' : '',
      this.size === 'xl' ? 'app-modal__panel--xl' : '',
      this.panelClass,
    ]
      .filter(Boolean)
      .join(' ');
  }

  bodyCssClass(): string {
    return ['app-modal__body', this.bodyClass].filter(Boolean).join(' ');
  }
}
