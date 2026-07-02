import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { POST_LOGIN_REDIRECT_DELAY_MS } from './core/constants/timing.constants';
import { AuthService } from './auth/auth.service';

type BookStep = 'form' | 'otp' | 'loading' | 'done';

@Component({
  selector: 'app-home-hero-section',
  imports: [CommonModule, FormsModule],
  styleUrl: './home-hero-section.component.scss',
  template: `
    <section class="panel hero-panel">
      <div class="home-hero">
        <p class="eyebrow">Vitalis Care and Research Centre | Doctor-led digital clinic</p>
        <h1>Chronic care that actually follows through.</h1>
        <p class="hero-copy">
          We specialize in long-running conditions that need deeper history, pattern tracking, and disciplined follow-up — not quick-fix consultations.
        </p>

        <!-- ── Inline booking card ── -->
        <div class="booking-card">
          @switch (step()) {
            @case ('form') {
              <h3>Book an appointment</h3>
              <p class="bc-sub">Enter your details — we'll send a one-time code to your mobile.</p>
              <div class="bc-fields">
                <input
                  name="bcName"
                  [(ngModel)]="name"
                  placeholder="Your full name"
                  autocomplete="name"
                />
                <input
                  name="bcMobile"
                  [(ngModel)]="mobile"
                  placeholder="Mobile number (10 digits)"
                  inputmode="tel"
                  autocomplete="tel"
                />
                <button class="bc-btn" type="button" [disabled]="busy()" (click)="sendOtp()">
                  {{ busy() ? 'Sending OTP…' : 'Book Appointment →' }}
                </button>
              </div>
              @if (error()) {
                <p class="bc-error">{{ error() }}</p>
              }
              <p class="bc-hint">No spam. OTP valid for 5 minutes.</p>
            }

            @case ('otp') {
              <h3>Verify your number</h3>
              <p class="bc-otp-who">
                OTP sent to <strong>{{ mobile }}</strong>
              </p>
              <div class="bc-fields">
                <input
                  name="bcOtp"
                  [(ngModel)]="otp"
                  placeholder="Enter 6-digit OTP"
                  inputmode="numeric"
                  maxlength="6"
                />
                <button class="bc-btn" type="button" [disabled]="busy() || otp.length < 4" (click)="verifyOtp()">
                  {{ busy() ? 'Verifying…' : 'Confirm & Continue →' }}
                </button>
              </div>
              @if (error()) {
                <p class="bc-error">{{ error() }}</p>
              }
              <button class="bc-back" type="button" (click)="goBack()">← Change number</button>
            }

            @case ('loading') {
              <div class="bc-loading">
                <div class="bc-spinner"></div>
                <span>Setting up your account…</span>
              </div>
            }

            @case ('done') {
              <div class="bc-done">✓ Verified! Taking you to your dashboard…</div>
            }
          }
        </div>

        <div class="hero-trust-row" style="margin-top:1.25rem">
          <div class="trust-item">
            <span class="trust-icon">✓</span>
            <span>Licensed doctors</span>
          </div>
          <div class="trust-item">
            <span class="trust-icon">✓</span>
            <span>Secure &amp; private</span>
          </div>
          <div class="trust-item">
            <span class="trust-icon">✓</span>
            <span>Follow-up included</span>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeHeroSectionComponent {
  @Input() whatsappLink = '';

  name = '';
  mobile = '';
  otp = '';

  readonly step = signal<BookStep>('form');
  readonly busy = signal(false);
  readonly error = signal('');

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  async sendOtp() {
    const name = this.name.trim();
    const mobile = this.mobile.trim().replace(/\s+/g, '');
    if (!name) { this.error.set('Please enter your full name.'); return; }
    if (!/^\d{10}$/.test(mobile)) { this.error.set('Enter a valid 10-digit mobile number.'); return; }

    this.error.set('');
    this.busy.set(true);
    try {
      await firstValueFrom(this.auth.requestOtp(mobile));
      this.mobile = mobile;
      this.step.set('otp');
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Could not send OTP. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  async verifyOtp() {
    if (!this.otp.trim()) { this.error.set('Enter the OTP.'); return; }
    this.error.set('');
    this.busy.set(true);
    this.step.set('loading');
    try {
      const response = await firstValueFrom(
        this.auth.patientLogin({ name: this.name.trim(), mobile: this.mobile, otp: this.otp.trim() })
      );
      this.step.set('done');
      setTimeout(() => void this.router.navigateByUrl(this.auth.dashboardFor(response.user.role)), POST_LOGIN_REDIRECT_DELAY_MS);
    } catch (err: any) {
      this.step.set('otp');
      this.error.set(err?.error?.message || 'Incorrect OTP. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  goBack() {
    this.otp = '';
    this.error.set('');
    this.step.set('form');
  }
}
