import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LeadService, PublicTestimonial } from '../../../core/services/lead.service';

@Component({
  selector: 'app-feedback-section',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './feedback-section.component.html',
  styleUrl: './feedback-section.component.scss',
})
export class FeedbackSectionComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly leadService = inject(LeadService);

  readonly testimonials = signal<PublicTestimonial[]>([]);
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

  readonly feedbackTypes = [
    {
      title: 'Rate your session',
      description: 'Share how helpful the support felt, what worked, and what can be improved.',
      metric: '1-5',
      label: 'rating',
    },
    {
      title: 'Share anonymously',
      description:
        'Use a display name or ask us to keep your identity private before anything is shown.',
      metric: 'ID',
      label: 'privacy',
    },
    {
      title: 'Public only with consent',
      description:
        'Stories should appear on the site only after your permission and internal review.',
      metric: 'OK',
      label: 'consent',
    },
  ];

  ngOnInit(): void {
    this.leadService.listTestimonials().subscribe({
      next: (items) => this.testimonials.set(items.slice(0, 3)),
      error: () => this.testimonials.set([]),
    });
  }

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

  stars(count: number): number[] {
    return Array.from({ length: count }, (_, index) => index + 1);
  }
}
