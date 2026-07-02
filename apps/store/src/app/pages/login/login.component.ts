import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreApiService } from '../../services/store-api.service';
import { StoreAuthService } from '../../services/store-auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-bg">
      <div class="login-container">
        <!-- Logo & Brand -->
        <div class="brand">
          <div class="brand-icon">🌿</div>
          <h1>Vitalis Store</h1>
          <p>Homeopathic Medicine Management</p>
        </div>

        <!-- Mode Toggle -->
        <div class="mode-toggle">
          <button class="mode-btn" [class.active]="mode() === 'pin'" (click)="mode.set('pin')">
            🔢 Staff PIN
          </button>
          <button class="mode-btn" [class.active]="mode() === 'manager'" (click)="mode.set('manager')">
            👔 Manager
          </button>
        </div>

        <!-- PIN Mode -->
        @if (mode() === 'pin') {
          <div class="pin-section fade-in">
            <div class="form-group" style="margin-bottom: 16px;">
              <label>Staff ID</label>
              <input class="input" type="text" [(ngModel)]="staffId" placeholder="Enter your staff ID" />
            </div>

            <div class="pin-display">
              <div class="pin-dots">
                @for (i of [0,1,2,3,4,5]; track i) {
                  <div class="pin-dot" [class.filled]="i < pin().length" [class.active]="i === pin().length"></div>
                }
              </div>
              <p class="pin-hint">Enter 4–6 digit PIN</p>
            </div>

            <div class="keypad">
              @for (key of keypadKeys; track key) {
                <button
                  class="keypad-btn"
                  [class.keypad-special]="key === '⌫' || key === '✓'"
                  [class.keypad-confirm]="key === '✓'"
                  [class.keypad-delete]="key === '⌫'"
                  (click)="onKeypad(key)"
                  [disabled]="loading()">
                  {{ key }}
                </button>
              }
            </div>
          </div>
        }

        <!-- Manager Mode -->
        @if (mode() === 'manager') {
          <div class="manager-section fade-in">
            <div class="form-group">
              <label>Email</label>
              <input class="input" type="email" [(ngModel)]="email" placeholder="manager@store.com" autocomplete="email" />
            </div>
            <div class="form-group" style="margin-top: 14px;">
              <label>Password</label>
              <div class="password-wrap">
                <input class="input" [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="password" placeholder="••••••••" autocomplete="current-password" />
                <button class="show-pass-btn" (click)="showPassword.update(v => !v)">
                  {{ showPassword() ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>
            <button class="btn btn-primary login-btn" (click)="loginManager()" [disabled]="loading() || !email || !password">
              @if (loading()) {
                <span class="btn-spinner"></span> Logging in...
              } @else {
                Sign In as Manager
              }
            </button>
          </div>
        }

        <!-- Error -->
        @if (error()) {
          <div class="error-msg fade-in">
            ⚠️ {{ error() }}
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private api = inject(StoreApiService);
  private auth = inject(StoreAuthService);
  private router = inject(Router);

  mode = signal<'pin' | 'manager'>('pin');
  pin = signal('');
  staffId = '';
  email = '';
  password = '';
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  keypadKeys = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];

  onKeypad(key: string): void {
    this.error.set('');
    if (key === '⌫') {
      this.pin.update(p => p.slice(0, -1));
    } else if (key === '✓') {
      this.loginPin();
    } else if (this.pin().length < 6) {
      this.pin.update(p => p + key);
    }
  }

  loginPin(): void {
    if (!this.staffId.trim()) {
      this.error.set('Please enter your Staff ID');
      return;
    }
    if (this.pin().length < 4) {
      this.error.set('PIN must be at least 4 digits');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api.loginPin(this.staffId.trim(), this.pin()).subscribe({
      next: (res) => {
        this.auth.setAuth(res.token, res.staff);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.pin.set('');
        this.error.set(err.error?.message || 'Invalid Staff ID or PIN');
      }
    });
  }

  loginManager(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.loginManager(this.email, this.password).subscribe({
      next: (res) => {
        this.auth.setAuth(res.token, res.staff);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Invalid email or password');
      }
    });
  }
}
