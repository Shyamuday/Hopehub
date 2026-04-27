import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, finalize } from 'rxjs';
import { AuthService } from './auth.service';
import { AppFooterComponent } from '../app-footer.component';
import { AppHeaderComponent } from '../app-header.component';


@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, AppHeaderComponent, AppFooterComponent],
  template: `
    <section class="public-shell">
      <app-header subtitle="Digital clinic" [whatsappLink]="whatsappLink" />

      <main class="auth-page">
        <div class="home-hero">
          <p class="eyebrow">Vitalis Clinic</p>
          <h1>Doctor-led care for your health concerns.</h1>
          <p class="hero-copy">
            Choose your health concern, complete a short intake, pay securely, and get assigned to our internal doctor panel.
          </p>

          <div class="home-actions">
            <a class="primary home-action" href="#login-card">Book consultation</a>
            <a class="whatsapp-action" [href]="whatsappLink" target="_blank" rel="noopener">
              Chat on WhatsApp
            </a>
          </div>

          <div class="trust-grid">
            <div>
              <strong>₹499</strong>
              <span>Hair fall consult</span>
            </div>
            <div>
              <strong>Chat-first</strong>
              <span>Low data usage</span>
            </div>
            <div>
              <strong>Private</strong>
              <span>No public doctor listings</span>
            </div>
          </div>
        </div>

        <div class="auth-card">
          <span id="login-card"></span>
          <p class="eyebrow">Vitalis Clinic</p>
          <h2>Login to continue</h2>
          <p class="muted">Patients use mobile OTP. Doctors and admins use internal credentials.</p>

          <div class="tabs">
            <button [disabled]="isProcessing()" [class.active]="mode() === 'patient'" (click)="mode.set('patient')">Patient</button>
            <button [disabled]="isProcessing()" [class.active]="mode() === 'staff'" (click)="mode.set('staff')">Doctor/Admin</button>
          </div>

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

          @if (message()) {
            <p class="notice">{{ message() }}</p>
          }
        </div>
      </main>

      <app-footer [whatsappLink]="whatsappLink" />

      @if (isProcessing()) {
        <div class="process-overlay" aria-live="polite" aria-busy="true">
          <div class="process-card">
            <span class="spinner"></span>
            <strong>{{ processLabel() }}</strong>
            <small>Please wait while we securely process your request.</small>
          </div>
        </div>
      }

      <a class="whatsapp-float" [href]="whatsappLink" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
        WhatsApp
      </a>
    </section>
  `
})
export class LoginComponent {
  readonly mode = signal<'patient' | 'staff'>('patient');
  readonly message = signal('');
  readonly isProcessing = signal(false);
  readonly processLabel = signal('Processing...');
  readonly whatsappLink =
    'https://wa.me/919876543210?text=Hi%20Vitalis%20Clinic%2C%20I%20want%20to%20book%20a%20consultation';

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

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) { }

  requestOtp() {
    this.process('Sending OTP...', this.auth.requestOtp(this.patient.mobile)).subscribe({
      next: (response) => this.message.set(`Development OTP: ${response.devOtp}`),
      error: () => this.message.set('Could not request OTP.')
    });
  }

  loginPatient() {
    this.process('Logging in patient...', this.auth.patientLogin(this.patient)).subscribe({
      next: ({ user }) => this.router.navigateByUrl(this.auth.dashboardFor(user.role)),
      error: (error) => this.message.set(error.error?.message || 'Patient login failed.')
    });
  }

  loginStaff() {
    this.process('Logging in staff...', this.auth.staffLogin(this.staff)).subscribe({
      next: ({ user }) => this.router.navigateByUrl(this.auth.dashboardFor(user.role)),
      error: (error) => this.message.set(error.error?.message || 'Staff login failed.')
    });
  }

  forgotPassword() {
    this.process('Sending reset link...', this.auth.forgotPassword(this.forgot.email)).subscribe({
      next: (response) => {
        this.message.set(response.message);
      },
      error: () => this.message.set('Could not send reset link.')
    });
  }

  resetPassword() {
    this.process('Resetting password...', this.auth.resetPassword({ token: '', password: this.forgot.password })).subscribe({
      next: ({ user }) => this.router.navigateByUrl(this.auth.dashboardFor(user.role)),
      error: (error) => this.message.set(error.error?.message || 'Password reset failed.')
    });
  }

  loginWithGoogle() {
    this.process('Signing in with Google...', this.auth.googleLogin()).subscribe({
      next: (response) => this.message.set(response.message),
      error: (error) => this.message.set(error.error?.message || 'Google login failed.')
    });
  }

  private process<T>(label: string, request$: Observable<T>) {
    this.message.set('');
    this.processLabel.set(label);
    this.isProcessing.set(true);

    return request$.pipe(finalize(() => this.isProcessing.set(false)));
  }
}
