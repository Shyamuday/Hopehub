import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { LoginCredentials } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private authModalService = inject(AuthModalService);

  loginForm: FormGroup;
  loginMode = signal<'otp' | 'password'>('otp');
  otpSent = signal(false);
  otpSentTo = signal('');
  isLoading = signal(false);
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

        // Close modal and navigate
        this.authModalService.close();
        if (this.router.url === '/' || this.router.url.startsWith('/auth')) {
          this.router.navigate(['/dashboard']);
        }
      } catch (error) {
        // Error is handled by the auth service and displayed via the subscription
        console.error('Login error:', error);
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
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
      this.statusMessage.set('OTP sent. Check your email and enter the code below.');
    } catch (error) {
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
      this.errorMessage.set('Send OTP to this email first.');
      return;
    }
    if (!otp?.value || String(otp.value).trim().length < 4) {
      this.errorMessage.set('Enter the OTP sent to your email.');
      return;
    }

    try {
      await this.authService.loginWithOtp(normalizedEmail, String(otp.value).trim());
      this.authModalService.close();
      if (this.router.url === '/' || this.router.url.startsWith('/auth')) {
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('OTP login error:', error);
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      await this.authService.loginWithGoogle();
      this.authModalService.close();
      if (this.router.url === '/' || this.router.url.startsWith('/auth')) {
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      // Error is handled by the auth service and displayed via the subscription
      console.error('Google login error:', error);
    }
  }

  openRegister(): void {
    this.authModalService.openRegister();
  }

  openForgotPassword(): void {
    this.authModalService.openForgotPassword();
  }
}
