import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { DEFAULT_AUTHED_ROUTE } from '../../../core/constants/app-routes.constants';
import { Auth } from '../../../core/services/auth';
import { DevLoginPanelComponent } from '@vitalis/platform-ui';
import { DEV_DEMO_ACCOUNTS } from '../../../core/constants/dev-demo.constants';
import type { DevFillCredentials } from '@vitalis/platform-ui';

@Component({
  selector: 'app-login',
  imports: [FormField, FormsModule, DevLoginPanelComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  mode = signal<'signin' | 'enroll'>('signin');

  readonly signInModel = signal({
    email: DEV_DEMO_ACCOUNTS.doctor.email as string,
    password: DEV_DEMO_ACCOUNTS.password as string
  });
  readonly signInForm = form(this.signInModel, (schema) => {
    required(schema.email, { message: 'Email is required' });
    required(schema.password, { message: 'Password is required' });
  });

  error = signal('');
  message = signal('');
  submitting = signal(false);

  name = '';
  mobile = '';
  specialty = '';
  registrationNo = '';

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') ? returnUrl : `/${DEFAULT_AUTHED_ROUTE}`);
  }

  async submit() {
    if (this.signInForm().invalid()) return;
    const { email, password } = this.signInModel();
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.login(email, password);
      if (!result.ok) {
        this.error.set(result.message);
        return;
      }
      void this.navigateAfterLogin();
    } finally {
      this.submitting.set(false);
    }
  }

  onDevLoggedIn() {
    void this.navigateAfterLogin();
  }

  applyDevFill(credentials: DevFillCredentials) {
    this.signInModel.update((model) => ({
      ...model,
      ...(credentials.email ? { email: credentials.email } : {}),
      ...(credentials.password ? { password: credentials.password } : {})
    }));
  }

  async enroll() {
    const { email, password } = this.signInModel();
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.enrollDoctor({
        name: this.name,
        email,
        mobile: this.mobile || undefined,
        password,
        specialty: this.specialty,
        registrationNo: this.registrationNo || undefined
      });

      if (!result.ok) {
        this.error.set(result.message);
        return;
      }

      this.mode.set('signin');
      this.message.set(result.message);
    } finally {
      this.submitting.set(false);
    }
  }
}
