import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { DEFAULT_AUTHED_ROUTE } from '../../../core/constants/app-routes.constants';
import { Auth } from '../../../core/services/auth';
import { AppButtonComponent } from '../../../shared/ui/app-button.component';

@Component({
  selector: 'app-login',
  imports: [FormField, AppButtonComponent],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  mode = signal<'signin' | 'signup'>('signin');
  loginMode = signal<'otp' | 'password'>('otp');
  otp = signal('');
  otpSent = signal(false);
  otpSentTo = signal('');

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
    specialty: '',
    registrationNo: '',
    confirmPassword: '',
  });
  readonly enrollForm = form(this.enrollModel, (schema) => {
    required(schema.name, { message: 'Name is required' });
    required(schema.specialty, { message: 'Specialty is required' });
  });

  error = signal('');
  message = signal('');
  submitting = signal(false);

  setLoginMode(mode: 'otp' | 'password'): void {
    this.loginMode.set(mode);
    this.error.set('');
    this.message.set('');
    if (mode === 'password') {
      this.otp.set('');
      this.otpSent.set(false);
      this.otpSentTo.set('');
    }
  }

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
    if (this.loginMode() === 'otp') {
      await this.submitOtp();
      return;
    }

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

  async sendOtp() {
    const { email } = this.signInModel();
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
      this.message.set('OTP sent to your email.');
    } finally {
      this.submitting.set(false);
    }
  }

  private async submitOtp() {
    const { email } = this.signInModel();
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
      void this.navigateAfterLogin();
    } finally {
      this.submitting.set(false);
    }
  }

  async enroll() {
    if (!this.canSignup()) return;
    const { email, password } = this.signInModel();
    const { name, mobile, specialty, registrationNo } = this.enrollModel();
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.enrollDoctor({
        name,
        email,
        mobile: mobile || undefined,
        password,
        specialty,
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
