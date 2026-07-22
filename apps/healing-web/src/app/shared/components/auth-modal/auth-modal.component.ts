import { Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { LoginComponent } from '../../../features/auth/login/login.component';
import { RegisterComponent } from '../../../features/auth/register/register.component';
import { ForgotPasswordComponent } from '../../../features/auth/forgot-password/forgot-password.component';

@Component({
    selector: 'app-auth-modal',
    standalone: true,
    imports: [LoginComponent, RegisterComponent, ForgotPasswordComponent],
    templateUrl: './auth-modal.component.html',
    styleUrl: './auth-modal.component.scss'
})
export class AuthModalComponent implements OnInit {
    private authModalService = inject(AuthModalService);

    currentModal = signal<'login' | 'register' | 'forgot-password' | null>(null);
    isOpen = signal(false);

    constructor() {
        this.authModalService.modalState$
            .pipe(takeUntilDestroyed())
            .subscribe((modal: 'login' | 'register' | 'forgot-password' | null) => {
                this.currentModal.set(modal);
                this.isOpen.set(modal !== null);
            });
    }

    ngOnInit(): void {
        // Component initialization
    }

    close(): void {
        this.authModalService.close();
    }

    openLogin(): void {
        this.authModalService.openLogin();
    }

    openRegister(): void {
        this.authModalService.openRegister();
    }

    openForgotPassword(): void {
        this.authModalService.openForgotPassword();
    }

    onBackdropClick(event: MouseEvent): void {
        // Close modal when clicking on backdrop
        if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
            this.close();
        }
    }
}

