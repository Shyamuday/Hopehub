import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { ContactMethod } from '../../core/models/contact.model';
import { LeadService, LoadingService } from '../../core/services';

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './careers.component.html',
  styleUrl: './careers.component.scss',
})
export class CareersComponent {
  readonly notes = NOTE_CONTENT;
  private readonly formBuilder = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly loadingService = inject(LoadingService);

  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

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
              this.successMessage.set(
                'Application submitted successfully. Our team will review it and contact shortlisted counsellors.',
              );
              this.applicationForm.reset({
                preferredChannel: ContactMethod.WHATSAPP,
                consent: false,
              });
            } else {
              this.errorMessage.set('Could not submit your application. Please try again.');
            }
            resolve();
          },
          error: () => {
            this.errorMessage.set('Could not submit your application. Please try again.');
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
