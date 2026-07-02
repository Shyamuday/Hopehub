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
  styles: [`
    .login-bg {
      min-height: 100vh;
      background: linear-gradient(160deg, #0a1628 0%, #0f2040 40%, #0e3a5c 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow-y: auto;
    }

    .login-container {
      width: 100%;
      max-width: 380px;
    }

    .brand {
      text-align: center;
      margin-bottom: 28px;

      .brand-icon {
        font-size: 52px;
        margin-bottom: 12px;
        filter: drop-shadow(0 4px 12px rgba(8,145,178,0.4));
      }

      h1 {
        font-size: 26px;
        font-weight: 800;
        color: white;
        letter-spacing: -0.5px;
        margin-bottom: 6px;
      }

      p {
        font-size: 14px;
        color: #64748b;
      }
    }

    .mode-toggle {
      display: flex;
      background: rgba(255,255,255,0.06);
      border-radius: 14px;
      padding: 4px;
      margin-bottom: 24px;
      gap: 4px;
    }

    .mode-btn {
      flex: 1;
      padding: 12px;
      border-radius: 10px;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &.active {
        background: #0891b2;
        color: white;
        box-shadow: 0 2px 8px rgba(8,145,178,0.4);
      }
    }

    .pin-section, .manager-section {
      background: rgba(255,255,255,0.04);
      border-radius: 20px;
      padding: 20px;
      border: 1px solid rgba(255,255,255,0.07);
    }

    .pin-display {
      text-align: center;
      margin-bottom: 20px;
    }

    .pin-dots {
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-bottom: 8px;
    }

    .pin-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #64748b;
      transition: all 0.15s;

      &.filled {
        background: #0891b2;
        border-color: #0891b2;
        transform: scale(1.1);
        box-shadow: 0 0 8px rgba(8,145,178,0.5);
      }

      &.active {
        border-color: #06b6d4;
        animation: pulse 1s infinite;
      }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }

    .pin-hint {
      font-size: 12px;
      color: #475569;
    }

    .keypad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }

    .keypad-btn {
      height: 68px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.06);
      color: white;
      font-size: 22px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;

      &:hover:not(:disabled) {
        background: rgba(255,255,255,0.1);
        transform: translateY(-1px);
      }

      &:active:not(:disabled) {
        transform: scale(0.94);
        background: rgba(8,145,178,0.2);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .keypad-delete {
      background: rgba(239,68,68,0.1);
      border-color: rgba(239,68,68,0.2);
      color: #f87171;
      font-size: 20px;

      &:hover:not(:disabled) {
        background: rgba(239,68,68,0.18);
      }
    }

    .keypad-confirm {
      background: linear-gradient(135deg, #0891b2, #0e7490);
      border-color: transparent;
      font-size: 20px;
      box-shadow: 0 4px 12px rgba(8,145,178,0.4);

      &:hover:not(:disabled) {
        box-shadow: 0 6px 16px rgba(8,145,178,0.5);
      }
    }

    .manager-section {
      display: flex;
      flex-direction: column;
    }

    .password-wrap {
      position: relative;

      .input { padding-right: 44px; }
    }

    .show-pass-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 18px;
      opacity: 0.7;

      &:hover { opacity: 1; }
    }

    .login-btn {
      width: 100%;
      margin-top: 18px;
      height: 52px;
      font-size: 16px;
    }

    .btn-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .error-msg {
      margin-top: 16px;
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.25);
      border-radius: 12px;
      padding: 12px 16px;
      font-size: 14px;
      color: #f87171;
      text-align: center;
    }
  `]
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
