import { Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
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
    required(schema.email, { message: 'Email is required' });
    required(schema.password, { message: 'Password is required' });
  });

  readonly enrollModel = signal({
    name: '',
    mobile: indianMobileDisplay(''),
    specialty: this.isHomeopathyPortal ? this.portal.defaultSpecialty : '',
    registrationNo: '',
    confirmPassword: '',
  });
  readonly enrollForm = form(this.enrollModel, (schema) => {
    required(schema.name, { message: 'Name is required' });
    required(schema.mobile, { message: 'Mobile number is required' });
  });

  error = signal('');
  message = signal('');
  submitting = signal(false);
  /** Keeps the OTP controls honest: only the action being performed spins. */
  sendingOtp = signal(false);
  verifyingOtp = signal(false);

  constructor() {
    this.title.setTitle(this.portal.pageTitle);
  }

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
    this.sendingOtp.set(true);
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
      this.sendingOtp.set(false);
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
    this.verifyingOtp.set(true);
    try {
      const result = await this.auth.loginWithOtp(normalizedEmail, otp);
      if (!result.ok) {
        this.error.set(result.message);
        return;
      }
      await this.navigateAfterLogin();
    } finally {
      this.verifyingOtp.set(false);
      this.submitting.set(false);
    }
  }

  async enroll() {
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
        this.error.set(result.message);
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
