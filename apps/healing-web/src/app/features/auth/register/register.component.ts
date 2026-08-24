import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RegisterCredentials } from '../../../core/models/auth.model';
import { AppButtonComponent } from '../../../shared/components/app-button/app-button.component';
import {
  captureReferralAttribution,
  clearReferralAttribution,
} from '../../../core/utils/referral-attribution.util';
import {
  HOPE_HUB_ANALYTICS_EVENTS,
  ProductAnalyticsService,
} from '../../../core/services/product-analytics.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, AppButtonComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private authModalService = inject(AuthModalService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private productAnalytics = inject(ProductAnalyticsService);

  registerForm: FormGroup;
  activeAction = signal<'register' | 'google' | null>(null);
  isLoading = computed(() => this.activeAction() !== null);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      referralCode: [''],
    });

    // Clear messages when form values change
    this.registerForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
      if (this.successMessage()) {
        this.successMessage.set(null);
      }
    });

    // Listen to auth state changes
    this.authService.authState$.pipe(takeUntilDestroyed()).subscribe((state: any) => {
      if (state.error) {
        this.errorMessage.set(state.error);
      }
    });
  }

  ngOnInit(): void {
    const referralCode = captureReferralAttribution(this.route.snapshot.queryParamMap.get('ref'));
    if (referralCode) this.registerForm.patchValue({ referralCode });
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.valid && !this.isLoading()) {
      this.activeAction.set('register');
      try {
        const formValue = this.registerForm.value;
        const credentials: RegisterCredentials = {
          email: formValue.email,
          password: formValue.password,
          referralCode: formValue.referralCode?.trim() || undefined,
        };

        await this.authService.register(credentials);
        this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.REGISTRATION_COMPLETED, {
          method: 'email',
        });
        clearReferralAttribution();

        this.successMessage.set('Account created successfully.');
        this.notificationService.success('Account created successfully.');

        // Registration returns a patient session, so keep the user on the current page.
        setTimeout(() => {
          this.authModalService.close();
        }, 800);
      } catch (error) {
        // Error is handled by the auth service and displayed via the subscription
        this.notificationService.error(
          this.readErrorMessage(error, 'Could not create your account. Please try again.'),
        );
        console.error('Registration error:', error);
      } finally {
        this.activeAction.set(null);
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.registerForm.controls).forEach((key) => {
        this.registerForm.get(key)?.markAsTouched();
      });
      this.notificationService.warning('Please enter your email and password.');
    }
  }

  async registerWithGoogle(): Promise<void> {
    if (this.isLoading()) return;
    this.activeAction.set('google');
    try {
      await this.authService.loginWithGoogle(
        this.registerForm.get('referralCode')?.value?.trim() || undefined,
      );
      this.productAnalytics.track(HOPE_HUB_ANALYTICS_EVENTS.REGISTRATION_COMPLETED, {
        method: 'google',
      });
      clearReferralAttribution();
      this.notificationService.success('Account ready. You are signed in with Google.');
      this.authModalService.close();
      if (this.router.url === '/' || this.router.url.startsWith('/auth')) {
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      // Error is handled by the auth service and displayed via the subscription
      this.notificationService.error(
        this.readErrorMessage(error, 'Google sign-up failed. Please try again.'),
      );
      console.error('Google registration error:', error);
    } finally {
      this.activeAction.set(null);
    }
  }

  openLogin(): void {
    this.authModalService.openLogin();
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = String(error.message || '').trim();
      if (message) return message;
    }

    return fallback;
  }
}
