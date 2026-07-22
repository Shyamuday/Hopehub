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
    styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private authModalService = inject(AuthModalService);

    loginForm: FormGroup;
    isLoading = signal(false);
    errorMessage = signal<string | null>(null);

    constructor() {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            rememberMe: [false]
        });

        // Clear error when form values change
        this.loginForm.valueChanges
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                if (this.errorMessage()) {
                    this.errorMessage.set(null);
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

    async onSubmit(): Promise<void> {
        if (this.loginForm.valid && !this.isLoading()) {
            try {
                const credentials: LoginCredentials = {
                    email: this.loginForm.value.email,
                    password: this.loginForm.value.password
                };

                await this.authService.login(credentials);

                // Close modal and navigate
                this.authModalService.close();
                this.router.navigate(['/dashboard']);
            } catch (error) {
                // Error is handled by the auth service and displayed via the subscription
                console.error('Login error:', error);
            }
        } else {
            // Mark all fields as touched to show validation errors
            Object.keys(this.loginForm.controls).forEach(key => {
                this.loginForm.get(key)?.markAsTouched();
            });
        }
    }

    async loginWithGoogle(): Promise<void> {
        try {
            await this.authService.loginWithGoogle();
            this.authModalService.close();
            this.router.navigate(['/dashboard']);
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
