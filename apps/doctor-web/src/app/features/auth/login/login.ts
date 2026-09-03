import { Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import {
  email as emailValidator,
  form,
  FormField,
  maxLength,
  required,
  validate,
} from '@angular/forms/signals';
import { DEFAULT_AUTHED_ROUTE, ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import {
  buildProviderOnboardingStatus,
  needsProviderPathSelection,
} from '../../../core/constants/provider-onboarding.constants';
import { providerPortalForHost } from '../../../core/constants/provider-portal.constants';
import { Auth } from '../../../core/services/auth';
import { DoctorSessionService } from '../../../core/services/doctor-session';
import { AppButtonComponent } from '../../../shared/ui/app-button.component';
import {
  indianMobileDisplay,
  indianMobileE164,
} from '../../../core/constants/indian-mobile.constants';
import {
  isProviderDisplayName,
  isStrongProviderPassword,
} from '../../../core/constants/provider-input-validation.constants';

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
  private readonly title = inject(Title);

  readonly portal = providerPortalForHost(
    typeof window === 'undefined' ? '' : window.location.hostname,
    this.route.snapshot.queryParamMap.get('portal'),
  );
  readonly providerLanguage = this.portal.language;
  readonly isHomeopathyPortal = this.portal.id === 'HOMEOPATHY';

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
    required(schema.email, { message: 'Email is required.' });
    emailValidator(schema.email, { message: 'Enter a valid email address.' });
    maxLength(schema.email, 254, { message: 'Email must be 254 characters or fewer.' });
    required(schema.password, { message: 'Password is required.' });
    maxLength(schema.password, 128, { message: 'Password must be 128 characters or fewer.' });
    validate(schema.password, ({ value }) =>
      this.mode() !== 'signup' || !value() || isStrongProviderPassword(value())
        ? undefined
        : {
            kind: 'strongPassword',
            message: 'Use at least 8 characters with one letter and one number.',
          },
    );
  });

  readonly enrollModel = signal({
    name: '',
    mobile: indianMobileDisplay(''),
    specialty: this.isHomeopathyPortal ? this.portal.defaultSpecialty : '',
    registrationNo: '',
    confirmPassword: '',
  });
  readonly enrollForm = form(this.enrollModel, (schema) => {
    required(schema.name, { message: 'Full name is required.' });
    maxLength(schema.name, 80, { message: 'Full name must be 80 characters or fewer.' });
    validate(schema.name, ({ value }) =>
      !value() || isProviderDisplayName(value())
        ? undefined
        : { kind: 'displayName', message: 'Enter your real name using at least 2 letters.' },
    );
    required(schema.mobile, { message: 'Mobile number is required.' });
    validate(schema.mobile, ({ value }) =>
      !value() || indianMobileE164(value())
        ? undefined
        : { kind: 'indianMobile', message: 'Enter a valid 10-digit Indian mobile number.' },
    );
    validate(schema.registrationNo, ({ value }) =>
      !this.isHomeopathyPortal || value().trim().length >= 3
        ? undefined
        : {
            kind: 'registrationNumber',
            message: 'Enter your professional registration number (at least 3 characters).',
          },
    );
    required(schema.confirmPassword, {
      message: 'Confirm your password.',
      when: () => this.signupStep() === 2,
    });
    validate(schema.confirmPassword, ({ value }) =>
      this.signupStep() !== 2 || !value() || value() === this.signInModel().password
        ? undefined
        : { kind: 'passwordMatch', message: 'Passwords do not match.' },
    );
  });

  error = signal('');
  message = signal('');
  submitting = signal(false);
  /** Keeps the OTP controls honest: only the action being performed spins. */
  sendingOtp = signal(false);
  verifyingOtp = signal(false);
  otpTouched = signal(false);
  fieldErrors = signal<Record<string, string>>({});

  constructor() {
    this.title.setTitle(this.portal.pageTitle);
  }

  setMode(mode: 'signin' | 'signup'): void {
    this.mode.set(mode);
    this.error.set('');
    this.message.set('');
    this.fieldErrors.set({});
    this.otpTouched.set(false);
    if (mode === 'signup') this.signupStep.set(1);
  }

  setLoginMode(mode: 'otp' | 'password'): void {
    this.loginMode.set(mode);
    this.error.set('');
    this.message.set('');
    this.fieldErrors.set({});
    this.otpTouched.set(false);
    if (mode === 'password') {
      this.otp.set('');
      this.otpSent.set(false);
      this.otpSentTo.set('');
    }
  }

  fieldError(field: string): string {
    return this.fieldErrors()[field] || '';
  }

  clearFieldError(field: string): void {
    if (!this.fieldErrors()[field]) return;
    const next = { ...this.fieldErrors() };
    delete next[field];
    this.fieldErrors.set(next);
    this.error.set('');
  }

  updateOtp(value: string): void {
    this.otp.set(value.replace(/\D/g, '').slice(0, 8));
    this.otpTouched.set(true);
    this.clearFieldError('otp');
  }

  otpError(): string {
    if (this.fieldError('otp')) return this.fieldError('otp');
    if (!this.otpTouched()) return '';
    if (!this.otp()) return 'OTP is required.';
    if (!/^\d{4,8}$/.test(this.otp())) return 'Enter the 4–8 digit OTP from your email.';
    return '';
  }

  private applyFailure(result: { message: string; fieldErrors?: Record<string, string> }): void {
    const fieldErrors = result.fieldErrors || {};
    this.fieldErrors.set(fieldErrors);

    if (
      this.mode() === 'signup' &&
      this.signupStep() === 2 &&
      ['name', 'email', 'mobile', 'specialty', 'registrationNo'].some((field) => fieldErrors[field])
    ) {
      this.signupStep.set(1);
    }

    this.error.set(result.message);
  }

  canSignup(): boolean {
    const { password } = this.signInModel();
    const enroll = this.enrollModel();
    return !!(
      !this.signInForm().invalid() &&
      !this.enrollForm().invalid() &&
      Boolean(indianMobileE164(enroll.mobile)) &&
      isProviderDisplayName(enroll.name) &&
      (!this.isHomeopathyPortal ||
        (enroll.specialty.trim().length >= 2 && enroll.registrationNo.trim().length >= 3)) &&
      isStrongProviderPassword(password) &&
      password === enroll.confirmPassword
    );
  }

  canContinueSignup(): boolean {
    const email = this.signInModel().email.trim();
    const { name, mobile, specialty, registrationNo } = this.enrollModel();
    return (
      isProviderDisplayName(name) &&
      /^\S+@\S+\.\S+$/.test(email) &&
      Boolean(indianMobileE164(mobile)) &&
      (!this.isHomeopathyPortal ||
        (specialty.trim().length >= 2 && registrationNo.trim().length >= 3))
    );
  }

  continueSignup(): void {
    this.signInForm.email().markAsTouched();
    this.enrollForm.name().markAsTouched();
    this.enrollForm.mobile().markAsTouched();
    this.enrollForm.registrationNo().markAsTouched();
    if (!this.canContinueSignup()) {
      this.error.set(
        this.isHomeopathyPortal
          ? 'Add your name, valid contact details, specialty, and professional registration number to continue.'
          : 'Add your name, a valid email, and a valid 10-digit Indian mobile number to continue.',
      );
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

    this.signInForm.email().markAsTouched();
    this.signInForm.password().markAsTouched();
    if (this.signInForm().invalid()) {
      this.error.set('Please correct the highlighted fields.');
      return;
    }
    const { email, password } = this.signInModel();
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.login(email, password);
      if (!result.ok) {
        this.applyFailure(result);
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
    this.signInForm.email().markAsTouched();
    if (!normalizedEmail) {
      this.error.set('Email is required');
      return;
    }
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    this.sendingOtp.set(true);
    try {
      const result = await this.auth.requestOtp(normalizedEmail);
      if (!result.ok) {
        this.applyFailure(result);
        return;
      }
      this.otp.set('');
      this.otpTouched.set(false);
      this.clearFieldError('otp');
      this.otpSent.set(true);
      this.otpSentTo.set(normalizedEmail);
      this.message.set('OTP sent to your email.');
    } finally {
      this.sendingOtp.set(false);
      this.submitting.set(false);
    }
  }

  private async submitOtp() {
    const { email } = this.signInModel();
    const normalizedEmail = email.trim().toLowerCase();
    const otp = this.otp().trim();
    this.signInForm.email().markAsTouched();
    this.otpTouched.set(true);
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
    this.verifyingOtp.set(true);
    try {
      const result = await this.auth.loginWithOtp(normalizedEmail, otp);
      if (!result.ok) {
        this.applyFailure(result);
        return;
      }
      await this.navigateAfterLogin();
    } finally {
      this.verifyingOtp.set(false);
      this.submitting.set(false);
    }
  }

  async enroll() {
    this.signInForm.email().markAsTouched();
    this.signInForm.password().markAsTouched();
    this.enrollForm.name().markAsTouched();
    this.enrollForm.mobile().markAsTouched();
    this.enrollForm.registrationNo().markAsTouched();
    this.enrollForm.confirmPassword().markAsTouched();
    if (!this.canSignup()) {
      this.error.set(
        'Use a real name and a password with at least 8 characters, including a letter and a number.',
      );
      return;
    }
    const { email, password } = this.signInModel();
    const { name, mobile, specialty, registrationNo } = this.enrollModel();
    const normalizedMobile = indianMobileE164(mobile);
    if (!normalizedMobile) {
      this.error.set('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    this.error.set('');
    this.message.set('');
    this.submitting.set(true);
    try {
      const result = await this.auth.enrollDoctor({
        name,
        email,
        mobile: normalizedMobile,
        password,
        providerDomain: this.portal.id,
        specialty: this.isHomeopathyPortal ? specialty.trim() : undefined,
        registrationNo: this.isHomeopathyPortal ? registrationNo.trim() : undefined,
      });

      if (!result.ok) {
        this.applyFailure(result);
        return;
      }

      const login = await this.auth.login(email, password);
      if (login.ok) {
        await this.navigateAfterLogin();
        return;
      }
      this.setMode('signin');
      this.message.set(
        this.isHomeopathyPortal
          ? result.message
          : 'Account created. Sign in to choose your support path.',
      );
    } finally {
      this.submitting.set(false);
    }
  }
}
