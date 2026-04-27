import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AuthFormOverlayComponent } from './auth/auth-form-overlay.component';
import { User } from './models';
import { AppOverlayService } from './overlay.service';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  template: `
    <header class="app-header">
      <a class="brand" href="/">
        <span class="brand-mark">B</span>
        <span>
          <strong>Vitalis Care</strong>
          <small>{{ subtitle }}</small>
        </span>
      </a>

      @if (user) {
        <div class="user-chip">
          <span>{{ user.name }}</span>
          <strong>{{ user.role }}</strong>
          <button class="secondary" type="button" (click)="logout.emit()">Logout</button>
        </div>
      } @else {
        <nav class="header-actions" aria-label="Primary navigation">
          <a href="/about">About us</a>
          <a href="/treatments">Treatments</a>
          <a href="/safety">Safety</a>
          <a href="/login" (click)="openAuthOverlay($event, 'patient')">Login</a>
          <a href="/login" (click)="openAuthOverlay($event, 'staff')">Doctor login</a>
          <a [href]="whatsappLink" target="_blank" rel="noopener">WhatsApp</a>
        </nav>
      }
    </header>
  `
})
export class AppHeaderComponent {
  @Input() subtitle = 'Digital clinic';
  @Input() user: User | null | undefined;
  @Input() whatsappLink = '';
  @Output() logout = new EventEmitter<void>();

  constructor(private readonly overlayService: AppOverlayService) { }

  openAuthOverlay(event: Event, mode: 'patient' | 'staff' = 'patient') {
    event.preventDefault();
    this.overlayService.open(AuthFormOverlayComponent, {
      data: { mode },
      width: '480px',
      panelClass: 'app-overlay-panel'
    });
  }
}
