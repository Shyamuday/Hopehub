import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { APP_OVERLAY_DATA, APP_OVERLAY_REF } from '../overlay.tokens';
import { AppOverlayRef, AppOverlayService } from '../overlay.service';
import { AuthStatusOverlayComponent } from './auth-status-overlay.component';
import { AuthService } from './auth.service';
import { DevLoginPanelComponent } from '@vitalis/platform-ui';
import { DEV_DEMO_ACCOUNTS } from '../core/constants/dev-demo.constants';
import type { DevFillCredentials } from '@vitalis/platform-ui';

import { PatientSelectionCandidate } from '../models';

type AuthFormOverlayData = {
  initialForgotStep?: ForgotStep;
  resetToken?: string;
};

type AuthView = 'login' | 'signup';
type ForgotStep = 'none' | 'request' | 'reset';

@Component({
  selector: 'app-auth-form-overlay',
  imports: [CommonModule, FormField, DevLoginPanelComponent],
  templateUrl: './auth-form-overlay.component.html',
})
export class AuthFormOverlayComponent {
  private readonly overlayData = (inject(APP_OVERLAY_DATA) as AuthFormOverlayData | null) || {};
  private readonly referralCodeFromUrl =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('ref') || undefined
      : undefined;
  readonly authView = signal<AuthView>('login');
  readonly loginOtpSent = signal(false);
  readonly signupOtpSent = signal(false);
  readonly otpNotice = signal('');
  readonly isProcessing = signal(false);
  readonly forgotStep = signal<ForgotStep>(this.overlayData.initialForgotStep || 'none');
  readonly resetToken = signal<string>(this.overlayData.resetToken || '');
  readonly patientSelection = signal<{
    mode: 'otp' | 'password';
    email?: string;
    patients: PatientSelectionCandidate[];
  } | null>(null);
  private activeOverlayRef?: AppOverlayRef;

  readonly patientCredentialsModel = signal({
    identifier: DEV_DEMO_ACCOUNTS.patientRahul.email as string,
    password: DEV_DEMO_ACCOUNTS.password as string,
  });
  readonly patientCredentialsForm = form(this.patientCredentialsModel);

  readonly patientOtpModel = signal({
    email: DEV_DEMO_ACCOUNTS.patientRahul.email as string,
    otp: DEV_DEMO_ACCOUNTS.otp as string,
  });
  readonly patientOtpForm = form(this.patientOtpModel);

  readonly forgotModel = signal({
    email: '',
    password: '',
    confirmPassword: '',
  });
  readonly forgotForm = form(this.forgotModel);

  readonly signupModel = signal({
    name: '',
    email: '',
    otp: '',
  });
  readonly signupForm = form(this.signupModel);

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly overlayService = inject(AppOverlayService);
  private readonly hostOverlayRef = inject(APP_OVERLAY_REF) as AppOverlayRef;

  canResetPassword(): boolean {
    const forgot = this.forgotModel();
    return !!(
      forgot.password &&
      forgot.confirmPassword &&
      forgot.password === forgot.confirmPassword &&
      forgot.password.length >= 8
    );
  }

  canRequestPasswordReset(): boolean {
    return this.isEmail(this.forgotModel().email);
  }

  canRegisterPatient(): boolean {
    const signup = this.signupModel();
    return !!(
      signup.name.trim().length >= 2 &&
      this.isEmail(signup.email) &&
      this.signupOtpSent() &&
      this.isSixDigitOtp(signup.otp)
    );
  }

  canLoginWithEmailOtp(): boolean {
    const otp = this.patientOtpModel();
    return this.isEmail(otp.email) && this.loginOtpSent() && this.isSixDigitOtp(otp.otp);
  }

  setAuthView(view: AuthView) {
    this.authView.set(view);
    this.forgotStep.set('none');
    this.patientSelection.set(null);
    this.loginOtpSent.set(false);
    this.signupOtpSent.set(false);
    this.otpNotice.set('');
    this.errorCleanup();
  }

  startForgotPassword() {
    this.forgotStep.set('request');
    this.patientSelection.set(null);
  }

  cancelForgotPassword() {
    this.forgotStep.set('none');
  }

  resetLoginOtp() {
    this.loginOtpSent.set(false);
    this.otpNotice.set('');
    this.patientOtpModel.update((model) => ({ ...model, otp: '' }));
  }

  resetSignupOtp() {
    this.signupOtpSent.set(false);
    this.otpNotice.set('');
    this.signupModel.update((model) => ({ ...model, otp: '' }));
  }

  requestLoginOtp() {
    const email = this.patientOtpModel().email;
    this.requestOtp(email, () => {
      this.patientOtpModel.update((model) => ({
        ...model,
        email: email.trim().toLowerCase(),
        otp: '',
      }));
      this.loginOtpSent.set(true);
    });
  }

