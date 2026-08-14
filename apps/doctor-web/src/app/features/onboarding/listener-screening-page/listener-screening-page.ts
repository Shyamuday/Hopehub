import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import {
  DoctorSessionService,
  type ProviderReadiness,
} from '../../../core/services/doctor-session';
import { AppButtonComponent } from '../../../shared/ui/app-button.component';

type ScreeningQuestion = {
  id: string;
  text: string;
  options: Array<{ id: string; text: string }>;
};

type ScreeningQuestionSet = {
  id: string;
  title: string;
  version: string;
  description?: string | null;
  passScore: number;
  questions: ScreeningQuestion[];
};

type ScreeningAttempt = {
  score?: number | null;
  maxScore?: number | null;
  passed?: boolean | null;
  completedAt?: string | null;
  review?: ScreeningReviewItem[] | null;
};

type ScreeningReviewItem = {
  questionId: string;
  questionText: string;
  selectedOptionId: string;
  selectedOptionText: string;
  correctOptionId: string;
  correctOptionText: string;
  correct: boolean;
};

type ScreeningResult = {
  score: number;
  maxScore: number;
  passed: boolean;
  review?: ScreeningReviewItem[];
};

@Component({
  selector: 'app-listener-screening-page',
  imports: [RouterLink, AppButtonComponent],
  templateUrl: './listener-screening-page.html',
  styleUrl: './listener-screening-page.scss',
})
export class ListenerScreeningPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(DoctorSessionService);
  private readonly apiBase = environment.apiUrl;

  readonly dashboardPath = `/${ROUTE_PATHS.PROFILE}`;
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly questionSet = signal<ScreeningQuestionSet | null>(null);
  readonly latestAttempt = signal<ScreeningAttempt | null>(null);
  readonly answers = signal<Record<string, string>>({});
  readonly currentQuestionIndex = signal(0);
  readonly error = signal('');
  readonly result = signal<ScreeningResult | null>(null);
  readonly showReview = signal(false);

  constructor() {
    void this.load();
  }

  currentQuestion() {
    return this.questionSet()?.questions[this.currentQuestionIndex()] ?? null;
  }

  answeredCount() {
    return Object.keys(this.answers()).length;
  }

  progressPercent() {
    const count = this.questionSet()?.questions.length ?? 0;
    return count ? Math.round((this.answeredCount() / count) * 100) : 0;
  }

  scorePercent() {
    const result = this.result();
    return result?.maxScore ? Math.round((result.score / result.maxScore) * 100) : 0;
  }

  selectedOption(questionId: string) {
    return this.answers()[questionId] ?? '';
  }

  optionLetter(index: number) {
    return String.fromCharCode(65 + index);
  }

  selectAnswer(questionId: string, optionId: string) {
    this.answers.update((answers) => ({ ...answers, [questionId]: optionId }));
    this.error.set('');
  }

  previous() {
    this.currentQuestionIndex.update((index) => Math.max(0, index - 1));
  }

  next() {
    const question = this.currentQuestion();
    if (!question || !this.selectedOption(question.id)) {
      this.error.set('Choose one answer to continue.');
      return;
    }
    const lastIndex = (this.questionSet()?.questions.length ?? 1) - 1;
    this.currentQuestionIndex.update((index) => Math.min(lastIndex, index + 1));
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await firstValueFrom(
        this.http.get<{
          questionSet: ScreeningQuestionSet;
          latestAttempt: ScreeningAttempt | null;
        }>(`${this.apiBase}${API_PATHS.DOCTOR.LISTENER_SCREENING}`),
      );
      this.questionSet.set(response.questionSet);
      this.latestAttempt.set(response.latestAttempt);
      if (response.latestAttempt?.score != null) {
        this.result.set({
          score: response.latestAttempt.score ?? 0,
          maxScore: response.latestAttempt.maxScore ?? response.questionSet.questions.length,
          passed: Boolean(response.latestAttempt.passed),
          review: response.latestAttempt.review ?? undefined,
        });
      }
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not load the listener screening test.');
    } finally {
      this.loading.set(false);
    }
  }

  async submit() {
    const questionSet = this.questionSet();
    if (!questionSet || this.submitting()) return;
    if (this.answeredCount() !== questionSet.questions.length) {
      const firstMissing = questionSet.questions.findIndex(
        (question) => !this.answers()[question.id],
      );
      if (firstMissing >= 0) this.currentQuestionIndex.set(firstMissing);
      this.error.set('Answer every question before submitting.');
      return;
    }

    this.submitting.set(true);
    this.error.set('');
    try {
      const response = await firstValueFrom(
        this.http.post<{
          result: ScreeningResult;
          readiness: ProviderReadiness;
        }>(`${this.apiBase}${API_PATHS.DOCTOR.LISTENER_SCREENING}`, {
          questionSetId: questionSet.id,
          questionSetVersion: questionSet.version,
          answers: questionSet.questions.map((question) => ({
            questionId: question.id,
            optionId: this.answers()[question.id],
          })),
        }),
      );
      this.result.set(response.result);
      this.showReview.set(false);
      await this.session.load(true);
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not submit the screening test.');
    } finally {
      this.submitting.set(false);
    }
  }

  toggleReview() {
    this.showReview.update((visible) => !visible);
  }

  tryAgain() {
    this.result.set(null);
    this.showReview.set(false);
    this.answers.set({});
    this.currentQuestionIndex.set(0);
    this.error.set('');
  }

  continueToAvailability() {
    void this.router.navigate(['/', ROUTE_PATHS.SLOTS], {
      queryParams: { setup: 'availability' },
    });
  }
}
