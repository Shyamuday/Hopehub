import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { DEFAULT_AUTHED_ROUTE, ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import {
  buildProviderOnboardingStatus,
  needsProviderPathSelection,
} from '../../../core/constants/provider-onboarding.constants';
import { PH_PROVIDER_LANGUAGE } from '../../../core/constants/provider-language.constants';
import { Auth } from '../../../core/services/auth';
import { DoctorSessionService } from '../../../core/services/doctor-session';
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
  private readonly session = inject(DoctorSessionService);

  mode = signal<'signin' | 'signup'>('signup');
  signupStep = signal<1 | 2>(1);
  loginMode = signal<'otp' | 'password'>('otp');
  otp = signal('');
  otpSent = signal(false);
  otpSentTo = signal('');
  showPassword = signal(false);
  showEnrollPassword = signal(false);
  showConfirmPassword = signal(false);
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
    confirmPassword: '',
  });
  readonly enrollForm = form(this.enrollModel, (schema) => {
    required(schema.name, { message: 'Name is required' });
    required(schema.mobile, { message: 'Mobile number is required' });
  });

  error = signal('');
  message = signal('');
  submitting = signal(false);
  readonly phLanguage = PH_PROVIDER_LANGUAGE;

  setMode(mode: 'signin' | 'signup'): void {
    this.mode.set(mode);
    this.error.set('');
    this.message.set('');
    if (mode === 'signup') this.signupStep.set(1);
  }

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
      enroll.mobile.trim().length >= 8 &&
      password.length >= 8 &&
      password === enroll.confirmPassword
    );
  }

  canContinueSignup(): boolean {
    const email = this.signInModel().email.trim();
    const { name, mobile } = this.enrollModel();
    return (
      name.trim().length >= 2 &&
      /^\S+@\S+\.\S+$/.test(email) &&
      mobile.replace(/\D/g, '').length >= 8
    );
  }

  continueSignup(): void {
    if (!this.canContinueSignup()) {
      this.error.set('Add your name, a valid email, and mobile number to continue.');
      return;
    }
    this.error.set('');
    this.signupStep.set(2);
  }

  backToSignupDetails(): void {
    this.error.set('');
    this.signupStep.set(1);
  }

  private async navigateAfterLogin(): Promise<void> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    try {
      const profile = await this.session.load(true);
      if (needsProviderPathSelection(profile.doctorProfile)) {
        await this.router.navigate(['/', ROUTE_PATHS.WELCOME]);
        return;
      }
      const readiness = await this.session.readiness();
      const onboarding = buildProviderOnboardingStatus(
        profile.doctorProfile,
        profile.profileImageUrl ?? null,
        readiness,
      );
      const nextStep = onboarding.steps.find((step) => step.required && !step.complete);
      if (nextStep) {
        await this.router.navigateByUrl(
          this.router.createUrlTree([nextStep.route], {
            queryParams: nextStep.queryParams || null,
          }),
        );
        return;
      }
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        await this.router.navigateByUrl(returnUrl);
        return;
      }
    } catch {
      // Route guards provide a safe fallback if onboarding state cannot be loaded.
    }

    await this.router.navigateByUrl(`/${DEFAULT_AUTHED_ROUTE}`);
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
      await this.navigateAfterLogin();
    } finally {
      this.submitting.set(false);
    }
  }

  async loginWithGoogle() {
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.loginWithGoogle();
      if (!result.ok) {
        this.error.set(result.message);
        return;
      }
      await this.navigateAfterLogin();
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
      await this.navigateAfterLogin();
    } finally {
      this.submitting.set(false);
    }
  }

  async enroll() {
    if (!this.canSignup()) return;
    const { email, password } = this.signInModel();
    const { name, mobile } = this.enrollModel();
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.enrollDoctor({
        name,
        email,
        mobile: mobile.trim(),
        password,
        registrationNo: undefined,
      });

      if (!result.ok) {
        this.error.set(result.message);
        return;
      }

      const login = await this.auth.login(email, password);
      if (login.ok) {
        await this.router.navigate(['/welcome']);
        return;
      }
      this.setMode('signin');
      this.message.set('Account created. Sign in to choose your support path.');
    } finally {
      this.submitting.set(false);
    }
  }
}
