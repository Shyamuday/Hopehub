import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { RegisterCredentials } from '../../../core/models/auth.model';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule],
    templateUrl: './register.component.html',
    styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private authModalService = inject(AuthModalService);

    registerForm: FormGroup;
    isLoading = signal(false);
    errorMessage = signal<string | null>(null);
    successMessage = signal<string | null>(null);

    constructor() {
        this.registerForm = this.fb.group({
            firstName: ['', [Validators.required]],
            lastName: ['', [Validators.required]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]],
            acceptTerms: [false, [Validators.requiredTrue]]
        }, { validators: this.passwordMatchValidator });

        // Clear messages when form values change
        this.registerForm.valueChanges
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                if (this.errorMessage()) {
                    this.errorMessage.set(null);
                }
                if (this.successMessage()) {
                    this.successMessage.set(null);
                }
            });

        // Listen to auth state changes
        this.authService.authState$
            .pipe(takeUntilDestroyed())
            .subscribe((state: any) => {
                this.isLoading.set(state.isLoading);
                if (state.error) {
                    this.errorMessage.set(state.error);
                }
            });
    }

    ngOnInit(): void {
        // Component initialization
    }

    passwordMatchValidator(form: AbstractControl): ValidationErrors | null {
        const password = form.get('password');
        const confirmPassword = form.get('confirmPassword');

        if (password && confirmPassword && password.value !== confirmPassword.value) {
            confirmPassword.setErrors({ passwordMismatch: true });
        } else if (confirmPassword?.errors?.['passwordMismatch']) {
            delete confirmPassword.errors['passwordMismatch'];
            if (Object.keys(confirmPassword.errors).length === 0) {
                confirmPassword.setErrors(null);
            }
        }
        return null;
    }

    async onSubmit(): Promise<void> {
        if (this.registerForm.valid && !this.isLoading()) {
            try {
                const formValue = this.registerForm.value;
                const credentials: RegisterCredentials = {
                    email: formValue.email,
                    password: formValue.password,
                    displayName: `${formValue.firstName} ${formValue.lastName}`,
                    firstName: formValue.firstName,
                    lastName: formValue.lastName
                };

                await this.authService.register(credentials);

                this.successMessage.set('Account created successfully! Please check your email to verify your account.');

                // Close modal and open login after a short delay
                setTimeout(() => {
                    this.authModalService.close();
                    setTimeout(() => {
                        this.authModalService.openLogin();
                    }, 300);
                }, 2000);
            } catch (error) {
                // Error is handled by the auth service and displayed via the subscription
                console.error('Registration error:', error);
            }
        } else {
            // Mark all fields as touched to show validation errors
            Object.keys(this.registerForm.controls).forEach(key => {
                this.registerForm.get(key)?.markAsTouched();
            });
        }
    }

    async registerWithGoogle(): Promise<void> {
        try {
            await this.authService.loginWithGoogle();
            this.authModalService.close();
            this.router.navigate(['/dashboard']);
        } catch (error) {
            // Error is handled by the auth service and displayed via the subscription
            console.error('Google registration error:', error);
        }
    }

    openLogin(): void {
        this.authModalService.openLogin();
    }
}
