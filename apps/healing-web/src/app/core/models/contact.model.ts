export interface ContactForm {
    name: string;
    email: string;
    phone?: string;
    serviceInterest?: string;
    message: string;
    preferredContact: ContactMethod;
}

export enum ContactMethod {
    EMAIL = 'email',
    PHONE = 'phone',
    TELEGRAM = 'telegram'
}