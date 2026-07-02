import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StoreApiService } from '../../services/store-api.service';
import { StoreAuthService } from '../../services/store-auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private api = inject(StoreApiService);
  private auth = inject(StoreAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : '/');
  }

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
        this.loading.set(false);
        this.navigateAfterLogin();
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
        this.loading.set(false);
        this.navigateAfterLogin();
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Invalid email or password');
      }
    });
  }
}
