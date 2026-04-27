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

@Component({
  selector: 'app-auth-form-overlay',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="auth-card">
      <p class="eyebrow">Vitalis Care</p>
      <h2>{{ mode() === 'staff' ? 'Doctor login' : 'Login to continue' }}</h2>
      <p class="muted">{{ mode() === 'staff' ? 'Doctors and admins use internal credentials.' : 'Patients use mobile OTP.' }}</p>

      @if (mode() === 'patient') {
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

        <div class="forgot-box">
          <h3>Forgot password</h3>
          <label>
            Staff email
            <input name="forgotEmail" [(ngModel)]="forgot.email" placeholder="doctor@vitalisclinic.local" />
          </label>
          <button class="secondary" type="button" [disabled]="isProcessing()" (click)="forgotPassword()">Send reset link</button>
          <p class="muted">Open the email reset link, then enter a new password below.</p>

          <label>
            New password
            <input name="newPassword" type="password" [(ngModel)]="forgot.password" placeholder="New password" />
          </label>
          <button class="secondary" type="button" [disabled]="isProcessing()" (click)="resetPassword()">Reset and login</button>
        </div>
      }
    </div>
  `
})
export class AuthFormOverlayComponent {
  private readonly overlayData = (inject(APP_OVERLAY_DATA) as AuthFormOverlayData | null) || {};
  readonly mode = signal<'patient' | 'staff'>(this.overlayData.mode || 'patient');
  readonly isProcessing = signal(false);
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
    password: 'Password@123'
  };

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly overlayService = inject(AppOverlayService);
  private readonly hostOverlayRef = inject(APP_OVERLAY_REF) as AppOverlayRef;

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
      next: (response) => this.showSuccess(response.message || 'Reset link sent successfully.'),
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
