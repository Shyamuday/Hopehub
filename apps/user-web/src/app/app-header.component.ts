import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, effect, EventEmitter, HostListener, inject, Input, OnDestroy, Output, signal } from '@angular/core';
import { NotificationBellHostComponent } from '@vitalis/platform-ui';
import { environment } from '../environments/environment';
import { AUTH_TOKEN_KEY } from './core/constants/auth.constants';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { User } from './models';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, NotificationBellHostComponent],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent implements OnDestroy {
  @Input() subtitle = 'Digital clinic';
  @Input() user: User | null | undefined;
  @Input() whatsappLink = '';
  @Output() logout = new EventEmitter<void>();

  readonly menuOpen = signal(false);
  readonly bellConfig = {
    apiBase: environment.apiUrl,
    tokenKey: AUTH_TOKEN_KEY,
    apiPath: '/notifications'
  };

  private readonly document = inject(DOCUMENT);

  constructor(private readonly overlayService: AppOverlayService) {
    effect(() => {
      const open = this.menuOpen();
      this.document.body.classList.toggle('header-menu-no-scroll', open);
      this.document.documentElement.classList.toggle('header-menu-no-scroll', open);
    });
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('header-menu-no-scroll');
    this.document.documentElement.classList.remove('header-menu-no-scroll');
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this.menuOpen()) {
      this.closeMenu();
    }
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  openAuthOverlay(event: Event) {
    event.preventDefault();
    this.closeMenu();
    this.overlayService.open(AuthFormOverlayComponent, {
      width: '480px',
      panelClass: 'app-overlay-panel',
    });
  }
}
