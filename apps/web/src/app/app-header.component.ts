import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from './models';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  template: `
    <header class="app-header">
      <a class="brand" href="/">
        <span class="brand-mark">B</span>
        <span>
          <strong>Betelgeuse Clinic</strong>
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
          <a href="#login-card">Login</a>
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
}
