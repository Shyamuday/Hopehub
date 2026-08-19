import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { ConsultationApiService } from '../../core/services/consultation-api.service';
import type {
  ProviderFeedbackItem,
  ProviderFeedbackSummary,
} from '../../core/types/consultation.types';

@Component({
  selector: 'app-provider-feedback-page',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './provider-feedback-page.html',
  styleUrl: './provider-feedback-page.scss',
})
export class ProviderFeedbackPage implements OnInit {
  private readonly consultationApi = inject(ConsultationApiService);

  readonly worklistPath = ROUTE_PATHS.WORKLIST;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly summary = signal<ProviderFeedbackSummary>({ averageRating: null, ratingCount: 0 });
  readonly feedback = signal<ProviderFeedbackItem[]>([]);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.consultationApi.loadProviderFeedback();
      this.summary.set(response.summary);
      this.feedback.set(response.feedback);
    } catch {
      this.error.set('Could not load client feedback right now. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  ratingStars(rating: number): string {
    return '★'.repeat(Math.max(0, Math.min(5, rating))) + '☆'.repeat(Math.max(0, 5 - rating));
  }
}
