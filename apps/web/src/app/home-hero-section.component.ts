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
  templateUrl: './home-hero-section.component.html'
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
