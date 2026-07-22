import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContactForm } from '../../core/models/contact.model';
import { TelegramService, LoadingService, AuthService } from '../../core/services';
import { APP_CONSTANTS } from '../../core';
import { AppointmentCalendarComponent, AppointmentSlot } from '../../shared/components';
import { User } from '../../core/models/auth.model';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [ReactiveFormsModule, AppointmentCalendarComponent],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit {
  APP_CONSTANTS = APP_CONSTANTS;

  private formBuilder = inject(FormBuilder);
  private telegramService = inject(TelegramService);
  private loadingService = inject(LoadingService);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  contactForm!: FormGroup;

  // Signal-based state
  isSubmitting = signal(false);
  showSuccessMessage = signal(false);
  showErrorMessage = signal(false);
  errorMessage = signal('');
  selectedAppointment = signal<AppointmentSlot | null>(null);
  prefilledData = signal<any>({});
  currentUser = signal<User | null>(null);

  constructor() {
    this.readQueryParameters();
    this.loadUserData();
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private loadUserData(): void {
    // Subscribe to auth state to get logged-in user
    this.authService.user$
      .pipe(takeUntilDestroyed())
      .subscribe((user: User | null) => {
        this.currentUser.set(user);
        // If form is already initialized, update it with user data
        if (this.contactForm) {
          this.updateFormWithUserData(user);
        }
      });
  }

  private readQueryParameters(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed())
      .subscribe((params: any) => {
        this.prefilledData.set({
          service: params['service'] || '',
          serviceName: params['serviceName'] || '',
          consultant: params['consultant'] || '',
          consultantPhone: params['consultantPhone'] || '',
          duration: params['duration'] || '',
          source: params['source'] || ''
        });
      });
  }

  private initializeForm(): void {
    // Determine initial service value and message
    const initialServiceValue = this.prefilledData().serviceName || this.prefilledData().service || '';
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
      message: [initialMessage, [Validators.required, Validators.minLength(10)]],
      preferredContact: [user ? 'email' : '', [Validators.required]]
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
    if (!user) return '';

    // Check if phone is stored in profile (you may need to add this field to your User model)
    // For now, return empty string as phone is not in the User model
    return '';
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

  onSubmit(): void {
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

      // Add pre-filled service information for Telegram message
      const data = this.prefilledData();
      if (data.serviceName || data.consultant) {
        (formData as any).selectedService = data.serviceName;
        (formData as any).selectedConsultant = data.consultant;
        (formData as any).consultantPhone = data.consultantPhone;
        (formData as any).sessionDuration = data.duration;
        (formData as any).bookingSource = data.source;
      }

      // Send form data to Telegram
      this.telegramService.sendContactForm(formData).subscribe({
        next: (success: boolean) => {
          this.isSubmitting.set(false);
          this.loadingService.hide();

          if (success) {
            this.showSuccessMessage.set(true);
            // Reset form but preserve user data
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
              preferredContact: user ? 'email' : ''
            });

            // Hide success message after 5 seconds
            setTimeout(() => {
              this.showSuccessMessage.set(false);
            }, 5000);
          } else {
            this.showErrorMessage.set(true);
            this.errorMessage.set('Failed to send message. Please try again.');
          }
        },
        error: (error: any) => {
          this.isSubmitting.set(false);
          this.loadingService.hide();
          this.showErrorMessage.set(true);
          this.errorMessage.set(error.message || 'An unexpected error occurred. Please try again.');

          // Hide error message after 8 seconds
          setTimeout(() => {
            this.showErrorMessage.set(false);
            this.errorMessage.set('');
          }, 8000);
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.contactForm.controls).forEach(key => {
        this.contactForm.get(key)?.markAsTouched();
      });
    }
  }
}