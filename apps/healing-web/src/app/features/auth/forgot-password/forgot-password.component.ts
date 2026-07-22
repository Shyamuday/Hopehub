import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule],
    templateUrl: './forgot-password.component.html',
    styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private authModalService = inject(AuthModalService);

    resetForm: FormGroup;
    isLoading = signal(false);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);
    emailSent = signal(false);

    constructor() {
        this.resetForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });

        // Clear messages when form values change
        this.resetForm.valueChanges
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
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
                    email: this.resetForm.value.email
                });

                this.emailSent.set(true);
                this.successMessage.set('Password reset email sent successfully!');
            } catch (error: any) {
                this.errorMessage.set(error.message || 'Failed to send reset email. Please try again.');
            } finally {
                this.isLoading.set(false);
            }
        } else {
            // Mark all fields as touched to show validation errors
            Object.keys(this.resetForm.controls).forEach(key => {
                this.resetForm.get(key)?.markAsTouched();
            });
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
