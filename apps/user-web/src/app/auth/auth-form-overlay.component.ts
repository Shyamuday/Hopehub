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

type ForgotStep = 'none' | 'reset';

@Component({
  selector: 'app-auth-form-overlay',
  imports: [CommonModule, FormField, DevLoginPanelComponent],
  templateUrl: './auth-form-overlay.component.html',
})
export class AuthFormOverlayComponent {
  private readonly overlayData = (inject(APP_OVERLAY_DATA) as AuthFormOverlayData | null) || {};
  readonly isProcessing = signal(false);
  readonly forgotStep = signal<ForgotStep>(this.overlayData.initialForgotStep || 'none');
  readonly resetToken = signal<string>(this.overlayData.resetToken || '');
  readonly patientSelection = signal<{
    mode: 'otp' | 'password';
    mobile?: string;
    patients: PatientSelectionCandidate[];
  } | null>(null);
  private activeOverlayRef?: AppOverlayRef;

  readonly patientCredentialsModel = signal({
    identifier: DEV_DEMO_ACCOUNTS.patientRahul.email as string,
    password: DEV_DEMO_ACCOUNTS.password as string,
  });
  readonly patientCredentialsForm = form(this.patientCredentialsModel);

  readonly patientOtpModel = signal({
    name: DEV_DEMO_ACCOUNTS.patientRahul.name as string,
    mobile: DEV_DEMO_ACCOUNTS.patientMobile as string,
    otp: DEV_DEMO_ACCOUNTS.otp as string,
  });
  readonly patientOtpForm = form(this.patientOtpModel);

  readonly forgotModel = signal({
    email: '',
    password: '',
    confirmPassword: '',
  });
  readonly forgotForm = form(this.forgotModel);

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

  requestOtp() {
    const { mobile } = this.patientOtpModel();
    this.process('Sending OTP...', this.auth.requestOtp(mobile)).subscribe({
      next: (response) =>
        this.showSuccess(`OTP sent successfully. Development OTP: ${response.devOtp}`),
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
    }
    if (credentials.password) {
      this.patientCredentialsModel.update((m) => ({ ...m, password: credentials.password! }));
    }
    if (credentials.name) {
      this.patientOtpModel.update((m) => ({ ...m, name: credentials.name! }));
    }
    if (credentials.mobile) {
      this.patientOtpModel.update((m) => ({ ...m, mobile: credentials.mobile! }));
    }
    if (credentials.otp) {
      this.patientOtpModel.update((m) => ({ ...m, otp: credentials.otp! }));
    }
  }

  loginPatientWithOtp() {
    this.process('Logging in patient...', this.auth.patientLogin(this.patientOtpModel())).subscribe({
      next: (response) => {
        if ('requiresPatientSelection' in response) {
          this.patientSelection.set({
            mode: 'otp',
            mobile: response.mobile || this.patientOtpModel().mobile,
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
          mobile: selection.mobile || otp.mobile,
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

  resetPassword() {
    const token = this.resetToken();
    const { password } = this.forgotModel();
    if (!token) {
      this.showError('Reset token is missing. Please request a new password reset link.');
      return;
    }

    this.process(
      'Resetting password...',
      this.auth.resetPassword({ token, password }),
    ).subscribe({
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
      | { id: { initialize(cfg: Record<string, unknown>): void; prompt(): void } }
      | undefined;

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
}
