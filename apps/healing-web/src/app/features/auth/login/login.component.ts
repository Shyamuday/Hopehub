import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LoginCredentials } from '../../../core/models/auth.model';
import { AppButtonComponent } from '../../../shared/components/app-button/app-button.component';
import {
  captureReferralAttribution,
  clearReferralAttribution,
} from '../../../core/utils/referral-attribution.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, AppButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authModalService = inject(AuthModalService);
  private notificationService = inject(NotificationService);

  loginForm: FormGroup;
  loginMode = signal<'otp' | 'password'>('otp');
  otpSent = signal(false);
  otpSentTo = signal('');
  isLoading = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  statusMessage = signal<string | null>(null);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      otp: [''],
      rememberMe: [false],
    });

    // Clear error when form values change
    this.loginForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
      const email = String(this.loginForm.get('email')?.value || '')
        .trim()
        .toLowerCase();
      if (this.otpSentTo() && email !== this.otpSentTo()) {
        this.otpSent.set(false);
        this.otpSentTo.set('');
        this.loginForm.patchValue({ otp: '' }, { emitEvent: false });
        this.statusMessage.set(null);
      }
    });

    // Listen to auth state changes
    this.authService.authState$.pipe(takeUntilDestroyed()).subscribe((state: any) => {
      this.isLoading.set(state.isLoading);
      if (state.error) {
        this.errorMessage.set(state.error);
      }
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  async onSubmit(): Promise<void> {
    if (this.loginMode() === 'otp') {
      if (!this.otpSent()) {
        await this.sendOtp();
        return;
      }
      await this.verifyOtp();
      return;
    }

    if (this.loginForm.valid && !this.isLoading()) {
      try {
        const credentials: LoginCredentials = {
          email: this.loginForm.value.email,
          password: this.loginForm.value.password,
        };

        await this.authService.login(credentials);
        clearReferralAttribution();
        this.notificationService.success('You are signed in.');

        // Close modal and navigate
        this.authModalService.close();
        await this.continueAfterLogin();
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'PATIENT_PASSWORD_NOT_SET'
        ) {
          this.setLoginMode('otp');
        }
        this.notificationService.error(
          this.readErrorMessage(error, 'Sign in failed. Please try again.'),
        );
        console.error('Login error:', error);
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
      this.notificationService.warning('Please enter valid sign-in details.');
    }
  }

  setLoginMode(mode: 'otp' | 'password'): void {
    this.loginMode.set(mode);
    this.errorMessage.set(null);
    this.statusMessage.set(null);
    if (mode === 'password') {
      this.otpSent.set(false);
      this.otpSentTo.set('');
      this.loginForm.patchValue({ otp: '' }, { emitEvent: false });
    }
  }

  changeOtpEmail(): void {
    this.otpSent.set(false);
    this.otpSentTo.set('');
    this.statusMessage.set(null);
    this.errorMessage.set(null);
    this.loginForm.patchValue({ otp: '' }, { emitEvent: false });
  }

  async sendOtp(): Promise<void> {
    const emailControl = this.loginForm.get('email');
    emailControl?.markAsTouched();
    if (!emailControl?.valid || this.isLoading()) return;
    const email = String(emailControl.value || '')
      .trim()
      .toLowerCase();

    try {
      this.isLoading.set(true);
      await this.authService.requestOtp(email);
      this.loginForm.patchValue({ otp: '' }, { emitEvent: false });
      this.otpSent.set(true);
      this.otpSentTo.set(email);
      this.errorMessage.set(null);
      this.statusMessage.set('Code sent. Check your email.');
      this.notificationService.success('Code sent. Check your email.');
    } catch (error) {
      this.notificationService.error('Could not send the code. Please try again.');
      console.error('OTP request error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async verifyOtp(): Promise<void> {
    const email = this.loginForm.get('email');
    const otp = this.loginForm.get('otp');
    email?.markAsTouched();
    otp?.markAsTouched();
    const normalizedEmail = String(email?.value || '')
      .trim()
      .toLowerCase();
    if (!email?.valid || this.isLoading()) return;
    if (!this.otpSent() || this.otpSentTo() !== normalizedEmail) {
      const message = 'Send a code first.';
      this.errorMessage.set(message);
      this.notificationService.warning(message);
      return;
    }
    if (!otp?.value || String(otp.value).trim().length < 4) {
      const message = 'Enter the code.';
      this.errorMessage.set(message);
      this.notificationService.warning(message);
      return;
    }

    try {
      await this.authService.loginWithOtp(
        normalizedEmail,
        String(otp.value).trim(),
        this.referralCode(),
      );
      clearReferralAttribution();
      this.notificationService.success('You are signed in.');
      this.authModalService.close();
      await this.continueAfterLogin();
    } catch (error) {
      this.errorMessage.set('Invalid or expired code. Send a new code and try again.');
      this.notificationService.error('Invalid or expired code. Send a new code and try again.');
      console.error('OTP login error:', error);
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      await this.authService.loginWithGoogle(this.referralCode());
      clearReferralAttribution();
      this.notificationService.success('You are signed in with Google.');
      this.authModalService.close();
      await this.continueAfterLogin();
    } catch (error) {
      // Error is handled by the auth service and displayed via the subscription
      this.notificationService.error(
        this.readErrorMessage(error, 'Google sign-in failed. Please try again.'),
      );
      console.error('Google login error:', error);
    }
  }

  private referralCode(): string | undefined {
    return captureReferralAttribution(this.route.snapshot.queryParamMap.get('ref'));
  }

  openRegister(): void {
    this.authModalService.openRegister();
  }

  openForgotPassword(): void {
    this.authModalService.openForgotPassword();
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = String(error.message || '').trim();
      if (message) return message;
    }

    return fallback;
  }

  private async continueAfterLogin(): Promise<void> {
    const returnUrl = this.authModalService.consumeReturnUrl();
    if (returnUrl) {
      await this.router.navigateByUrl(returnUrl);
      return;
    }
    if (this.router.url === '/' || this.router.url.startsWith('/auth')) {
      await this.router.navigate(['/dashboard']);
    }
  }
}
