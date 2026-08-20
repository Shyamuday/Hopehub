import {
  booleanAttribute,
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ViewportOverlayService } from '../../../core/services/viewport-overlay.service';

type AppModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './app-modal.component.html',
  styleUrl: './app-modal.component.scss',
})
export class AppModalComponent implements OnChanges, OnDestroy {
  private static nextInstanceId = 0;
  private readonly overlay = inject(ViewportOverlayService);
  private readonly overlayOwner = `app-modal-${AppModalComponent.nextInstanceId++}`;
  private bodyLocked = false;
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) this.syncBodyLock();
  }

  ngOnDestroy(): void {
    this.releaseBodyLock();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open && this.showClose) this.close();
  }

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

  private syncBodyLock(): void {
    if (this.open && !this.bodyLocked) {
      this.bodyLocked = true;
      this.overlay.acquire(this.overlayOwner);
    } else if (!this.open) {
      this.releaseBodyLock();
    }
  }

  private releaseBodyLock(): void {
    if (!this.bodyLocked) return;
    this.bodyLocked = false;
    this.overlay.release(this.overlayOwner);
  }
}
