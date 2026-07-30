import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { AdminAuth } from '../../../core/services/admin-auth';
import { pickFirstAllowedRoute } from '../../../core/admin-navigation';
import { DEFAULT_AUTHED_ROUTE } from '../../../core/constants/app-routes.constants';
import { AppButtonComponent } from '../../../shared/ui/app-button.component';

@Component({
  selector: 'app-admin-login',
  imports: [FormField, AppButtonComponent],
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
  readonly otp = signal('');
  readonly loginMode = signal<'otp' | 'password'>('otp');
  readonly otpSent = signal(false);
  readonly otpSentTo = signal('');
  readonly showPassword = signal(false);
  readonly loginForm = form(this.loginModel, (schema) => {
    required(schema.email, { message: 'Email is required' });
    required(schema.password, { message: 'Password is required' });
  });

  error = signal('');
  message = signal('');
  submitting = signal(false);

  setLoginMode(mode: 'otp' | 'password') {
    this.loginMode.set(mode);
    this.error.set('');
    this.message.set('');
    if (mode === 'password') {
      this.otp.set('');
      this.otpSent.set(false);
      this.otpSentTo.set('');
    }
  }

  async submit() {
    if (this.loginMode() === 'otp') {
      await this.submitOtp();
      return;
    }

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

  async sendOtp() {
    const { email } = this.loginModel();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      this.error.set('Email is required');
      return;
    }
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.requestOtp(normalizedEmail);
      if (!result.ok) {
        this.error.set(result.message);
        return;
      }
      this.otp.set('');
      this.otpSent.set(true);
      this.otpSentTo.set(normalizedEmail);
      this.message.set('OTP sent. Check your email and enter the code below.');
    } finally {
      this.submitting.set(false);
    }
  }

  private async submitOtp() {
    const { email } = this.loginModel();
    const normalizedEmail = email.trim().toLowerCase();
    const otp = this.otp().trim();
    if (!normalizedEmail) {
      this.error.set('Email is required');
      return;
    }
    if (!this.otpSent() || this.otpSentTo() !== normalizedEmail) {
      this.error.set('Send OTP to this email first.');
      return;
    }
    if (otp.length < 4) {
      this.error.set('Enter the OTP sent to your email.');
      return;
    }
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.loginWithOtp(normalizedEmail, otp);
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
