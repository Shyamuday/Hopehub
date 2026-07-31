import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { ContactMethod } from '../../core/models/contact.model';
import { LeadService, LoadingService, NotificationService } from '../../core/services';
import { FormDropdownComponent, FormDropdownOption } from '../../shared/components';

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, FormDropdownComponent],
  templateUrl: './careers.component.html',
  styleUrl: './careers.component.scss',
})
export class CareersComponent {
  readonly notes = NOTE_CONTENT;
  private readonly formBuilder = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly loadingService = inject(LoadingService);
  private readonly notificationService = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly specializationOptions: FormDropdownOption[] = [
    { value: '', label: 'Select specialization' },
    { value: 'Anxiety and stress', label: 'Anxiety and stress' },
    { value: 'Relationship counselling', label: 'Relationship counselling' },
    { value: 'Breakup support', label: 'Breakup support' },
    { value: 'Career and study pressure', label: 'Career and study pressure' },
    { value: 'Family counselling', label: 'Family counselling' },
    { value: 'General emotional support', label: 'General emotional support' },
    { value: 'Other', label: 'Other' },
  ];
  readonly experienceOptions: FormDropdownOption[] = [
    { value: '', label: 'Select experience' },
    { value: '0-1 years', label: '0-1 years' },
    { value: '1-3 years', label: '1-3 years' },
    { value: '3-5 years', label: '3-5 years' },
    { value: '5+ years', label: '5+ years' },
  ];
  readonly preferredChannelOptions: FormDropdownOption[] = [
    { value: ContactMethod.WHATSAPP, label: 'WhatsApp' },
    { value: ContactMethod.TELEGRAM, label: 'Telegram' },
    { value: ContactMethod.EMAIL, label: 'Email' },
    { value: ContactMethod.PHONE, label: 'Phone' },
  ];

  readonly applicationForm = this.formBuilder.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    city: ['', [Validators.required]],
    qualification: ['', [Validators.required]],
    specialization: ['', [Validators.required]],
    experienceYears: ['', [Validators.required]],
    registrationDetails: [''],
    languages: ['', [Validators.required]],
    availability: ['', [Validators.required]],
    preferredChannel: [ContactMethod.WHATSAPP, [Validators.required]],
    resumeLink: ['', [Validators.required]],
    portfolioLink: [''],
    whyJoin: ['', [Validators.required, Validators.minLength(40)]],
    consent: [false, [Validators.requiredTrue]],
  });

  async onSubmit(): Promise<void> {
    if (this.applicationForm.invalid) {
      this.applicationForm.markAllAsTouched();
      this.notificationService.warning('Please complete the required application fields.');
      return;
    }

    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.loadingService.show();

    const value = this.applicationForm.getRawValue();

    await new Promise<void>((resolve) => {
      this.leadService
        .sendCounsellorApplication({
          fullName: value.fullName || '',
          email: value.email || '',
          phone: value.phone || '',
          city: value.city || '',
          qualification: value.qualification || '',
          specialization: value.specialization || '',
          experienceYears: value.experienceYears || '',
          registrationDetails: value.registrationDetails || '',
          languages: value.languages || '',
          availability: value.availability || '',
          preferredChannel: value.preferredChannel as ContactMethod,
          resumeLink: value.resumeLink || '',
          portfolioLink: value.portfolioLink || '',
          whyJoin: value.whyJoin || '',
        })
        .subscribe({
          next: (success) => {
            if (success) {
              const message =
                'Application submitted successfully. Our team will review it and contact shortlisted counsellors.';
              this.successMessage.set(message);
              this.notificationService.success(message);
              this.applicationForm.reset({
                preferredChannel: ContactMethod.WHATSAPP,
                consent: false,
              });
            } else {
              const message = 'Could not submit your application. Please try again.';
              this.errorMessage.set(message);
              this.notificationService.error(message);
            }
            resolve();
          },
          error: () => {
            const message = 'Could not submit your application. Please try again.';
            this.errorMessage.set(message);
            this.notificationService.error(message);
            resolve();
          },
        });
    });

    this.isSubmitting.set(false);
    this.loadingService.hide();
  }

  hasError(controlName: string): boolean {
    const control = this.applicationForm.get(controlName);
    return Boolean(control?.invalid && control?.touched);
  }
}
