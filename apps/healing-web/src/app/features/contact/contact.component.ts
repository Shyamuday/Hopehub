import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { ContactForm } from '../../core/models/contact.model';
import {
  LeadService,
  LoadingService,
  AuthService,
  BookingService,
  PaymentService,
} from '../../core/services';
import { APP_CONSTANTS } from '../../core';
import { FEATURED_SERVICES, getAllServices } from '../../core/data/services-data';
import { AppointmentCalendarComponent, AppointmentSlot } from '../../shared/components';
import { User } from '../../core/models/auth.model';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, AppointmentCalendarComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent implements OnInit {
  APP_CONSTANTS = APP_CONSTANTS;
  readonly notes = NOTE_CONTENT;

  private formBuilder = inject(FormBuilder);
  private leadService = inject(LeadService);
  private loadingService = inject(LoadingService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private bookingService = inject(BookingService);
  private paymentService = inject(PaymentService);

  contactForm!: FormGroup;

  // Signal-based state
  isSubmitting = signal(false);
  showSuccessMessage = signal(false);
  showErrorMessage = signal(false);
  errorMessage = signal('');
  selectedAppointment = signal<AppointmentSlot | null>(null);
  prefilledData = signal<any>({});
  currentUser = signal<User | null>(null);
  services = getAllServices();

  constructor() {
    this.readQueryParameters();
    this.loadUserData();
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private loadUserData(): void {
    // Subscribe to auth state to get logged-in user
    this.authService.user$.pipe(takeUntilDestroyed()).subscribe((user: User | null) => {
      this.currentUser.set(user);
      // If form is already initialized, update it with user data
      if (this.contactForm) {
        this.updateFormWithUserData(user);
      }
    });
  }

  private readQueryParameters(): void {
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params: any) => {
      this.prefilledData.set({
        service: params['service'] || '',
        serviceName: params['serviceName'] || '',
        consultant: params['consultant'] || '',
        consultantPhone: params['consultantPhone'] || '',
        duration: params['duration'] || '',
        price: params['price'] || '',
        source: params['source'] || '',
      });
    });
  }

  private initializeForm(): void {
    // Determine initial service value and message
    const initialServiceValue =
      this.prefilledData().serviceName || this.prefilledData().service || '';
    const initialMessage = this.generateInitialMessage();

    // Get user data if logged in
    const user = this.currentUser();
    const userName = this.getUserName(user);
    const userEmail = user?.email || '';
    const userPhone = this.getUserPhone(user);

    this.contactForm = this.formBuilder.group({
      name: [userName, [Validators.required]],
      email: [userEmail, [Validators.required, Validators.email]],
      phone: [userPhone],
      serviceInterest: [initialServiceValue],
      urgencyLevel: ['normal', [Validators.required]],
      preferredTime: [''],
      preferAnonymousTelegram: [false],
      message: [initialMessage, [Validators.required, Validators.minLength(10)]],
      preferredContact: [user ? 'email' : 'whatsapp', [Validators.required]],
    });
  }

  private updateFormWithUserData(user: User | null): void {
    if (!user || !this.contactForm) return;

    const userName = this.getUserName(user);
    const userEmail = user.email || '';
    const userPhone = this.getUserPhone(user);

    // Only update if fields are empty (don't overwrite user input)
    if (!this.contactForm.get('name')?.value) {
      this.contactForm.patchValue({ name: userName });
    }
    if (!this.contactForm.get('email')?.value) {
      this.contactForm.patchValue({ email: userEmail });
    }
    if (!this.contactForm.get('phone')?.value) {
      this.contactForm.patchValue({ phone: userPhone });
    }
    if (!this.contactForm.get('preferredContact')?.value) {
      this.contactForm.patchValue({ preferredContact: 'email' });
    }
  }

  private getUserName(user: User | null): string {
    if (!user) return '';

    // Try to get full name from profile
    if (user.profile?.firstName || user.profile?.lastName) {
      const firstName = user.profile.firstName || '';
      const lastName = user.profile.lastName || '';
      return `${firstName} ${lastName}`.trim();
    }

    // Fall back to name
    return user.name || '';
  }

  private getUserPhone(user: User | null): string {
    return user?.mobile || '';
  }

  private generateInitialMessage(): string {
    const data = this.prefilledData();
    if (data.serviceName && data.consultant) {
      let message = `Hi, I'm interested in booking a consultation for ${data.serviceName}`;

      if (data.consultant) {
        message += ` with ${data.consultant}`;
      }

      if (data.duration) {
        message += ` (${data.duration} session)`;
      }

      message += '. Please let me know the available time slots and next steps for booking.';

      if (data.consultantPhone) {
        message += ` I noticed the consultant's contact is ${data.consultantPhone}.`;
      }

      return message;
    }

    return '';
  }

  onAppointmentSelected(appointment: AppointmentSlot): void {
    this.selectedAppointment.set(appointment);
    console.log('Appointment selected:', appointment);
  }

  async onSubmit(): Promise<void> {
    if (this.contactForm.valid) {
      this.isSubmitting.set(true);
      this.loadingService.show();
      this.showSuccessMessage.set(false);
      this.showErrorMessage.set(false);
      this.errorMessage.set('');

      const formData: ContactForm = this.contactForm.value;

      // Add appointment information if selected
      const appointment = this.selectedAppointment();
      if (appointment) {
        (formData as any).appointmentDate = appointment.date.toLocaleDateString();
        (formData as any).appointmentTime = appointment.time;
      }

      // Add pre-filled service information for the lead record
      const data = this.prefilledData();
      if (data.serviceName || data.consultant) {
        (formData as any).selectedService = data.serviceName;
        (formData as any).selectedConsultant = data.consultant;
        (formData as any).consultantPhone = data.consultantPhone;
        (formData as any).sessionDuration = data.duration;
        (formData as any).bookingSource = data.source;
      }

      try {
        if (appointment) {
          await this.submitBooking(formData, appointment);
        } else {
          await this.submitLead(formData);
        }
      } catch (error: any) {
        this.showErrorMessage.set(true);
        this.errorMessage.set(error.message || 'An unexpected error occurred. Please try again.');
        setTimeout(() => {
          this.showErrorMessage.set(false);
          this.errorMessage.set('');
        }, 8000);
      } finally {
        this.isSubmitting.set(false);
        this.loadingService.hide();
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.contactForm.controls).forEach((key) => {
        this.contactForm.get(key)?.markAsTouched();
      });
    }
  }

  private async submitBooking(formData: ContactForm, appointment: AppointmentSlot): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      throw new Error('Please log in or create a patient account before booking an appointment.');
    }

    const data = this.prefilledData();
    const serviceName =
      formData.serviceInterest || data.serviceName || data.service || 'Hope Hub Consultation';
    const response = await new Promise<{ consultation: any }>((resolve, reject) => {
      this.bookingService
        .createBooking({
          serviceName,
          servicePriceInPaise: this.resolveServicePriceInPaise(serviceName),
          message: formData.message,
          appointmentDate: this.formatLocalDate(appointment.date),
          appointmentTime: appointment.time,
          consultantName: data.consultant || appointment.consultant || '',
          consultantPhone: data.consultantPhone || '',
          sessionDuration: data.duration || '',
          visitorName: formData.name,
          visitorEmail: formData.email,
          visitorPhone: formData.phone || '',
          preferredContact: formData.preferredContact,
          urgencyLevel: formData.urgencyLevel,
          preferredTime: formData.preferredTime || '',
          preferAnonymousTelegram: Boolean(formData.preferAnonymousTelegram),
          entryPage: typeof window === 'undefined' ? undefined : window.location.href,
        })
        .subscribe({ next: resolve, error: reject });
    });

    await this.paymentService.payConsultation(response.consultation);
    this.showSuccessAndReset('Appointment booked and payment verified successfully.');
  }

  private async submitLead(formData: ContactForm): Promise<void> {
    const success = await new Promise<boolean>((resolve, reject) => {
      this.leadService.sendContactForm(formData).subscribe({ next: resolve, error: reject });
    });
    if (!success) {
      throw new Error('Failed to send message. Please try again.');
    }
    this.showSuccessAndReset('Message sent successfully.');
  }

  private showSuccessAndReset(message: string): void {
    this.showSuccessMessage.set(true);
    this.errorMessage.set(message);

    const user = this.currentUser();
    const userName = this.getUserName(user);
    const userEmail = user?.email || '';
    const userPhone = this.getUserPhone(user);

    this.contactForm.reset({
      name: userName,
      email: userEmail,
      phone: userPhone,
      serviceInterest: '',
      message: '',
      urgencyLevel: 'normal',
      preferredTime: '',
      preferAnonymousTelegram: false,
      preferredContact: user ? 'email' : 'whatsapp',
    });
    this.selectedAppointment.set(null);

    setTimeout(() => {
      this.showSuccessMessage.set(false);
      this.errorMessage.set('');
    }, 5000);
  }

  private resolveServicePriceInPaise(serviceName: string): number {
    const queryPrice = Number(this.prefilledData().price);
    if (Number.isFinite(queryPrice) && queryPrice > 0) {
      return Math.round(queryPrice * 100);
    }

    const featured = FEATURED_SERVICES.find(
      (service) => service.name === serviceName || service.id === serviceName,
    );
    return Math.round((featured?.price ?? 999) * 100);
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
