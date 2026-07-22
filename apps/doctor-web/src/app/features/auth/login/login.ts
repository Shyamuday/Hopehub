import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { DEFAULT_AUTHED_ROUTE } from '../../../core/constants/app-routes.constants';
import {
  PROVIDER_TYPE_OPTIONS,
  type ProviderType,
} from '../../../core/constants/doctor-types.constants';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [FormField],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  mode = signal<'signin' | 'signup'>('signin');

  readonly signInModel = signal({
    email: '',
    password: '',
  });
  readonly signInForm = form(this.signInModel, (schema) => {
    required(schema.email, { message: 'Email is required' });
    required(schema.password, { message: 'Password is required' });
  });

  readonly enrollModel = signal({
    name: '',
    mobile: '',
    providerType: 'HOMEOPATH' as ProviderType,
    specialization: '',
    specialty: '',
    registrationNo: '',
    confirmPassword: '',
  });
  readonly enrollForm = form(this.enrollModel, (schema) => {
    required(schema.name, { message: 'Name is required' });
  });

  readonly providerTypeOptions = PROVIDER_TYPE_OPTIONS;

  error = signal('');
  message = signal('');
  submitting = signal(false);

  canSignup(): boolean {
    const { password } = this.signInModel();
    const enroll = this.enrollModel();
    return !!(
      !this.signInForm().invalid() &&
      !this.enrollForm().invalid() &&
      password.length >= 8 &&
      password === enroll.confirmPassword
    );
  }

  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    void this.router.navigateByUrl(
      returnUrl && returnUrl.startsWith('/') ? returnUrl : `/${DEFAULT_AUTHED_ROUTE}`,
    );
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

  async enroll() {
    if (!this.canSignup()) return;
    const { email, password } = this.signInModel();
    const { name, mobile, providerType, specialization, specialty, registrationNo } =
      this.enrollModel();
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.enrollProvider({
        name,
        email,
        mobile: mobile || undefined,
        password,
        providerType,
        specialization: specialization || undefined,
        specialty: specialty || undefined,
        registrationNo: registrationNo || undefined,
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
