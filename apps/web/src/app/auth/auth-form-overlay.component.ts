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
};

type ForgotStep = 'none' | 'email' | 'sent' | 'reset';

@Component({
  selector: 'app-auth-form-overlay',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-card">
      <p class="eyebrow">Vitalis Care</p>

      @if (mode() === 'patient') {
        <h2>Login to continue</h2>
        <p class="muted">Patients use mobile OTP.</p>

        <form (ngSubmit)="loginPatient()">
          <label>
            Name
            <input name="name" [(ngModel)]="patient.name" placeholder="Your name" />
          </label>
          <label>
            Mobile number
            <input name="mobile" [(ngModel)]="patient.mobile" placeholder="9876543210" />
          </label>
          <div class="otp-row">
            <label>
              OTP
              <input name="otp" [(ngModel)]="patient.otp" placeholder="123456" />
            </label>
            <button type="button" class="secondary" [disabled]="isProcessing()" (click)="requestOtp()">Get OTP</button>
          </div>
          <button class="primary" type="submit" [disabled]="isProcessing()">Login as patient</button>
        </form>

        <div class="divider-text">or</div>
        <form (ngSubmit)="loginWithGoogle()">
          <button class="secondary" type="submit" [disabled]="isProcessing()">Continue with Google</button>
          <p class="muted">Uses the Google provider configured in Supabase Auth.</p>
        </form>
      } @else {
        <!-- Staff Login / Forgot Password Flow -->
        @switch (forgotStep()) {
          @case ('none') {
            <!-- Normal Login -->
            <h2>Doctor login</h2>
            <p class="muted">Doctors and admins use internal credentials.</p>

            <form (ngSubmit)="loginStaff()">
              <label>
                Email
                <input name="email" [(ngModel)]="staff.email" placeholder="doctor@vitalisclinic.local" />
              </label>
              <label>
                Password
                <input name="password" type="password" [(ngModel)]="staff.password" placeholder="Password@123" />
              </label>
              <button class="primary" type="submit" [disabled]="isProcessing()">Login</button>
            </form>

            <button type="button" class="link-btn" (click)="goToForgotStep('email')">
              Forgot password?
            </button>
          }

          @case ('email') {
            <!-- Step 1: Enter email -->
            <button type="button" class="back-btn" (click)="goToForgotStep('none')">← Back to login</button>
            <h2>Forgot password</h2>
            <p class="muted">Enter your registered email to receive a password reset link.</p>

            <form (ngSubmit)="forgotPassword()">
              <label>
                Staff email
                <input name="forgotEmail" [(ngModel)]="forgot.email" placeholder="doctor@vitalisclinic.local" />
              </label>
              <button class="primary" type="submit" [disabled]="isProcessing()">Send reset link</button>
            </form>
          }

          @case ('sent') {
            <!-- Step 2: Link sent, waiting for user to click -->
            <button type="button" class="back-btn" (click)="goToForgotStep('none')">← Back to login</button>
            <div class="success-notice">
              <span class="notice-icon">✓</span>
              <h2>Reset link sent</h2>
            </div>
            <p class="muted">We've sent a password reset link to <strong>{{ forgot.email }}</strong>. Please check your inbox and click the link.</p>

            <div class="step-divider">
              <span>After clicking the link</span>
            </div>

            <button class="primary" type="button" (click)="goToForgotStep('reset')">
              I've clicked the link → Enter new password
            </button>

            <button type="button" class="link-btn" (click)="forgotPassword()">
              Didn't receive? Resend link
            </button>
          }

          @case ('reset') {
            <!-- Step 3: Enter new password -->
            <button type="button" class="back-btn" (click)="goToForgotStep('sent')">← Back</button>
            <h2>Set new password</h2>
            <p class="muted">Enter your new password below.</p>

            <form (ngSubmit)="resetPassword()">
              <label>
                New password
                <input name="newPassword" type="password" [(ngModel)]="forgot.password" placeholder="Enter new password" />
              </label>
              <label>
                Confirm password
                <input name="confirmPassword" type="password" [(ngModel)]="forgot.confirmPassword" placeholder="Confirm new password" />
              </label>
              @if (forgot.password && forgot.confirmPassword && forgot.password !== forgot.confirmPassword) {
                <p class="error-text">Passwords do not match</p>
              }
              <button class="primary" type="submit" [disabled]="isProcessing() || !canResetPassword()">Reset password & login</button>
            </form>
          }
        }
      }
    </div>
  `
})
export class AuthFormOverlayComponent {
  private readonly overlayData = (inject(APP_OVERLAY_DATA) as AuthFormOverlayData | null) || {};
  readonly mode = signal<'patient' | 'staff'>(this.overlayData.mode || 'patient');
  readonly isProcessing = signal(false);
  readonly forgotStep = signal<ForgotStep>('none');
  private activeOverlayRef?: AppOverlayRef;

  patient = {
    name: 'Patient',
    mobile: '9876543210',
    otp: '123456'
  };

  staff = {
    email: 'admin@vitalisclinic.local',
    password: 'Password@123'
  };

  forgot = {
    email: 'admin@vitalisclinic.local',
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
              this.forgot.password.length >= 6);
  }

  requestOtp() {
    this.process('Sending OTP...', this.auth.requestOtp(this.patient.mobile)).subscribe({
      next: (response) => this.showSuccess(`OTP sent successfully. Development OTP: ${response.devOtp}`),
      error: () => this.showError('Could not request OTP.')
    });
  }

  loginPatient() {
    this.process('Logging in patient...', this.auth.patientLogin(this.patient)).subscribe({
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
    this.process('Sending reset link...', this.auth.forgotPassword(this.forgot.email)).subscribe({
      next: () => {
        this.closeActiveOverlay();
        this.goToForgotStep('sent');
      },
      error: () => this.showError('Could not send reset link.')
    });
  }

  resetPassword() {
    this.process('Resetting password...', this.auth.resetPassword({ token: '', password: this.forgot.password })).subscribe({
      next: ({ user }) => {
        this.closeAllOverlays();
        this.router.navigateByUrl(this.auth.dashboardFor(user.role));
      },
      error: (error) => this.showError(error.error?.message || 'Password reset failed.')
    });
  }

  loginWithGoogle() {
    this.process('Signing in with Google...', this.auth.googleLogin()).subscribe({
      next: (response) => this.showSuccess(response.message || 'Google sign-in initiated.'),
      error: (error) => this.showError(error.error?.message || 'Google login failed.')
    });
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
