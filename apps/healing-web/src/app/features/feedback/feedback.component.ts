import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LeadService } from '../../core/services/lead.service';

@Component({
  selector: 'app-feedback-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './feedback.component.html',
  styleUrl: './feedback.component.scss',
})
export class FeedbackComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly leadService = inject(LeadService);

  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  readonly feedbackForm = this.formBuilder.group({
    displayName: [''],
    email: ['', [Validators.email]],
    location: [''],
    supportArea: [''],
    quote: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1200)]],
    stars: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    isAnonymous: [true],
    consentToPublish: [false, [Validators.requiredTrue]],
  });

  submitFeedback(): void {
    if (this.feedbackForm.invalid) {
      this.feedbackForm.markAllAsTouched();
      return;
    }

    const value = this.feedbackForm.getRawValue();
    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.leadService
      .sendTestimonialFeedback({
        displayName: value.displayName || '',
        email: value.email || '',
        location: value.location || '',
        supportArea: value.supportArea || '',
        quote: value.quote || '',
        stars: Number(value.stars || 5),
        isAnonymous: Boolean(value.isAnonymous),
        consentToPublish: Boolean(value.consentToPublish),
      })
      .subscribe({
        next: (success) => {
          if (success) {
            this.successMessage.set('Thank you. Your feedback is saved for admin review.');
            this.feedbackForm.reset({
              displayName: '',
              email: '',
              location: '',
              supportArea: '',
              quote: '',
              stars: 5,
              isAnonymous: true,
              consentToPublish: false,
            });
          } else {
            this.errorMessage.set('Could not submit feedback. Please try again.');
          }
          this.isSubmitting.set(false);
        },
        error: () => {
          this.errorMessage.set('Could not submit feedback. Please try again.');
          this.isSubmitting.set(false);
        },
      });
  }

  hasError(controlName: string): boolean {
    const control = this.feedbackForm.get(controlName);
    return Boolean(control?.invalid && control?.touched);
  }
}
