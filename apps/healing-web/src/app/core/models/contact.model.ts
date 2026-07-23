export interface ContactForm {
  name: string;
  email: string;
  phone?: string;
  serviceInterest?: string;
  urgencyLevel?: 'low' | 'normal' | 'high';
  preferredTime?: string;
  preferAnonymousTelegram?: boolean;
  message: string;
  preferredContact: ContactMethod;
}

export enum ContactMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
}
