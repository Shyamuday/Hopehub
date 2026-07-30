import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AssessmentConfig, AssessmentResult } from '../../core/models/assessment.model';
import { getAssessmentConfig } from '../../core/data/assessment-configs';
import { getExerciseRecommendations } from '../../core/data/exercise-recommendations';
import { getLifestyleTipRecommendations } from '../../core/data/lifestyle-tip-recommendations';
import { getArticleRecommendations } from '../../core/data/article-recommendations';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AssessmentAttemptsService } from '../../core/services/assessment-attempts.service';

@Component({
  selector: 'app-direct-assessment',
  standalone: true,
  imports: [RouterModule],
  template: `
    <main class="direct-test bg-[var(--brand-surface)]">
      @if (assessment()) {
        <section class="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div class="mb-3 flex items-center justify-between gap-3">
            <a
              routerLink="/assessments"
              class="text-sm font-semibold text-primary-700 hover:text-primary-800"
            >
              All tests
            </a>
            <span
              class="rounded-md bg-white px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200"
            >
              {{ assessment()!.duration }}
            </span>
          </div>

          @if (!showResults()) {
            <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div class="mb-3">
                <p class="text-sm font-semibold text-primary-700">{{ assessment()!.type }}</p>
                <h1 class="mt-1 text-xl font-semibold text-gray-950 sm:text-2xl">
                  {{ publicTitle() }}
                </h1>
              </div>

              <div class="mb-4">
                <div class="mb-2 flex justify-between text-sm text-gray-600">
                  <span
                    >Question {{ currentQuestion() + 1 }} of
                    {{ assessment()!.questions.length }}</span
                  >
                  <span>{{ progressPercent() }}%</span>
                </div>
                <div class="h-2 rounded-full bg-gray-100">
                  <div
                    class="h-2 rounded-full bg-primary-600 transition-all"
                    [style.width.%]="progressPercent()"
                  ></div>
                </div>
              </div>

              <div>
                <h2 class="mb-3 text-base font-semibold leading-snug text-gray-950 sm:text-lg">
                  {{ currentQuestionText() }}
                </h2>

                <div class="grid gap-2">
                  @for (option of assessment()!.responseOptions; track option.value) {
                    <button
                      type="button"
                      class="direct-test__option"
                      [class.direct-test__option--selected]="
                        answers()[currentQuestion()] === option.value
                      "
                      (click)="selectAnswer(option.value)"
                    >
                      {{ option.label }}
                    </button>
                  }
                </div>

                <div class="flex items-center justify-between gap-3 pt-4">
                  <button
                    type="button"
                    class="btn-outline btn-sm"
                    [disabled]="currentQuestion() === 0"
                    (click)="previousQuestion()"
                  >
                    Previous
                  </button>

                  @if (currentQuestion() < assessment()!.questions.length - 1) {
                    <button
                      type="button"
                      class="btn-primary btn-sm"
                      [disabled]="!hasCurrentAnswer()"
                      (click)="nextQuestion()"
                    >
                      Next
                    </button>
                  } @else {
                    <button
                      type="button"
                      class="btn-primary btn-sm"
                      [disabled]="!hasCurrentAnswer() || savingResult()"
                      (click)="completeAssessment()"
                    >
                      {{ savingResult() ? 'Saving...' : 'See result' }}
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          @if (resultLocked()) {
            <div
              class="mt-4 rounded-lg border border-primary-100 bg-white p-5 text-center shadow-sm"
            >
              <h2 class="text-xl font-semibold text-gray-950">Your answers are ready</h2>
              <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-700">
                Sign in or create an account to view and save your result privately. We kept your
                answers on this device, so you will not need to retake the test.
              </p>
              <div class="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
                <button type="button" class="btn-outline btn-sm" (click)="openLogin()">
                  Sign in
                </button>
                <button type="button" class="btn-primary btn-sm" (click)="openRegister()">
                  Sign up
                </button>
              </div>
            </div>
          }

          @if (showResults() && result()) {
            <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div class="text-center">
                <p class="text-sm font-semibold text-primary-700">Your result</p>
                <h1 class="mt-2 text-2xl font-semibold text-gray-950 sm:text-3xl">
                  {{ result()!.level }}
                </h1>
                <p class="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-700 sm:text-base">
                  {{ result()!.description }}
                </p>
              </div>

              <div class="mt-5 grid gap-3 sm:grid-cols-3">
                <div class="rounded-lg bg-gray-50 p-4 text-center">
                  <div class="text-2xl font-semibold text-gray-950">{{ result()!.total }}</div>
                  <div class="text-xs font-semibold text-gray-500">Score</div>
                </div>
                <div class="rounded-lg bg-gray-50 p-4 text-center">
                  <div class="text-2xl font-semibold text-gray-950">{{ result()!.maxScore }}</div>
                  <div class="text-xs font-semibold text-gray-500">Max score</div>
                </div>
                <div class="rounded-lg bg-gray-50 p-4 text-center">
                  <div class="text-2xl font-semibold text-gray-950">
                    #{{ savedAttempt()?.retakeNumber || 1 }}
                  </div>
                  <div class="text-xs font-semibold text-gray-500">Attempt</div>
                </div>
              </div>

              @if (result()!.safetyFlag) {
                <div
                  class="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
                >
                  If you feel unsafe or may harm yourself, call local emergency services now. In
                  India, Tele MANAS is available at 14416.
                </div>
              }

              <div class="mt-5">
                <h2 class="text-lg font-semibold text-gray-950">Recommended next steps</h2>
                <div class="mt-3 grid gap-2">
                  @for (suggestion of result()!.suggestions.slice(0, 3); track suggestion) {
                    <div class="rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-700">
                      {{ suggestion }}
                    </div>
                  }
                </div>
              </div>

              <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <a
                  [routerLink]="['/exercises']"
                  [queryParams]="recommendationQuery('exercises')"
                  class="btn-outline btn-sm"
                  >Exercises</a
                >
                <a
                  [routerLink]="['/lifestyle-tips']"
                  [queryParams]="recommendationQuery('tips')"
                  class="btn-outline btn-sm"
                  >Lifestyle tips</a
                >
                <a
                  [routerLink]="['/articles']"
                  [queryParams]="recommendationQuery('articles')"
                  class="btn-outline btn-sm"
                  >Articles</a
                >
                <a routerLink="/contact" class="btn-primary btn-sm">Book session</a>
              </div>

              <div class="mt-4 text-center">
                <button
                  type="button"
                  class="text-sm font-semibold text-primary-700 hover:text-primary-800"
                  (click)="retake()"
                >
                  Retake this test
                </button>
              </div>
            </div>
          }
        </section>
      } @else {
        <section class="container mx-auto px-4 py-16 text-center">
          <h1 class="text-3xl font-semibold text-gray-950">Test not found</h1>
          <p class="mt-3 text-gray-700">The test you are looking for is not available.</p>
          <a routerLink="/assessments" class="btn-primary btn-sm mt-6">View all tests</a>
        </section>
      }
    </main>
  `,
  styles: [
    `
      .direct-test__option {
        min-height: 2.55rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        background: #fff;
        color: #1c2d37;
        padding: 0.58rem 0.75rem;
        text-align: left;
        font-weight: 600;
        line-height: 1.35;
        transition:
          border-color 160ms ease,
          box-shadow 160ms ease,
          background-color 160ms ease;
      }

      .direct-test__option:hover,
      .direct-test__option:focus-visible {
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(74, 111, 165, 0.12);
        outline: none;
      }

      .direct-test__option--selected {
        border-color: var(--brand-primary);
        background: rgba(74, 111, 165, 0.11);
        color: var(--brand-primary);
        box-shadow: inset 0 0 0 1px var(--brand-primary);
      }

      @media (max-width: 639px) {
        .direct-test__option {
          min-height: 2.45rem;
          padding: 0.52rem 0.7rem;
          font-size: 0.9rem;
        }
      }
    `,
  ],
})
export class DirectAssessmentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly assessmentAttemptsService = inject(AssessmentAttemptsService);
  private readonly pendingStorageKey = 'hope_hub_direct_pending_assessment_result';
  private autoNextTimer: ReturnType<typeof setTimeout> | null = null;

  assessment = signal<AssessmentConfig | null>(null);
  currentQuestion = signal(0);
  answers = signal<number[]>([]);
  result = signal<AssessmentResult | null>(null);
  showResults = signal(false);
  resultLocked = signal(false);
  savingResult = signal(false);
  savedAttempt = signal<{ id: string; retakeNumber: number } | null>(null);

  progressPercent = computed(() => {
    const assessment = this.assessment();
    if (!assessment) return 0;
    return Math.round(((this.currentQuestion() + 1) / assessment.questions.length) * 100);
  });

  publicTitle = computed(() => {
    const assessment = this.assessment();
    if (!assessment) return 'Mental Health Test';
    return assessment.title.replace(' Assessment', ' Test').replace(' Scale', ' Test');
  });

  currentQuestionText = computed(() => {
    const assessment = this.assessment();
    return assessment?.questions[this.currentQuestion()]?.text || '';
  });

  constructor() {
    this.authService.authState$.pipe(takeUntilDestroyed()).subscribe((state) => {
      if (state.isAuthenticated && this.resultLocked() && this.result()) {
        void this.saveAndShowResult();
      }
    });
  }

  ngOnInit(): void {
    const assessmentId = this.route.snapshot.data['assessmentId'] as string | undefined;
    const assessment = assessmentId ? getAssessmentConfig(assessmentId) : null;
    if (!assessment) return;

    this.assessment.set(assessment);
    this.answers.set(new Array(assessment.questions.length).fill(undefined));
    this.restorePendingResult(assessment.id);
  }

  hasCurrentAnswer(): boolean {
    return this.answers()[this.currentQuestion()] !== undefined;
  }

  selectAnswer(value: number): void {
    const next = [...this.answers()];
    next[this.currentQuestion()] = value;
    this.answers.set(next);

    this.clearAutoNextTimer();
    const assessment = this.assessment();
    if (!assessment || this.currentQuestion() >= assessment.questions.length - 1) return;

    this.autoNextTimer = setTimeout(() => {
      this.nextQuestion();
    }, 220);
  }

  nextQuestion(): void {
    this.clearAutoNextTimer();
    const assessment = this.assessment();
    if (!assessment || !this.hasCurrentAnswer()) return;
    if (this.currentQuestion() < assessment.questions.length - 1) {
      this.currentQuestion.update((question) => question + 1);
    }
  }

  previousQuestion(): void {
    this.clearAutoNextTimer();
    if (this.currentQuestion() > 0) {
      this.currentQuestion.update((question) => question - 1);
    }
  }

  completeAssessment(): void {
    const assessment = this.assessment();
    if (!assessment || !this.hasCurrentAnswer()) return;

    const answers = this.answers();
    const total = answers.reduce((sum, answer) => sum + (answer || 0), 0);
    const maxScore =
      assessment.responseOptions[assessment.responseOptions.length - 1].value *
      assessment.questions.length;
    const scoring = assessment.scoring.find((score) => total >= score.min && total <= score.max);
    if (!scoring) return;

    const result: AssessmentResult = {
      assessmentId: assessment.id,
      assessmentType: assessment.type,
      total,
      maxScore,
      level: scoring.level,
      color: scoring.color,
      description: scoring.description,
      suggestions: scoring.suggestions,
      safetyFlag:
        assessment.safetyQuestionIndex !== undefined && answers[assessment.safetyQuestionIndex] > 0,
      completedAt: new Date(),
      answers: [...answers],
    };

    this.result.set(result);
    this.savePendingResultLocally(assessment, result);

    if (!this.authService.getToken()) {
      this.resultLocked.set(true);
      this.authModalService.openRegister();
      return;
    }

    void this.saveAndShowResult();
  }

  async saveAndShowResult(): Promise<void> {
    const assessment = this.assessment();
    const result = this.result();
    if (!assessment || !result || this.savingResult()) return;

    this.savingResult.set(true);
    try {
      const response = await firstValueFrom(
        this.assessmentAttemptsService.saveAttempt({
          assessmentId: assessment.id,
          assessmentType: assessment.type,
          category: assessment.category,
          title: assessment.title,
          version: 'v1',
          answers: result.answers,
          totalScore: result.total,
          maxScore: result.maxScore,
          level: result.level,
          color: result.color,
          description: result.description,
          suggestions: result.suggestions,
          safetyFlag: result.safetyFlag,
          source: 'direct-test',
          entryPage: typeof window === 'undefined' ? undefined : window.location.href,
          completedAt: result.completedAt.toISOString(),
        }),
      );
      this.savedAttempt.set({
        id: response.attempt.id,
        retakeNumber: response.attempt.retakeNumber,
      });
      this.clearPendingResult();
      this.resultLocked.set(false);
      this.showResults.set(true);
    } finally {
      this.savingResult.set(false);
    }
  }

  recommendationQuery(kind: 'exercises' | 'tips' | 'articles') {
    const assessment = this.assessment();
    const result = this.result();
    if (!assessment || !result) return {};

    const ids =
      kind === 'exercises'
        ? getExerciseRecommendations(assessment.id, result.total)
        : kind === 'tips'
          ? getLifestyleTipRecommendations(assessment.id, result.total)
          : getArticleRecommendations(assessment.id, result.total);

    return ids.length
      ? {
          recommended: ids.join(','),
          assessment: assessment.type,
          score: result.total,
          level: result.level,
        }
      : {};
  }

  openLogin(): void {
    this.authModalService.openLogin();
  }

  openRegister(): void {
    this.authModalService.openRegister();
  }

  retake(): void {
    const assessment = this.assessment();
    if (!assessment) return;
    this.answers.set(new Array(assessment.questions.length).fill(undefined));
    this.currentQuestion.set(0);
    this.result.set(null);
    this.showResults.set(false);
    this.resultLocked.set(false);
    this.savedAttempt.set(null);
    this.clearPendingResult();
  }

  private clearAutoNextTimer(): void {
    if (!this.autoNextTimer) return;
    clearTimeout(this.autoNextTimer);
    this.autoNextTimer = null;
  }

  private savePendingResultLocally(assessment: AssessmentConfig, result: AssessmentResult): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      this.pendingStorageKey,
      JSON.stringify({
        assessmentId: assessment.id,
        answers: result.answers,
        result: { ...result, completedAt: result.completedAt.toISOString() },
        savedAt: new Date().toISOString(),
      }),
    );
  }

  private restorePendingResult(assessmentId: string): void {
    if (typeof sessionStorage === 'undefined' || this.authService.getToken()) return;
    const raw = sessionStorage.getItem(this.pendingStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        assessmentId: string;
        answers: number[];
        result: AssessmentResult & { completedAt: string };
        savedAt: string;
      };
      const isFresh = Date.now() - new Date(parsed.savedAt).getTime() < 60 * 60 * 1000;
      if (!isFresh || parsed.assessmentId !== assessmentId) return;

      this.answers.set(parsed.answers);
      this.result.set({ ...parsed.result, completedAt: new Date(parsed.result.completedAt) });
      this.resultLocked.set(true);
    } catch {
      this.clearPendingResult();
    }
  }

  private clearPendingResult(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(this.pendingStorageKey);
  }
}
