import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { APP_OVERLAY_DATA, APP_OVERLAY_REF } from '../overlay.tokens';
import { AppOverlayRef, AppOverlayService } from '../overlay.service';
import { AuthStatusOverlayComponent } from './auth-status-overlay.component';
import { AuthService } from './auth.service';

type AuthFormOverlayData = {
  mode?: 'patient' | 'staff';
  initialForgotStep?: ForgotStep;
  resetToken?: string;
};

type ForgotStep = 'none' | 'email' | 'sent' | 'reset';

@Component({
  selector: 'app-auth-form-overlay',
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-form-overlay.component.html'
})
export class AuthFormOverlayComponent {
  private readonly overlayData = (inject(APP_OVERLAY_DATA) as AuthFormOverlayData | null) || {};
  readonly mode = signal<'patient' | 'staff'>(this.overlayData.mode || 'patient');
  readonly isProcessing = signal(false);
  readonly forgotStep = signal<ForgotStep>(this.overlayData.initialForgotStep || 'none');
  readonly resetToken = signal<string>(this.overlayData.resetToken || '');
  private activeOverlayRef?: AppOverlayRef;

  patientCredentials = {
    identifier: '',
    password: ''
  };

  patientOtp = {
    name: '',
    mobile: '',
    otp: ''
  };

  staff = {
    email: '',
    password: ''
  };

  forgot = {
    email: '',
    password: '',
    confirmPassword: ''
  };

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly overlayService = inject(AppOverlayService);
  private readonly hostOverlayRef = inject(APP_OVERLAY_REF) as AppOverlayRef;

  goToForgotStep(step: ForgotStep) {
    this.forgotStep.set(step);
  }

  canResetPassword(): boolean {
    return !!(this.forgot.password &&
      this.forgot.confirmPassword &&
      this.forgot.password === this.forgot.confirmPassword &&
      this.forgot.password.length >= 8);
  }

  requestOtp() {
    this.process('Sending OTP...', this.auth.requestOtp(this.patientOtp.mobile)).subscribe({
      next: (response) => this.showSuccess(`OTP sent successfully. Development OTP: ${response.devOtp}`),
      error: () => this.showError('Could not request OTP.')
    });
  }

  loginPatientWithOtp() {
    this.process('Logging in patient...', this.auth.patientLogin(this.patientOtp)).subscribe({
      next: ({ user }) => {
        this.closeAllOverlays();
        this.router.navigateByUrl(this.auth.dashboardFor(user.role));
      },
      error: (error) => this.showError(error.error?.message || 'Patient login failed.')
    });
  }

  loginPatientWithPassword() {
    this.process('Logging in patient...', this.auth.patientPasswordLogin(this.patientCredentials)).subscribe({
      next: ({ user }) => {
        this.closeAllOverlays();
        this.router.navigateByUrl(this.auth.dashboardFor(user.role));
      },
      error: (error) => this.showError(error.error?.message || 'Patient login failed.')
    });
  }

  loginStaff() {
    this.process('Logging in staff...', this.auth.staffLogin(this.staff)).subscribe({
      next: ({ user }) => {
        this.closeAllOverlays();
        this.router.navigateByUrl(this.auth.dashboardFor(user.role));
      },
      error: (error) => this.showError(error.error?.message || 'Staff login failed.')
    });
  }

  forgotPassword() {
    this.process('Sending reset link...', this.auth.staffForgotPassword(this.forgot.email)).subscribe({
      next: () => {
        this.closeActiveOverlay();
        this.goToForgotStep('sent');
      },
      error: () => this.showError('Could not send reset link.')
    });
  }

  resetPassword() {
    const token = this.resetToken();
    if (!token) {
      this.showError('Reset token is missing. Please request a new password reset link.');
      return;
    }

    this.process('Resetting password...', this.auth.resetPassword({ token, password: this.forgot.password })).subscribe({
      next: ({ user }) => {
        this.closeAllOverlays();
        this.router.navigateByUrl(this.auth.dashboardFor(user.role));
      },
      error: (error) => this.showError(error.error?.message || 'Password reset failed.')
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
      client_id: (window as unknown as Record<string, unknown>)['GOOGLE_CLIENT_ID'] as string || '',
      callback: (response: Record<string, unknown>) => {
        const idToken = response['credential'] as string;
        this.process('Signing in with Google...', this.auth.googleLogin(idToken)).subscribe({
          next: ({ user }) => {
            this.closeAllOverlays();
            this.router.navigateByUrl(this.auth.dashboardFor(user.role));
          },
          error: (error) => this.showError(error.error?.message || 'Google login failed.')
        });
      }
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
        }
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
      width: '360px'
    });
  }
}
