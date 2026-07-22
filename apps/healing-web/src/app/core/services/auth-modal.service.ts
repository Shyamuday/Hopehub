import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type AuthModalType = 'login' | 'register' | 'forgot-password' | null;

@Injectable({
    providedIn: 'root'
})
export class AuthModalService {
    private modalStateSubject = new BehaviorSubject<AuthModalType>(null);
    public modalState$: Observable<AuthModalType> = this.modalStateSubject.asObservable();

    openLogin(): void {
        this.modalStateSubject.next('login');
    }

    openRegister(): void {
        this.modalStateSubject.next('register');
    }

    openForgotPassword(): void {
        this.modalStateSubject.next('forgot-password');
    }

    close(): void {
        this.modalStateSubject.next(null);
    }

    getCurrentModal(): AuthModalType {
        return this.modalStateSubject.value;
    }
}

