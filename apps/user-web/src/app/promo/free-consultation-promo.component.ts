import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AuthFormOverlayComponent } from '../auth/auth-form-overlay.component';
import { APP_OVERLAY_REF } from '../overlay.tokens';
import { AppOverlayRef, AppOverlayService } from '../overlay.service';
import { POST_LOGIN_REDIRECT_DELAY_MS } from '../core/constants/timing.constants';
import type { PatientSelectionCandidate } from '../models';

type Step = 'register' | 'otp' | 'loading' | 'done';

@Component({
  selector: 'app-free-consultation-promo',
  standalone: true,
  imports: [CommonModule, FormField],
  templateUrl: './free-consultation-promo.component.html',
  styleUrl: './free-consultation-promo.component.scss'
})
export class FreeConsultationPromoComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly overlayService = inject(AppOverlayService);
  private readonly hostRef = inject(APP_OVERLAY_REF) as AppOverlayRef;

  readonly step = signal<Step>('register');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly patientSelection = signal<PatientSelectionCandidate[] | null>(null);

  readonly formModel = signal({ mobile: '', otp: '' });
  readonly form = form(this.formModel);

  close() {
    this.hostRef.close();
  }

  openFullLogin(event: Event) {
    event.preventDefault();
    this.hostRef.close();
    this.overlayService.open(AuthFormOverlayComponent, {
      width: '480px',
      panelClass: 'app-overlay-panel'
    });
  }

  async sendOtp() {
    const { mobile: rawMobile } = this.formModel();
    const mobile = rawMobile.trim().replace(/\s+/g, '');

    if (!/^\d{10}$/.test(mobile)) {
      this.error.set('Enter a valid 10-digit mobile number.');
      return;
    }

    this.error.set('');
    this.busy.set(true);
    try {
      await firstValueFrom(
        this.auth.requestOtp(mobile, {
          source: 'PROMO_POPUP',
          entryPage: typeof window !== 'undefined' ? window.location.pathname : undefined
        })
      );
      this.formModel.update((m) => ({ ...m, mobile }));
      this.step.set('otp');
    } catch (err: unknown) {
      const message = (err as { error?: { message?: string } })?.error?.message;
      this.error.set(message || 'Could not send OTP. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  async verifyAndRegister() {
    const { mobile, otp } = this.formModel();
    if (!otp.trim()) {
      this.error.set('Enter the OTP sent to your mobile.');
      return;
    }

    this.error.set('');
    this.busy.set(true);
    this.step.set('loading');
    try {
      const response = await firstValueFrom(
        this.auth.patientLogin({
          mobile,
          otp: otp.trim()
        })
      );

      if ('requiresPatientSelection' in response) {
        this.patientSelection.set(response.patients);
        this.step.set('otp');
        this.busy.set(false);
        return;
      }

      this.step.set('done');
      setTimeout(() => {
        this.hostRef.close();
        void this.router.navigateByUrl(this.auth.dashboardFor(response.user.role));
      }, POST_LOGIN_REDIRECT_DELAY_MS);
    } catch (err: unknown) {
      this.step.set('otp');
      const message = (err as { error?: { message?: string } })?.error?.message;
      this.error.set(message || 'Incorrect OTP. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  async selectPatient(patientId: string) {
    const { mobile, otp } = this.formModel();
    this.busy.set(true);
    try {
      const response = await firstValueFrom(
        this.auth.patientLoginSelect({ mobile, otp: otp.trim(), patientId })
      );
      this.step.set('done');
      setTimeout(() => {
        this.hostRef.close();
        void this.router.navigateByUrl(this.auth.dashboardFor(response.user.role));
      }, POST_LOGIN_REDIRECT_DELAY_MS);
    } catch (err: unknown) {
      const message = (err as { error?: { message?: string } })?.error?.message;
      this.error.set(message || 'Could not sign in. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }

  backToMobile() {
    this.formModel.update((m) => ({ ...m, otp: '' }));
    this.patientSelection.set(null);
    this.error.set('');
    this.step.set('register');
  }
}