  requestSignupOtp() {
    const email = this.signupModel().email;
    this.requestOtp(email, () => {
      this.signupModel.update((model) => ({
        ...model,
        email: email.trim().toLowerCase(),
        otp: '',
      }));
      this.signupOtpSent.set(true);
    });
  }

  private requestOtp(email: string, onSent: () => void) {
    if (!this.isEmail(email)) {
      this.showError('Enter a valid email address.');
      return;
    }

    this.otpNotice.set('');
    this.process('Sending OTP...', this.auth.requestOtp(email.trim().toLowerCase())).subscribe({
      next: (response) => {
        onSent();
        this.closeActiveOverlay();
        this.otpNotice.set(
          response.devOtp
            ? `OTP sent successfully. Development OTP: ${response.devOtp}`
            : 'OTP sent successfully. Check your email.',
        );
      },
      error: () => this.showError('Could not request OTP.'),
    });
  }

  onDevLoggedIn() {
    const user = this.auth.user();
    if (!user) return;
    this.closeAllOverlays();
    void this.router.navigateByUrl(this.auth.dashboardFor(user.role));
  }

  applyDevFill(credentials: DevFillCredentials) {
    const identifier = credentials.identifier ?? credentials.email;
    if (identifier) {
      this.patientCredentialsModel.update((m) => ({ ...m, identifier }));
      this.patientOtpModel.update((m) => ({ ...m, email: identifier }));
      this.signupModel.update((m) => ({ ...m, email: identifier }));
    }
    if (credentials.password) {
      this.patientCredentialsModel.update((m) => ({ ...m, password: credentials.password! }));
    }
    if (credentials.otp) {
      this.patientOtpModel.update((m) => ({ ...m, otp: credentials.otp! }));
      this.signupModel.update((m) => ({ ...m, otp: credentials.otp! }));
      this.loginOtpSent.set(true);
      this.signupOtpSent.set(true);
    }
  }

  loginPatientWithOtp() {
    const otp = this.patientOtpModel();
    this.process(
      'Logging in patient...',
      this.auth.patientLogin({
        ...otp,
        email: otp.email.trim().toLowerCase(),
        referralCode: this.referralCodeFromUrl,
      }),
    ).subscribe({
      next: (response) => {
        if ('requiresPatientSelection' in response) {
          this.patientSelection.set({
            mode: 'otp',
            email: response.email || this.patientOtpModel().email,
            patients: response.patients,
          });
          this.closeActiveOverlay();
          return;
        }
        this.closeAllOverlays();
        this.router.navigateByUrl(this.auth.dashboardFor(response.user.role));
      },
      error: (error) => this.showError(error.error?.message || 'Patient login failed.'),
    });
  }

  selectPatient(patientId: string) {
    const selection = this.patientSelection();
    if (!selection) return;

    if (selection.mode === 'otp') {
      const otp = this.patientOtpModel();
      this.process(
        'Signing in...',
        this.auth.patientLoginSelect({
          email: (selection.email || otp.email).trim().toLowerCase(),
          otp: otp.otp,
          patientId,
        }),
      ).subscribe({
        next: ({ user }) => {
          this.patientSelection.set(null);
          this.closeAllOverlays();
          this.router.navigateByUrl(this.auth.dashboardFor(user.role));
        },
        error: (error) =>
          this.showError(error.error?.message || 'Could not sign in to selected profile.'),
      });
      return;
    }

    const credentials = this.patientCredentialsModel();
    this.process(
      'Signing in...',
      this.auth.patientPasswordLoginSelect({
        identifier: credentials.identifier,
        password: credentials.password,
        patientId,
      }),
    ).subscribe({
      next: ({ user }) => {
        this.patientSelection.set(null);
        this.closeAllOverlays();
        this.router.navigateByUrl(this.auth.dashboardFor(user.role));
      },
      error: (error) =>
        this.showError(error.error?.message || 'Could not sign in to selected profile.'),
    });
  }

  cancelPatientSelection() {
    this.patientSelection.set(null);
  }

  loginPatientWithPassword() {
    this.process(
      'Logging in patient...',
      this.auth.patientPasswordLogin(this.patientCredentialsModel()),
    ).subscribe({
      next: (response) => {
        if ('requiresPatientSelection' in response) {
          this.patientSelection.set({
            mode: 'password',
            patients: response.patients,
          });
          this.closeActiveOverlay();
          return;
        }
        this.closeAllOverlays();
        this.router.navigateByUrl(this.auth.dashboardFor(response.user.role));
      },
      error: (error) => this.showError(error.error?.message || 'Patient login failed.'),
    });
  }

