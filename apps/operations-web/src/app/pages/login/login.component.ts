import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { PlatformAuthService } from '../../services/platform-auth.service';
import { DevLoginPanelComponent } from '@vitalis/platform-ui';
import { DEV_DEMO_ACCOUNTS } from '../../core/constants/dev-demo.constants';
import type { DevFillCredentials } from '@vitalis/platform-ui';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormField, DevLoginPanelComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private auth = inject(PlatformAuthService);
  private router = inject(Router);

  readonly loginModel = signal({
    email: DEV_DEMO_ACCOUNTS.hr.email as string,
    password: DEV_DEMO_ACCOUNTS.password as string
  });
  readonly loginForm = form(this.loginModel, (schema) => {
    required(schema.email, { message: 'Email is required' });
    required(schema.password, { message: 'Password is required' });
  });

  loading = signal(false);
  error = signal('');
  showPass = signal(false);

  onSubmit() {
    const { email, password } = this.loginModel();
    if (this.loginForm().invalid() || !email || !password) return;
    this.loading.set(true);
    this.error.set('');

    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        if (this.auth.capabilities().length) {
          void this.router.navigate([`/${this.auth.defaultRoute()}`]);
          return;
        }
        this.auth.fetchMe().subscribe({
          next: () => void this.router.navigate([`/${this.auth.defaultRoute()}`]),
          error: (err) => this.error.set(err?.error?.message ?? 'Failed to load session.')
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'Invalid credentials. Please try again.');
      }
    });
  }

  onDevLoggedIn() {
    if (this.auth.capabilities().length) {
      void this.router.navigate([`/${this.auth.defaultRoute()}`]);
      return;
    }
    this.auth.fetchMe().subscribe({
      next: () => void this.router.navigate([`/${this.auth.defaultRoute()}`]),
      error: () => void this.router.navigate(['/dashboard'])
    });
  }

  applyDevFill(credentials: DevFillCredentials) {
    this.loginModel.update((model) => ({
      ...model,
      ...(credentials.email ? { email: credentials.email } : {}),
      ...(credentials.password ? { password: credentials.password } : {})
    }));
  }
}
