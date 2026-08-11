import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LeadService } from '../../core/services/lead.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  AppButtonComponent,
  FormCheckboxComponent,
  FormFieldComponent,
  SelectableCardComponent,
} from '../../shared/components';

type FeedbackType = {
  value: 'IMPROVEMENT' | 'COMPLAINT' | 'BUG' | 'SERVICE_EXPERIENCE' | 'PRAISE' | 'OTHER';
  label: string;
  description: string;
};

@Component({
  selector: 'app-feedback-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    AppButtonComponent,
    FormCheckboxComponent,
    FormFieldComponent,
    SelectableCardComponent,
  ],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss',
})
export class FeedbackComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly notificationService = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly selectedType = signal<FeedbackType['value']>('IMPROVEMENT');

  readonly feedbackTypes: FeedbackType[] = [
    {
      value: 'IMPROVEMENT',
      label: 'Improvement idea',
      description: 'Suggest something we should add, change, or make easier.',
    },
    {
      value: 'COMPLAINT',
      label: 'Complaint',
      description: 'Tell admin privately what went wrong so we can review it.',
    },
    {
      value: 'BUG',
      label: 'Bug / technical issue',
      description: 'Report payment, booking, login, bot, or website problems.',
    },
    {
      value: 'SERVICE_EXPERIENCE',
      label: 'Service experience',
      description: 'Share feedback about a session, package, listener, or care team member.',
    },
    {
      value: 'PRAISE',
      label: 'Praise / review',
      description: 'Share what helped you. Publishing still needs your consent and admin approval.',
    },
    {
      value: 'OTHER',
      label: 'Other',
      description: 'Anything else you want the Hope Hub team to know.',
    },
  ];

  readonly selectedTypeCopy = computed(
    () => this.feedbackTypes.find((type) => type.value === this.selectedType())?.description || '',
  );

  readonly feedbackForm = this.formBuilder.group({
    feedbackType: ['IMPROVEMENT' as FeedbackType['value'], [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(4000)]],
    rating: [5, [Validators.min(1), Validators.max(5)]],
    pageOrFeature: [''],
    name: [''],
    email: ['', [Validators.email]],
    phone: [''],
    preferredContact: ['none' as const],
    allowFollowUp: [false],
    isAnonymous: [true],
    consentToPublish: [false],
  });

  constructor() {
    this.feedbackForm.get('feedbackType')?.valueChanges.subscribe((value) => {
      if (value) this.selectedType.set(value);
    });
  }

  submitFeedback(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      this.notificationService.warning('Please write your feedback before submitting.');
      return;
    }

    const value = this.feedbackForm.getRawValue();
    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.leadService
      .sendFeedback({
        feedbackType: value.feedbackType || 'IMPROVEMENT',
        message: value.message || '',
        rating: Number(value.rating || 5),
        pageOrFeature: value.pageOrFeature || '',
        name: value.name || '',
        email: value.email || '',
        phone: value.phone || '',
        preferredContact: value.preferredContact || 'none',
        allowFollowUp: Boolean(value.allowFollowUp),
        isAnonymous: Boolean(value.isAnonymous),
        consentToPublish: Boolean(value.consentToPublish),
      })
      .subscribe({
        next: (success) => {
          if (success) {
            this.successMessage.set(
              'Thank you. Your feedback has reached the Hope Hub team for review.',
            );
            this.notificationService.success(
              'Feedback submitted. Thank you for helping us improve.',
            );
            this.feedbackForm.reset({
              feedbackType: 'IMPROVEMENT',
              message: '',
              rating: 5,
              pageOrFeature: '',
              name: '',
              email: '',
              phone: '',
              preferredContact: 'none',
              allowFollowUp: false,
              isAnonymous: true,
              consentToPublish: false,
            });
            this.selectedType.set('IMPROVEMENT');
          } else {
            const message = 'Could not submit feedback. Please try again.';
            this.errorMessage.set(message);
            this.notificationService.error(message);
          }
          this.isSubmitting.set(false);
        },
        error: () => {
          const message = 'Could not submit feedback. Please try again.';
          this.errorMessage.set(message);
          this.notificationService.error(message);
          this.isSubmitting.set(false);
        },
      });
  }

  hasError(controlName: string): boolean {
    const control = this.feedbackForm.get(controlName);
    return Boolean(control?.invalid && control?.touched);
  }

  selectType(type: FeedbackType['value']): void {
    this.feedbackForm.patchValue({ feedbackType: type });
    this.selectedType.set(type);
  }
}
