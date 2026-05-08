import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { APP_OVERLAY_DATA, APP_OVERLAY_REF } from '../overlay.tokens';
import { type AppOverlayRef, AppOverlayService } from '../overlay.service';
import { AuthStatusOverlayComponent } from './auth-status-overlay.component';
import { AuthService } from './auth.service';
import { GoogleSignInButtonComponent } from './google-sign-in-button.component';
import { environment } from '../../environments/environment';

type AuthFormOverlayData = {
  mode?: 'patient' | 'staff';
  initialForgotStep?: ForgotStep;
};

type ForgotStep = 'none' | 'email' | 'sent' | 'reset';

type PatientAuthStep = 'signin' | 'register' | 'forgot' | 'forgot-sent' | 'reset';

@Component({
  selector: 'app-auth-form-overlay',
  imports: [CommonModule, FormsModule, GoogleSignInButtonComponent],
  template: `
    <div class="auth-card">
      <p class="eyebrow">Vitalis Care and Research Centre</p>

      @if (mode() === 'patient') {
        @switch (patientStep()) {
          @case ('signin') {
            <h2>Login to continue</h2>
            <p class="muted">Sign in with the email or mobile number registered on your account.</p>

            <form (ngSubmit)="loginPatientWithPassword()">
              <label>
                Email or mobile number
                <input
                  name="identifier"
                  [(ngModel)]="patientCredentials.identifier"
                  placeholder="Enter email or mobile number"
                  autocomplete="username"
                />
              </label>
              <label>
                Password
                <input
                  name="patientPassword"
                  type="password"
                  [(ngModel)]="patientCredentials.password"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                />
              </label>
              <button class="primary" type="submit" [disabled]="isProcessing()">Login</button>
            </form>

            <div class="auth-sub-actions">
              <button type="button" class="auth-text-link" (click)="goPatientStep('register')">
                Mobile number &amp; OTP
              </button>
              <span class="auth-sub-sep" aria-hidden="true">·</span>
              <button type="button" class="auth-text-link" (click)="goPatientStep('forgot')">
                Forgot password?
              </button>
            </div>

            <div class="divider-text">or continue with Google</div>
            <form (ngSubmit)="loginWithGoogle()">
              <button class="secondary" type="submit" [disabled]="isProcessing()">Continue with Google</button>
              <p class="muted">Uses the Google provider configured in Supabase Auth.</p>
            </form>
          }

          @case ('register') {
            <button type="button" class="back-btn" (click)="goPatientStep('signin')">← Back to login</button>
            <h2>Mobile number &amp; OTP</h2>
            <p class="muted">
              Enter your <strong>mobile number</strong>. Tap <strong>Send OTP</strong>, enter the code (SMS or, in development, the
              code shown on screen), then tap <strong>Continue with OTP</strong>. Works for new and existing patients — no name
              required.
            </p>

            <form (ngSubmit)="loginPatientWithOtp()">
              <label>
                Mobile number
                <input name="otpMobile" [(ngModel)]="patientOtp.mobile" placeholder="Enter 10-digit mobile number" />
              </label>
              <div class="otp-row">
                <label>
                  OTP
                  <input name="otpCode" [(ngModel)]="patientOtp.otp" placeholder="Enter 6-digit OTP" />
                </label>
                <button type="button" class="secondary" [disabled]="isProcessing()" (click)="requestOtp()">
                  Send OTP
                </button>
              </div>
              <button class="secondary" type="submit" [disabled]="isProcessing()">Continue with OTP</button>
            </form>
          }

          @case ('forgot') {
            <button type="button" class="back-btn" (click)="goPatientStep('signin')">← Back to login</button>
            <h2>Forgot password</h2>
            <p class="muted">Enter the <strong>email</strong> on your account. We’ll send a reset link.</p>

            <form (ngSubmit)="forgotPassword()">
              <label>
                Email
                <input
                  name="patientForgotEmail"
                  type="email"
                  [(ngModel)]="forgot.email"
                  placeholder="you@example.com"
                  autocomplete="email"
                />
              </label>
              <button class="primary" type="submit" [disabled]="isProcessing()">Send reset link</button>
            </form>
          }

          @case ('forgot-sent') {
            <button type="button" class="back-btn" (click)="goPatientStep('signin')">← Back to login</button>
            <div class="success-notice">
              <span class="notice-icon">✓</span>
              <h2>Reset link sent</h2>
            </div>
            <p class="muted">
              We’ve sent a password reset link to <strong>{{ forgot.email }}</strong>. Please check your inbox and click
              the link.
            </p>

            <div class="step-divider">
              <span>After clicking the link</span>
            </div>

            <button class="primary" type="button" (click)="goPatientStep('reset')">
              I’ve clicked the link → Enter new password
            </button>

            <button type="button" class="link-btn" (click)="forgotPassword()">Didn’t receive? Resend link</button>
          }

          @case ('reset') {
            <button type="button" class="back-btn" (click)="goPatientStep('signin')">← Back to login</button>
            <h2>Set new password</h2>
            <p class="muted">Enter your new password below.</p>

            <form (ngSubmit)="resetPassword()">
              <label>
                New password
                <input
                  name="newPatientPassword"
                  type="password"
                  [(ngModel)]="forgot.password"
                  placeholder="Min 8 characters"
                  autocomplete="new-password"
                />
              </label>
              <label>
                Confirm password
                <input
                  name="confirmPatientPassword"
                  type="password"
                  [(ngModel)]="forgot.confirmPassword"
                  placeholder="Confirm new password"
                  autocomplete="new-password"
                />
              </label>
              @if (forgot.password && forgot.confirmPassword && forgot.password !== forgot.confirmPassword) {
                <p class="error-text">Passwords do not match</p>
              }
              <button class="primary" type="submit" [disabled]="isProcessing() || !canResetPassword()">
                Reset password &amp; login
              </button>
            </form>
          }
        }
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

            <div class="divider-text">or continue with Google</div>
            @if (googleClientId) {
              <app-google-sign-in-button [clientId]="googleClientId" (credential)="loginStaffWithGoogle($event)" />
              <p class="muted">Staff Google sign-in: your Google email must match your doctor or admin account.</p>
            } @else {
              <p class="muted">For staff Google sign-in, set <code>googleClientId</code> in environment (same as API <code>GOOGLE_CLIENT_ID</code>).</p>
            }
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
                <input name="newPassword" type="password" [(ngModel)]="forgot.password" placeholder="Min 8 characters" />
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
  readonly forgotStep = signal<ForgotStep>(this.overlayData.initialForgotStep || 'none');
  readonly patientStep = signal<PatientAuthStep>(
    (this.overlayData.mode || 'patient') === 'patient' && this.overlayData.initialForgotStep === 'reset'
      ? 'reset'
      : 'signin'
  );
  private activeOverlayRef?: AppOverlayRef;

  patientCredentials = {
    identifier: '',
    password: ''
  };

  patientOtp = {
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

  readonly googleClientId = environment.googleClientId?.trim() || '';

  goToForgotStep(step: ForgotStep) {
    this.forgotStep.set(step);
  }

  goPatientStep(step: PatientAuthStep) {
    if (step === 'forgot') {
      this.forgot.email = '';
    }
    if (step === 'signin') {
      this.forgot.password = '';
      this.forgot.confirmPassword = '';
    }
    this.patientStep.set(step);
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

  loginStaffWithGoogle(idToken: string) {
    this.process('Signing in with Google...', this.auth.staffGoogleLogin(idToken)).subscribe({
      next: ({ user }) => {
        this.closeAllOverlays();
        this.router.navigateByUrl(this.auth.dashboardFor(user.role));
      },
      error: (error) => this.showError(error.error?.message || 'Google sign-in failed.')
    });
  }

  forgotPassword() {
    this.process('Sending reset link...', this.auth.forgotPassword(this.forgot.email)).subscribe({
      next: () => {
        this.closeActiveOverlay();
        if (this.mode() === 'patient') {
          this.patientStep.set('forgot-sent');
        } else {
          this.goToForgotStep('sent');
        }
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
