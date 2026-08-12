import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../../core/services/booking.service';

@Component({
  selector: 'app-session-feedback',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './session-feedback.component.html',
  styleUrl: './session-feedback.component.scss',
})
export class SessionFeedbackComponent {
  @Input({ required: true }) consultationId = '';
  private readonly bookingService = inject(BookingService);

  readonly rating = signal(0);
  readonly note = signal('');
  readonly submitted = signal(false);
  readonly dismissed = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  submit(): void {
    if (!this.consultationId || !this.rating() || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.bookingService
      .submitConsultationFeedback(this.consultationId, {
        rating: this.rating(),
        helpful: this.rating() >= 4,
        message: this.note().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.submitted.set(true);
          this.saving.set(false);
        },
        error: () => {
          this.error.set('Could not save feedback. Please try again later.');
          this.saving.set(false);
        },
      });
  }
}
