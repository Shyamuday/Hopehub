import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AssessmentConfig, AssessmentResult } from '../../core/models/assessment.model';
import { getExerciseRecommendations } from '../../core/data/exercise-recommendations';
import { getLifestyleTipRecommendations } from '../../core/data/lifestyle-tip-recommendations';
import { getArticleRecommendations } from '../../core/data/article-recommendations';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import { AssessmentAttemptsService } from '../../core/services/assessment-attempts.service';
import {
  AssessmentAccess,
  AssessmentDefinitionService,
} from '../../core/services/assessment-definition.service';
import { NotificationService } from '../../core/services/notification.service';

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
                @if (assessmentAccess()?.accessMode === 'PAID') {
                  <p class="mt-2 text-sm font-semibold text-primary-700">
                    {{ assessmentPriceLabel() }}
                    @if (assessmentAccess()?.canAccess) {
                      <span class="ml-2 text-green-700">Unlocked</span>
                    }
                  </p>
                }
              </div>

              @if (!canStartAssessment()) {
                <div class="direct-test__lock mb-4">
                  <h2 class="text-lg font-semibold text-gray-950">Unlock this test</h2>
                  <p class="mt-2 text-sm leading-6 text-gray-700">
                    {{ assessmentAccess()?.accessNote || lockedAssessmentMessage() }}
                  </p>
                  @if (assessmentAccess()?.accessMode === 'PAID') {
                    <div class="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        class="direct-test__coupon"
                        placeholder="Coupon code"
                        [value]="couponCode()"
                        (input)="couponCode.set($any($event.target).value)"
                      />
                      <button
                        type="button"
                        class="btn-primary btn-sm"
                        [disabled]="redeemingCoupon() || !couponCode().trim()"
                        (click)="redeemCoupon()"
                      >
                        {{ redeemingCoupon() ? 'Checking...' : 'Apply coupon' }}
                      </button>
                    </div>
                    @if (assessmentAccess()?.couponLabel) {
                      <p class="mt-2 text-xs font-semibold text-gray-500">
                        {{ assessmentAccess()!.couponLabel }}
                      </p>
                    }
                  }
                  <div class="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button type="button" class="btn-outline btn-sm" (click)="openLogin()">
                      Sign in
                    </button>
                    @if (assessmentAccess()?.accessMode === 'PAID') {
                      <a routerLink="/contact" class="btn-primary btn-sm">Book to unlock</a>
                    }
                  </div>
                </div>
              }

              @if (canStartAssessment()) {
                <div class="mb-4">
                  <div
                    class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div class="text-sm text-gray-600">
                      @if (viewMode() === 'single') {
                        <span
                          >Question {{ currentQuestion() + 1 }} of
                          {{ assessment()!.questions.length }}</span
                        >
                      } @else {
                        <span
                          >{{ answeredCount() }} of
                          {{ assessment()!.questions.length }} answered</span
                        >
                      }
                      <span class="ml-2 font-semibold text-gray-800">{{ progressPercent() }}%</span>
                    </div>
                    <div class="direct-test__mode" aria-label="Question view mode">
                      <button
                        type="button"
                        [class.active]="viewMode() === 'single'"
                        (click)="setViewMode('single')"
                      >
                        One by one
                      </button>
                      <button
                        type="button"
                        [class.active]="viewMode() === 'all'"
                        (click)="setViewMode('all')"
                      >
                        All questions
                      </button>
                    </div>
                  </div>
                  <div class="h-2 rounded-full bg-gray-100">
                    <div
                      class="h-2 rounded-full bg-primary-600 transition-all"
                      [style.width.%]="progressPercent()"
                    ></div>
                  </div>
                </div>

                @if (viewMode() === 'single') {
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
                        [disabled]="!hasAllAnswers() || savingResult()"
                        (click)="completeAssessment()"
                      >
                        {{ savingResult() ? 'Saving...' : 'See result' }}
                      </button>
                    }
                  </div>
                } @else {
                  <div class="grid gap-4">
                    @for (question of assessment()!.questions; track question.id; let i = $index) {
                      <section class="direct-test__question-block">
                        <div class="mb-2 flex items-start gap-3">
                          <span class="direct-test__question-number">{{ i + 1 }}</span>
                          <h2 class="text-sm font-semibold leading-6 text-gray-950 sm:text-base">
                            {{ question.text }}
                          </h2>
                        </div>

                        <div class="grid gap-2 sm:grid-cols-2">
                          @for (option of assessment()!.responseOptions; track option.value) {
                            <button
                              type="button"
                              class="direct-test__option"
                              [class.direct-test__option--selected]="answers()[i] === option.value"
                              (click)="selectAnswerAt(i, option.value)"
                            >
                              {{ option.label }}
                            </button>
                          }
                        </div>
                      </section>
                    }
                  </div>

                  <div
                    class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p class="text-sm font-semibold text-gray-600">
                      {{ answeredCount() }} of {{ assessment()!.questions.length }} answered
                    </p>
                    <button
                      type="button"
                      class="btn-primary btn-sm"
                      [disabled]="!hasAllAnswers() || savingResult()"
                      (click)="completeAssessment()"
                    >
                      {{ savingResult() ? 'Saving...' : 'See result' }}
                    </button>
                  </div>
                }
              }
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

      .direct-test__mode {
        display: inline-grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        overflow: hidden;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        background: #f8fafc;
        padding: 0.2rem;
      }

      .direct-test__mode button {
        border: 0;
        border-radius: 0.35rem;
        background: transparent;
        color: #475569;
        padding: 0.45rem 0.65rem;
        font-size: 0.8rem;
        font-weight: 800;
        cursor: pointer;
      }

      .direct-test__mode button.active {
        background: #fff;
        color: var(--brand-primary);
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1);
      }

      .direct-test__question-block {
        border: 1px solid #e5e7eb;
        border-radius: 0.75rem;
        background: #f8fafc;
        padding: 0.9rem;
      }

      .direct-test__question-number {
        display: inline-grid;
        width: 1.65rem;
        height: 1.65rem;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 999px;
        background: rgba(74, 111, 165, 0.11);
        color: var(--brand-primary);
        font-size: 0.78rem;
        font-weight: 900;
      }

      .direct-test__lock {
        border: 1px solid rgba(74, 111, 165, 0.22);
        border-radius: 0.75rem;
        background: rgba(74, 111, 165, 0.06);
        padding: 1rem;
      }

      .direct-test__coupon {
        min-height: 2.5rem;
        flex: 1 1 auto;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        background: #fff;
        padding: 0.55rem 0.75rem;
        color: #111827;
        font-weight: 700;
        text-transform: uppercase;
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
  private readonly assessmentDefinitionService = inject(AssessmentDefinitionService);
  private readonly notificationService = inject(NotificationService);
  private readonly pendingStorageKey = 'hope_hub_direct_pending_assessment_result';
  private autoNextTimer: ReturnType<typeof setTimeout> | null = null;

  assessment = signal<AssessmentConfig | null>(null);
  assessmentAccess = signal<AssessmentAccess | null>(null);
  couponCode = signal('');
  redeemingCoupon = signal(false);
  viewMode = signal<'single' | 'all'>('single');
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
    return Math.round((this.answeredCount() / assessment.questions.length) * 100);
  });

  answeredCount = computed(() => this.answers().filter((answer) => answer !== undefined).length);

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
      if (state.isAuthenticated && this.assessment()) {
        void this.refreshAccess();
      }
      if (state.isAuthenticated && this.resultLocked() && this.result()) {
        void this.saveAndShowResult();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const assessmentId =
      (this.route.snapshot.data['assessmentId'] as string | undefined) ??
      this.route.snapshot.paramMap.get('assessmentId') ??
      undefined;
    const assessment = assessmentId
      ? await firstValueFrom(this.assessmentDefinitionService.get(assessmentId))
      : null;
    if (!assessment) return;

    this.assessment.set(assessment);
    this.assessmentAccess.set(assessment.access ?? null);
    this.answers.set(new Array(assessment.questions.length).fill(undefined));
    await this.refreshAccess();
    this.restorePendingResult(assessment.id);
  }

  canStartAssessment(): boolean {
    const access = this.assessmentAccess() ?? this.assessment()?.access ?? null;
    return !access || access.accessMode === 'FREE' || access.canAccess === true;
  }

  assessmentPriceLabel(): string {
    const priceInPaise =
      this.assessmentAccess()?.priceInPaise ?? this.assessment()?.access?.priceInPaise;
    return priceInPaise ? `₹${Math.round(priceInPaise / 100)}` : 'Paid test';
  }

  lockedAssessmentMessage(): string {
    const access = this.assessmentAccess();
    if (access?.reason === 'SIGN_IN_REQUIRED' || access?.accessMode === 'LOGIN_REQUIRED') {
      return 'Sign in to start this test and keep the result saved to your account.';
    }
    return 'This is a paid test. Use a valid coupon code or complete payment to unlock it.';
  }

  async redeemCoupon(): Promise<void> {
    const assessment = this.assessment();
    const code = this.couponCode().trim();
    if (!assessment || !code) return;
    if (!this.authService.getToken()) {
      this.notificationService.info('Please sign in before applying a coupon.');
      this.authModalService.openLogin();
      return;
    }

    this.redeemingCoupon.set(true);
    try {
      const response = await firstValueFrom(
        this.assessmentDefinitionService.redeemCoupon(assessment.id, code),
      );
      this.assessmentAccess.set(response.access);
      this.couponCode.set('');
      this.notificationService.success(
        response.alreadyRedeemed
          ? 'This test is already unlocked.'
          : 'Coupon applied. Test unlocked.',
      );
    } catch (error: any) {
      this.notificationService.error(
        error?.error?.message || error?.message || 'Could not apply coupon.',
      );
    } finally {
      this.redeemingCoupon.set(false);
    }
  }

  hasCurrentAnswer(): boolean {
    return this.answers()[this.currentQuestion()] !== undefined;
  }

  hasAllAnswers(): boolean {
    const assessment = this.assessment();
    return Boolean(assessment && this.answeredCount() === assessment.questions.length);
  }

  setViewMode(mode: 'single' | 'all'): void {
    this.clearAutoNextTimer();
    this.viewMode.set(mode);
    if (mode === 'single') {
      const firstUnanswered = this.answers().findIndex((answer) => answer === undefined);
      if (firstUnanswered >= 0) {
        this.currentQuestion.set(firstUnanswered);
      }
    }
  }

  selectAnswer(value: number): void {
    this.selectAnswerAt(this.currentQuestion(), value);

    if (this.viewMode() !== 'single') return;
    this.clearAutoNextTimer();
    const assessment = this.assessment();
    if (!assessment || this.currentQuestion() >= assessment.questions.length - 1) return;

    this.autoNextTimer = setTimeout(() => {
      this.nextQuestion();
    }, 220);
  }

  selectAnswerAt(index: number, value: number): void {
    const next = [...this.answers()];
    next[index] = value;
    this.answers.set(next);
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

  async completeAssessment(): Promise<void> {
    const assessment = this.assessment();
    if (!assessment || !this.hasAllAnswers()) return;
    if (!this.canStartAssessment()) {
      this.notificationService.warning(this.lockedAssessmentMessage());
      return;
    }

    const answers = this.answers();
    let result: AssessmentResult;
    this.savingResult.set(true);
    try {
      const response = await firstValueFrom(
        this.assessmentAttemptsService.scoreAttempt(assessment.id, answers),
      );
      result = {
        assessmentId: response.result.assessmentId,
        assessmentType: response.result.assessmentType as AssessmentResult['assessmentType'],
        total: response.result.total,
        maxScore: response.result.maxScore,
        level: response.result.level,
        color: response.result.color,
        description: response.result.description,
        suggestions: response.result.suggestions,
        safetyFlag: response.result.safetyFlag,
        completedAt: new Date(),
        answers: [...response.result.answers],
      };
    } catch (error: any) {
      this.notificationService.error(
        error?.error?.message || error?.message || 'Could not calculate your result.',
      );
      return;
    } finally {
      this.savingResult.set(false);
    }

    this.result.set(result);
    this.savePendingResultLocally(assessment, result);

    if (!this.authService.getToken()) {
      this.resultLocked.set(true);
      this.notificationService.info('Sign up or log in to save your test result.');
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
          answers: result.answers,
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
      this.notificationService.success('Your test result is saved.');
    } catch (error: any) {
      this.notificationService.error(
        error?.error?.message || error?.message || 'Could not save your result. Please try again.',
      );
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
    this.viewMode.set('single');
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

  private async refreshAccess(): Promise<void> {
    const assessment = this.assessment();
    if (!assessment) return;
    const access = await firstValueFrom(this.assessmentDefinitionService.access(assessment.id));
    if (access) this.assessmentAccess.set(access);
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
