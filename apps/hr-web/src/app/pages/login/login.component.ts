import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HrAuthService } from '../../services/hr-auth.service';
import { DEFAULT_AUTHED_ROUTE } from '../../core/constants/app-routes.constants';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <div class="login-logo">🏥</div>
          <h1 class="login-title">HR Portal</h1>
          <p class="login-subtitle">Sign in to continue</p>
        </div>

        @if (error()) {
          <div class="error-banner">
            ⚠️ {{ error() }}
          </div>
        }

        <form class="login-form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input
              class="form-input"
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="hr@hospital.com"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="input-wrap">
              <input
                class="form-input"
                [type]="showPass() ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                placeholder="Enter password"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="pass-toggle"
                (click)="showPass.set(!showPass())"
              >{{ showPass() ? '🙈' : '👁️' }}</button>
            </div>
          </div>

          <button
            type="submit"
            class="login-btn"
            [disabled]="loading()"
          >
            @if (loading()) {
              <span class="spinner"></span> Signing in...
            } @else {
              Sign In
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private auth = inject(HrAuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  onSubmit() {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([`/${DEFAULT_AUTHED_ROUTE}`]);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Invalid credentials. Please try again.');
      }
    });
  }
}
