import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth/auth.service';

type BookStep = 'form' | 'otp' | 'loading' | 'done';

@Component({
  selector: 'app-home-hero-section',
  imports: [CommonModule, FormsModule],
  styles: [`
    .booking-card {
      background: #fff;
      border: 1.5px solid #e5e7eb;
      border-radius: 16px;
      padding: 1.5rem 1.75rem;
      margin-top: 1.5rem;
      box-shadow: 0 2px 12px rgba(0,0,0,.06);
      max-width: 440px;
    }
    .booking-card h3 {
      margin: 0 0 .1rem;
      font-size: 1.05rem;
      font-weight: 700;
      color: #111827;
    }
    .booking-card .bc-sub {
      font-size: .83rem;
      color: #6b7280;
      margin: 0 0 1rem;
    }
    .bc-fields {
      display: flex;
      flex-direction: column;
      gap: .65rem;
    }
    .bc-fields input {
      width: 100%;
      box-sizing: border-box;
      border: 1.5px solid #d1d5db;
      border-radius: 10px;
      padding: .65rem .85rem;
      font-size: .93rem;
      outline: none;
      transition: border-color .15s;
      &:focus { border-color: #2563eb; }
    }
    .bc-btn {
      width: 100%;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: .7rem 1rem;
      font-size: .95rem;
      font-weight: 700;
      cursor: pointer;
      margin-top: .25rem;
      transition: background .15s;
      &:hover:not(:disabled) { background: #1d4ed8; }
      &:disabled { opacity: .55; cursor: not-allowed; }
    }
    .bc-error {
      color: #dc2626;
      font-size: .8rem;
      margin: .4rem 0 0;
    }
    .bc-hint {
      font-size: .78rem;
      color: #9ca3af;
      margin: .5rem 0 0;
      text-align: center;
    }
    .bc-otp-who {
      font-size: .83rem;
      color: #374151;
      margin: 0 0 .85rem;
      strong { color: #111827; }
    }
    .bc-back {
      background: none;
      border: none;
      color: #6b7280;
      font-size: .8rem;
      cursor: pointer;
      padding: .35rem 0 0;
      text-decoration: underline;
      &:hover { color: #374151; }
    }
    .bc-loading {
      display: flex;
      align-items: center;
      gap: .6rem;
      color: #6b7280;
      font-size: .9rem;
      padding: .5rem 0;
    }
    .bc-spinner {
      width: 18px;
      height: 18px;
      border: 2.5px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .bc-done {
      text-align: center;
      padding: .25rem 0;
      font-size: .9rem;
      color: #065f46;
      font-weight: 600;
    }
  `],
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
      setTimeout(() => void this.router.navigateByUrl(this.auth.dashboardFor(response.user.role)), 600);
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
