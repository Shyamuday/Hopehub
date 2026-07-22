import { Component, input, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TelegramService, LoadingService } from '../../../core/services';

@Component({
  selector: 'app-service-inquiry',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './service-inquiry.component.html',
  styleUrl: './service-inquiry.component.scss'
})
export class ServiceInquiryComponent {
  serviceName = input<string>('');

  private formBuilder = inject(FormBuilder);
  private telegramService = inject(TelegramService);
  private loadingService = inject(LoadingService);

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
      message: ['']
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

      // Send service inquiry to Telegram
      this.telegramService.sendServiceInquiry(this.serviceName(), formData).subscribe({
        next: (success: boolean) => {
          this.isSubmitting.set(false);
          this.loadingService.hide();

          if (success) {
            this.showSuccessMessage.set(true);
            this.inquiryForm.reset();
            this.initializeForm();

            // Hide success message after 5 seconds
            setTimeout(() => {
              this.showSuccessMessage.set(false);
            }, 5000);
          } else {
            this.showErrorMessage.set(true);
            this.errorMessage.set('Failed to send inquiry. Please try again.');
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
      Object.keys(this.inquiryForm.controls).forEach(key => {
        this.inquiryForm.get(key)?.markAsTouched();
      });
    }
  }
}