  registerPatient() {
    if (!this.canRegisterPatient()) {
      this.showError('Enter your name, email, and OTP.');
      return;
    }

    const signup = this.signupModel();
    this.process(
      'Creating patient account...',
      this.auth.patientLogin({
        name: signup.name.trim(),
        email: signup.email.trim().toLowerCase(),
        otp: signup.otp.trim(),
        referralCode: this.referralCodeFromUrl,
      }),
    ).subscribe({
      next: (response) => {
        if ('requiresPatientSelection' in response) {
          this.patientOtpModel.update((model) => ({
            ...model,
            email: signup.email,
            otp: signup.otp,
          }));
          this.patientSelection.set({
            mode: 'otp',
            email: response.email || signup.email,
            patients: response.patients,
          });
          this.closeActiveOverlay();
          return;
        }
        this.closeAllOverlays();
        this.router.navigateByUrl(this.auth.dashboardFor(response.user.role));
      },
      error: (error) => this.showError(error.error?.message || 'Patient signup failed.'),
    });
  }

  forgotPassword() {
    const email = this.forgotModel().email.trim();
    if (!email) {
      this.showError('Enter your registered email to receive a reset link.');
      return;
    }

    this.process('Sending reset link...', this.auth.forgotPassword(email)).subscribe({
      next: () =>
        this.showSuccess('If the account exists, a reset link has been sent to your email.'),
      error: (error) => this.showError(error.error?.message || 'Could not send reset link.'),
    });
  }

  resetPassword() {
    const token = this.resetToken();
    const { password } = this.forgotModel();
    if (!token) {
      this.showError('Reset token is missing. Please request a new password reset link.');
      return;
    }

    this.process('Resetting password...', this.auth.resetPassword({ token, password })).subscribe({
      next: ({ user }) => {
        this.closeAllOverlays();
        this.router.navigateByUrl(this.auth.dashboardFor(user.role));
      },
      error: (error) => this.showError(error.error?.message || 'Password reset failed.'),
    });
  }

  loginWithGoogle() {
    const w = window as unknown as Record<string, unknown>;
    const googleAccounts = (w['google'] as Record<string, unknown> | undefined)?.['accounts'] as
      { id: { initialize(cfg: Record<string, unknown>): void; prompt(): void } } | undefined;

    if (!googleAccounts?.id) {
      this.showError('Google Sign-In is not available. Ensure GOOGLE_CLIENT_ID is configured.');
      return;
    }

    googleAccounts.id.initialize({
      client_id:
        ((window as unknown as Record<string, unknown>)['GOOGLE_CLIENT_ID'] as string) || '',
      callback: (response: Record<string, unknown>) => {
        const idToken = response['credential'] as string;
        this.process('Signing in with Google...', this.auth.googleLogin(idToken)).subscribe({
          next: ({ user }) => {
            this.closeAllOverlays();
            this.router.navigateByUrl(this.auth.dashboardFor(user.role));
          },
          error: (error) => this.showError(error.error?.message || 'Google login failed.'),
        });
      },
    });

    googleAccounts.id.prompt();
  }

  private process<T>(label: string, request$: Observable<T>) {
    this.openAuthOverlay('loading', label, 'Please wait while we securely process your request.');
    this.isProcessing.set(true);

    return new Observable<T>((observer) => {
      const subscription = request$.subscribe({
        next: (value) => observer.next(value),
        error: (error) => {
          this.isProcessing.set(false);
          observer.error(error);
        },
        complete: () => {
          this.isProcessing.set(false);
          observer.complete();
        },
      });

      return () => subscription.unsubscribe();
    });
  }

  private closeActiveOverlay() {
    this.activeOverlayRef?.close();
    this.activeOverlayRef = undefined;
  }

  private closeAllOverlays() {
    this.closeActiveOverlay();
    this.hostOverlayRef.close();
  }

  private showSuccess(message: string) {
    this.openAuthOverlay('success', 'Completed', message);
  }

  private showError(message: string) {
    this.openAuthOverlay('error', 'Request failed', message);
  }

  private openAuthOverlay(state: 'loading' | 'success' | 'error', label: string, message: string) {
    this.closeActiveOverlay();
    this.activeOverlayRef = this.overlayService.open(AuthStatusOverlayComponent, {
      data: { state, label, message },
      disableClose: state === 'loading',
      width: '360px',
    });
  }

  private errorCleanup() {
    this.closeActiveOverlay();
  }

  private isEmail(value: string) {
    return /.+@.+\..+/.test(value.trim());
  }

  private isSixDigitOtp(value: string) {
    return /^\d{6}$/.test(value.trim());
  }
}
