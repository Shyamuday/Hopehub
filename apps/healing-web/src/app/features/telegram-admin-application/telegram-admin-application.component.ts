import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LeadService, TelegramAdminApplicationPayload } from '../../core/services/lead.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  AppButtonComponent,
  FormCheckboxComponent,
  FormDropdownComponent,
  FormDropdownOption,
  FormFieldComponent,
} from '../../shared/components';

type Availability = TelegramAdminApplicationPayload['availability'];

@Component({
  selector: 'app-telegram-admin-application',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    AppButtonComponent,
    FormCheckboxComponent,
    FormDropdownComponent,
    FormFieldComponent,
  ],
  templateUrl: './telegram-admin-application.component.html',
  styleUrl: './telegram-admin-application.component.scss',
})
export class TelegramAdminApplicationComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly notifications = inject(NotificationService);

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly availabilityOptions: FormDropdownOption[] = [
    { value: 'DAILY', label: 'A little time daily' },
    { value: 'EVENINGS', label: 'Evenings' },
    { value: 'WEEKDAYS', label: 'Weekdays' },
    { value: 'WEEKENDS', label: 'Weekends' },
    { value: 'FLEXIBLE', label: 'Flexible / as needed' },
  ];

  readonly applicationForm = this.formBuilder.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    telegramUsername: [
      '',
      [Validators.required, Validators.pattern(/^@?[A-Za-z][A-Za-z0-9_]{4,31}$/)],
    ],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.maxLength(30)]],
    city: ['', [Validators.maxLength(120)]],
    availability: ['' as Availability | '', [Validators.required]],
    moderationExperience: ['', [Validators.maxLength(1500)]],
    motivation: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
    ageConfirmed: [false, [Validators.requiredTrue]],
    rulesAccepted: [false, [Validators.requiredTrue]],
    safetyAccepted: [false, [Validators.requiredTrue]],
  });

  hasError(controlName: keyof typeof this.applicationForm.controls): boolean {
    const control = this.applicationForm.controls[controlName];
    return control.invalid && control.touched;
  }

  submit(): void {
    if (this.applicationForm.invalid) {
      this.applicationForm.markAllAsTouched();
      this.notifications.warning('Please complete the required fields and agreements.');
      return;
    }

    const value = this.applicationForm.getRawValue();
    this.submitting.set(true);
    this.leadService
      .sendTelegramAdminApplication({
        fullName: value.fullName || '',
        telegramUsername: value.telegramUsername || '',
        email: value.email || '',
        phone: value.phone || '',
        city: value.city || '',
        availability: value.availability as Availability,
        moderationExperience: value.moderationExperience || '',
        motivation: value.motivation || '',
        ageConfirmed: true,
        rulesAccepted: true,
        safetyAccepted: true,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
          this.notifications.success('Application submitted for review.');
        },
        error: () => {
          this.submitting.set(false);
          this.notifications.error('Could not submit the application. Please try again.');
        },
      });
  }
}
