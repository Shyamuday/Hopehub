import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AppButtonComponent } from '../../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, AppButtonComponent],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private authModalService = inject(AuthModalService);
  private notificationService = inject(NotificationService);

  resetForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  emailSent = signal(false);

  constructor() {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    // Clear messages when form values change
    this.resetForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
      if (this.successMessage()) {
        this.successMessage.set(null);
      }
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  async onSubmit(): Promise<void> {
    if (this.resetForm.valid && !this.isLoading()) {
      try {
        this.isLoading.set(true);
        this.errorMessage.set(null);

        await this.authService.resetPassword({
          email: this.resetForm.value.email,
        });

        this.emailSent.set(true);
        this.successMessage.set('Password reset email sent successfully!');
        this.notificationService.success('Password reset email sent successfully.');
      } catch (error: any) {
        const message = error.message || 'Failed to send reset email. Please try again.';
        this.errorMessage.set(message);
        this.notificationService.error(message);
      } finally {
        this.isLoading.set(false);
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.resetForm.controls).forEach((key) => {
        this.resetForm.get(key)?.markAsTouched();
      });
      this.notificationService.warning('Please enter a valid email address.');
    }
  }

  async resendEmail(): Promise<void> {
    if (!this.isLoading()) {
      this.emailSent.set(false);
      await this.onSubmit();
    }
  }

  openLogin(): void {
    this.authModalService.openLogin();
  }
}
