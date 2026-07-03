import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { POST_LOGIN_REDIRECT_DELAY_MS } from './core/constants/timing.constants';
import { AuthService } from './auth/auth.service';

type BookStep = 'form' | 'otp' | 'loading' | 'done';

@Component({
  selector: 'app-home-hero-section',
  imports: [CommonModule, FormField],
  styleUrl: './home-hero-section.component.scss',
  templateUrl: './home-hero-section.component.html',
})
export class HomeHeroSectionComponent {
  @Input() whatsappLink = '';

  readonly bookingFormModel = signal({ name: '', mobile: '', otp: '' });
  readonly bookingForm = form(this.bookingFormModel);

  readonly step = signal<BookStep>('form');
  readonly busy = signal(false);
  readonly error = signal('');

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async sendOtp() {
    const { name, mobile: rawMobile } = this.bookingFormModel();
    const trimmedName = name.trim();
    const mobile = rawMobile.trim().replace(/\s+/g, '');
    if (!trimmedName) {
      this.error.set('Please enter your full name.');
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      this.error.set('Enter a valid 10-digit mobile number.');
      return;
    }

    this.error.set('');
    this.busy.set(true);
    try {
      await firstValueFrom(this.auth.requestOtp(mobile));
      this.bookingFormModel.update((m) => ({ ...m, mobile }));
      this.step.set('otp');
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Could not send OTP. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  async verifyOtp() {
    const { otp } = this.bookingFormModel();
    if (!otp.trim()) {
      this.error.set('Enter the OTP.');
      return;
    }
    this.error.set('');
    this.busy.set(true);
    this.step.set('loading');
    try {
      const form = this.bookingFormModel();
      const response = await firstValueFrom(
        this.auth.patientLogin({
          name: form.name.trim(),
          mobile: form.mobile,
          otp: form.otp.trim(),
        }),
      );
      this.step.set('done');
      if ('user' in response) {
        setTimeout(
          () => void this.router.navigateByUrl(this.auth.dashboardFor(response.user.role)),
          POST_LOGIN_REDIRECT_DELAY_MS,
        );
      }
    } catch (err: any) {
      this.step.set('otp');
      this.error.set(err?.error?.message || 'Incorrect OTP. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  goBack() {
    this.bookingFormModel.update((m) => ({ ...m, otp: '' }));
    this.error.set('');
    this.step.set('form');
  }
}
