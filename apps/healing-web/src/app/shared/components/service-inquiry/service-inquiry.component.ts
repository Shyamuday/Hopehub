import { Component, input, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeadService, LoadingService, NotificationService } from '../../../core/services';

@Component({
  selector: 'app-service-inquiry',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './service-inquiry.component.html',
  styleUrl: './service-inquiry.component.scss',
})
export class ServiceInquiryComponent {
  serviceName = input<string>('');

  private formBuilder = inject(FormBuilder);
  private leadService = inject(LeadService);
  private loadingService = inject(LoadingService);
  private notificationService = inject(NotificationService);

  inquiryForm!: FormGroup;
  isSubmitting = signal(false);
  showSuccessMessage = signal(false);
  showErrorMessage = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.inquiryForm = this.formBuilder.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      message: [''],
    });
  }

  onSubmit(): void {
    if (this.inquiryForm.valid) {
      this.isSubmitting.set(true);
      this.loadingService.show();
      this.showSuccessMessage.set(false);
      this.showErrorMessage.set(false);
      this.errorMessage.set('');

      const formData = this.inquiryForm.value;

      this.leadService.sendServiceInquiry(this.serviceName(), formData).subscribe({
        next: (success: boolean) => {
          this.isSubmitting.set(false);
          this.loadingService.hide();

          if (success) {
            this.showSuccessMessage.set(true);
            this.notificationService.success('Inquiry sent successfully.');
            this.inquiryForm.reset();
            this.initializeForm();

            // Hide success message after 5 seconds
            setTimeout(() => {
              this.showSuccessMessage.set(false);
            }, 5000);
          } else {
            const message = 'Failed to send inquiry. Please try again.';
            this.showErrorMessage.set(true);
            this.errorMessage.set(message);
            this.notificationService.error(message);
          }
        },
        error: (error: any) => {
          this.isSubmitting.set(false);
          this.loadingService.hide();
          const message = error.message || 'An unexpected error occurred. Please try again.';
          this.showErrorMessage.set(true);
          this.errorMessage.set(message);
          this.notificationService.error(message);

          // Hide error message after 8 seconds
          setTimeout(() => {
            this.showErrorMessage.set(false);
            this.errorMessage.set('');
          }, 8000);
        },
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.inquiryForm.controls).forEach((key) => {
        this.inquiryForm.get(key)?.markAsTouched();
      });
      this.notificationService.warning('Please complete the required inquiry fields.');
    }
  }
}
