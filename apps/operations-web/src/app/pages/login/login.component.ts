import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { PlatformAuthService } from '../../services/platform-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormField],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private auth = inject(PlatformAuthService);
  private router = inject(Router);

  readonly loginModel = signal({ email: '', password: '' });
  readonly loginForm = form(this.loginModel, (schema) => {
    required(schema.email, { message: 'Email is required' });
    required(schema.password, { message: 'Password is required' });
  });

  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  onSubmit() {
    const { email, password } = this.loginModel();
    if (this.loginForm().invalid() || !email || !password) {
      this.error.set('Enter a valid email and password.');
      return;
    }
    this.loading.set(true);
    this.error.set('');

    this.auth.login(email, password).subscribe({
      next: () => this.finishLogin(),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 0) {
          this.error.set('Cannot reach the API. Start it with: npm run dev:api');
          return;
        }
        this.error.set(err?.error?.message ?? 'Invalid credentials. Please try again.');
      }
    });
  }

  private finishLogin() {
    if (this.auth.capabilities().length) {
      this.loading.set(false);
      void this.router.navigate([`/${this.auth.defaultRoute()}`]);
      return;
    }

    this.auth.fetchMe().subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate([`/${this.auth.defaultRoute()}`]);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 0) {
          this.error.set('Signed in, but cannot load session. Start the API with: npm run dev:api');
          return;
        }
        this.error.set(err?.error?.message ?? 'Failed to load session.');
      }
    });
  }
}
