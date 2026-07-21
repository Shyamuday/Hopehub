import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { AdminAuth } from '../../../core/services/admin-auth';
import { pickFirstAllowedRoute } from '../../../core/admin-navigation';
import { DEFAULT_AUTHED_ROUTE } from '../../../core/constants/app-routes.constants';

@Component({
  selector: 'app-admin-login',
  imports: [FormField],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss',
})
export class AdminLogin {
  private readonly auth = inject(AdminAuth);
  private readonly router = inject(Router);

  readonly loginModel = signal({
    email: '',
    password: '',
  });
  readonly loginForm = form(this.loginModel, (schema) => {
    required(schema.email, { message: 'Email is required' });
    required(schema.password, { message: 'Password is required' });
  });

  error = signal('');
  submitting = signal(false);

  async submit() {
    if (this.loginForm().invalid()) return;
    const { email, password } = this.loginModel();
    this.error.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.login(email, password);
      if (!result.ok) {
        this.error.set(result.message);
        return;
      }
      void this.router.navigateByUrl(this.postLoginRoute());
    } finally {
      this.submitting.set(false);
    }
  }

  private postLoginRoute() {
    return pickFirstAllowedRoute(this.auth.user()) ?? `/${DEFAULT_AUTHED_ROUTE}`;
  }
}
