import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AssessmentAccess,
  AssessmentConfig,
  AssessmentResult,
  AssessmentCategory,
} from '../../../core/models/assessment.model';
import { getExerciseRecommendations } from '../../../core/data/exercise-recommendations';
import { getLifestyleTipRecommendations } from '../../../core/data/lifestyle-tip-recommendations';
import { getArticleRecommendations } from '../../../core/data/article-recommendations';
import { ProgressService } from '../../../core/services/progress.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { AssessmentAttemptsService } from '../../../core/services/assessment-attempts.service';
import {
  AssessmentCouponQuote,
  AssessmentDefinitionService,
} from '../../../core/services/assessment-definition.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PaymentService } from '../../../core/services/payment.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-multi-assessment',
  standalone: true,
  imports: [FormsModule, RouterModule, DatePipe],
  templateUrl: './multi-assessment.component.html',
  styleUrl: './multi-assessment.component.scss',
})
export class MultiAssessmentComponent implements OnInit {
  Math = Math; // Make Math available in template
  private readonly pendingStorageKey = 'hope_hub_pending_assessment_result';

  private router = inject(Router);
  private progressService = inject(ProgressService);
  private authService = inject(AuthService);
  private authModalService = inject(AuthModalService);
  private assessmentAttemptsService = inject(AssessmentAttemptsService);
  private assessmentDefinitionService = inject(AssessmentDefinitionService);
  private notificationService = inject(NotificationService);
  private paymentService = inject(PaymentService);

  // Signal-based state
  assessments = signal<AssessmentConfig[]>([]);
  categories = signal<AssessmentCategory[]>([]);
  selectedCategory = signal<AssessmentCategory | null>(null);
  selectedAssessment = signal<AssessmentConfig | null>(null);
  selectedAccess = signal<AssessmentAccess | null>(null);
  couponQuote = signal<AssessmentCouponQuote | null>(null);
  couponCode = signal('');
  redeemingCoupon = signal(false);
  payingAssessment = signal(false);
  assessmentStarted = signal(false);
  showResults = signal(false);
  viewMode = signal<'single' | 'all'>('single');
  currentQuestion = signal(0);
  answers = signal<number[]>([]);
  result = signal<AssessmentResult | null>(null);
  resultLocked = signal(false);
  savingResult = signal(false);
  saveError = signal<string | null>(null);
  savedAttempt = signal<{ id: string; retakeNumber: number } | null>(null);
  previousAttempt = signal<{
    id: string;
    retakeNumber: number;
    totalScore: number;
    level: string;
    completedAt: string;
  } | null>(null);

  // Computed signals
  filteredAssessments = computed(() => {
    const category = this.selectedCategory();
    if (!category) {
      return this.assessments();
    }
    return this.assessments().filter((a) => a.category === category);
  });
  answeredCount = computed(() => this.answers().filter((answer) => answer !== undefined).length);
  progressPercent = computed(() => {
    const assessment = this.selectedAssessment();
    if (!assessment) return 0;
    return Math.round((this.answeredCount() / assessment.questions.length) * 100);
  });

  constructor() {
    this.authService.authState$.pipe(takeUntilDestroyed()).subscribe((state) => {
      if (state.isAuthenticated && this.selectedAssessment()) {
        void this.refreshSelectedAccess();
      }
      if (state.isAuthenticated && this.resultLocked() && this.result()) {
        void this.savePendingResultAndShow();
      }
    });
  }

  ngOnInit() {
    void this.loadAssessments();
    this.restorePendingResult();
  }

  private async loadAssessments() {
    try {
      const assessments = await firstValueFrom(this.assessmentDefinitionService.list());
      this.assessments.set(assessments);
      this.categories.set([...new Set(assessments.map((assessment) => assessment.category))]);
    } catch {
      this.assessments.set([]);
      this.categories.set([]);
      this.notificationService.error(
        'Assessments are unavailable right now. Please try again later.',
      );
    }
  }

  filterByCategory(category: AssessmentCategory) {
    this.selectedCategory.set(category);
  }

  showAllAssessments() {
    this.selectedCategory.set(null);
  }

  selectAssessment(assessment: AssessmentConfig) {
    this.selectedAssessment.set(assessment);
    this.selectedAccess.set(assessment.access ?? null);
    this.couponQuote.set(null);
    this.answers.set(new Array(assessment.questions.length).fill(undefined));
    void this.refreshSelectedAccess();
    this.startAssessment();
  }

  startAssessment() {
    this.assessmentStarted.set(true);
    this.currentQuestion.set(0);
    this.viewMode.set('single');
  }

  nextQuestion() {
    const current = this.currentQuestion();
    const assessment = this.selectedAssessment();
    if (assessment && current < assessment.questions.length - 1) {
      this.currentQuestion.set(current + 1);
    }
  }

  previousQuestion() {
    const current = this.currentQuestion();
    if (current > 0) {
      this.currentQuestion.set(current - 1);
    }
  }

  selectAnswer(value: number) {
    const current = this.currentQuestion();
    this.selectAnswerAt(current, value);
  }

  selectAnswerAt(index: number, value: number) {
    const answersArray = [...this.answers()];
    answersArray[index] = value;
    this.answers.set(answersArray);
  }

  setViewMode(mode: 'single' | 'all') {
    this.viewMode.set(mode);
    if (mode === 'single') {
      const firstUnanswered = this.answers().findIndex((answer) => answer === undefined);
      if (firstUnanswered >= 0) {
        this.currentQuestion.set(firstUnanswered);
      }
    }
  }

  hasAllAnswers() {
    const assessment = this.selectedAssessment();
    return Boolean(assessment && this.answeredCount() === assessment.questions.length);
  }

  canStartSelectedAssessment(): boolean {
    const access = this.selectedAccess() ?? this.selectedAssessment()?.access ?? null;
    return !access || access.accessMode === 'FREE' || access.canAccess === true;
  }

  assessmentPriceLabel(assessment: AssessmentConfig): string {
    const priceInPaise = assessment.access?.priceInPaise;
    return priceInPaise ? `₹${Math.round(priceInPaise / 100)}` : 'Paid';
  }

  assessmentAmountLabel(amountInPaise: number): string {
    return `₹${Math.round(Number(amountInPaise || 0) / 100)}`;
  }

  payAssessmentLabel(): string {
    const amount = this.couponQuote()?.payableAmountInPaise ?? this.selectedAccess()?.priceInPaise;
    return amount ? `Pay ${this.assessmentAmountLabel(amount)} and unlock` : 'Pay and unlock';
  }

  lockedAssessmentMessage(): string {
    const access = this.selectedAccess();
    if (access?.reason === 'SIGN_IN_REQUIRED' || access?.accessMode === 'LOGIN_REQUIRED') {
      return 'Sign in to start this test and save the result privately.';
    }
    return 'Use a valid coupon code or complete payment to unlock this test.';
  }

  hasAssessmentIntro(assessment: AssessmentConfig | null): boolean {
    return Boolean(
      assessment &&
      ((assessment.whoShouldTake?.length ?? 0) ||
        (assessment.possibleSymptoms?.length ?? 0) ||
        (assessment.whatThisTestChecks?.length ?? 0) ||
        (assessment.beforeYouStart?.length ?? 0) ||
        assessment.disclaimer),
    );
  }

  async redeemCoupon(): Promise<void> {
    const assessment = this.selectedAssessment();
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
      this.selectedAccess.set(response.access);
      this.couponCode.set('');
      this.couponQuote.set(null);
      this.notificationService.success(
        response.alreadyRedeemed
          ? 'This test is already unlocked.'
          : 'Coupon applied. Test unlocked.',
      );
    } catch (error: any) {
      if (error?.status === 402 && error?.error?.quote) {
        this.couponQuote.set(error.error.quote);
        this.couponCode.set(error.error.quote.couponCode || code);
        this.notificationService.success('Discount coupon applied.');
        return;
      }
      this.notificationService.error(
        error?.error?.message || error?.message || 'Could not apply coupon.',
      );
    } finally {
      this.redeemingCoupon.set(false);
    }
  }

  async payAndUnlock(): Promise<void> {
    const assessment = this.selectedAssessment();
    if (!assessment) return;
    if (!this.authService.getToken()) {
      this.notificationService.info('Please sign in before payment.');
      this.authModalService.openLogin();
      return;
    }

    this.payingAssessment.set(true);
    try {
      const access = await this.paymentService.payAssessment(
        assessment,
        undefined,
        this.couponQuote()?.couponCode,
      );
      if (access) this.selectedAccess.set(access);
      await this.refreshSelectedAccess();
      this.couponQuote.set(null);
      this.notificationService.success('Payment verified. Test unlocked.');
    } catch (error: any) {
      this.notificationService.error(error?.message || 'Payment could not be completed.');
    } finally {
      this.payingAssessment.set(false);
    }
  }

  async calculateResults() {
    const assessment = this.selectedAssessment();
    if (!assessment) return;
    if (!this.canStartSelectedAssessment()) {
      this.notificationService.warning(this.lockedAssessmentMessage());
      return;
    }

    const answersArray = this.answers();
    this.savingResult.set(true);
    let result: AssessmentResult;
    try {
      const response = await firstValueFrom(
        this.assessmentAttemptsService.scoreAttempt(assessment.id, answersArray),
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
    this.savePendingResultLocally(result, assessment);

    if (!this.authService.getToken()) {
      this.resultLocked.set(true);
      this.showResults.set(false);
      this.notificationService.info('Sign up or log in to save your assessment result.');
      this.authModalService.openRegister();
      return;
    }

    void this.savePendingResultAndShow();
  }

  retakeAssessment() {
    this.assessmentStarted.set(false);
    this.showResults.set(false);
    this.resultLocked.set(false);
    this.saveError.set(null);
    this.savedAttempt.set(null);
    this.previousAttempt.set(null);
    this.currentQuestion.set(0);
    this.viewMode.set('single');
    const assessment = this.selectedAssessment();
    if (assessment) {
      this.answers.set(new Array(assessment.questions.length).fill(undefined));
    }
    this.result.set(null);
  }

  takeAnotherAssessment() {
    this.selectedAssessment.set(null);
    this.selectedAccess.set(null);
    this.couponQuote.set(null);
    this.assessmentStarted.set(false);
    this.showResults.set(false);
    this.resultLocked.set(false);
    this.saveError.set(null);
    this.savedAttempt.set(null);
    this.previousAttempt.set(null);
    this.currentQuestion.set(0);
    this.viewMode.set('single');
    this.answers.set([]);
    this.result.set(null);
  }

  goBack() {
    this.selectedAssessment.set(null);
    this.selectedAccess.set(null);
    this.couponQuote.set(null);
    this.assessmentStarted.set(false);
    this.showResults.set(false);
    this.resultLocked.set(false);
    this.saveError.set(null);
    this.savedAttempt.set(null);
    this.previousAttempt.set(null);
    this.currentQuestion.set(0);
    this.viewMode.set('single');
    this.answers.set([]);
    this.result.set(null);
  }

  viewExercises() {
    const result = this.result();
    const assessment = this.selectedAssessment();
    if (!result || !assessment) return;

    // Get exercise recommendations based on assessment result
    const recommendedExerciseIds = getExerciseRecommendations(assessment.id, result.total);

    if (recommendedExerciseIds.length > 0) {
      // Navigate to exercises page with recommended exercises
      this.router.navigate(['/exercises'], {
        queryParams: {
          recommended: recommendedExerciseIds.join(','),
          assessment: assessment.type,
          score: result.total,
          level: result.level,
        },
      });
    } else {
      // Navigate to general exercises page
      this.router.navigate(['/exercises']);
    }
  }

  viewLifestyleTips() {
    const result = this.result();
    const assessment = this.selectedAssessment();
    if (!result || !assessment) return;

    // Get lifestyle tip recommendations based on assessment result
    const recommendedTipIds = getLifestyleTipRecommendations(assessment.id, result.total);

    if (recommendedTipIds.length > 0) {
      // Navigate to lifestyle tips page with recommended tips
      this.router.navigate(['/lifestyle-tips'], {
        queryParams: {
          recommended: recommendedTipIds.join(','),
          assessment: assessment.type,
          score: result.total,
          level: result.level,
        },
      });
    } else {
      // Navigate to general lifestyle tips page
      this.router.navigate(['/lifestyle-tips']);
    }
  }

  viewArticles() {
    const result = this.result();
    const assessment = this.selectedAssessment();
    if (!result || !assessment) return;

    // Get article recommendations based on assessment result
    const recommendedArticleIds = getArticleRecommendations(assessment.id, result.total);

    if (recommendedArticleIds.length > 0) {
      // Navigate to articles page with recommended articles
      this.router.navigate(['/articles'], {
        queryParams: {
          recommended: recommendedArticleIds.join(','),
          assessment: assessment.type,
          score: result.total,
          level: result.level,
        },
      });
    } else {
      // Navigate to general articles page
      this.router.navigate(['/articles']);
    }
  }

  openLogin() {
    this.authModalService.openLogin();
  }

  openRegister() {
    this.authModalService.openRegister();
  }

  async savePendingResultAndShow(): Promise<void> {
    const result = this.result();
    const assessment = this.selectedAssessment();
    if (!result || !assessment || this.savingResult()) return;

    this.savingResult.set(true);
    this.saveError.set(null);

    try {
      const response = await firstValueFrom(
        this.assessmentAttemptsService.saveAttempt({
          assessmentId: assessment.id,
          answers: result.answers,
          source: 'healing-web',
          entryPage: typeof window === 'undefined' ? undefined : window.location.href,
          completedAt: result.completedAt.toISOString(),
        }),
      );

      this.savedAttempt.set({
        id: response.attempt.id,
        retakeNumber: response.attempt.retakeNumber,
      });
      this.previousAttempt.set(response.previous);

      this.progressService.recordAssessmentCompletion(
        assessment.id,
        assessment.type,
        result.total,
        result.level,
      );

      this.clearPendingResult();
      this.resultLocked.set(false);
      this.showResults.set(true);
      this.notificationService.success('Your assessment result is saved.');
    } catch (error: any) {
      const message =
        error?.error?.message || error?.message || 'Could not save your result. Please try again.';
      this.saveError.set(message);
      this.notificationService.error(message);
    } finally {
      this.savingResult.set(false);
    }
  }

  private savePendingResultLocally(result: AssessmentResult, assessment: AssessmentConfig) {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(
      this.pendingStorageKey,
      JSON.stringify({
        assessment,
        result,
        savedAt: new Date().toISOString(),
      }),
    );
  }

  private restorePendingResult() {
    if (typeof sessionStorage === 'undefined' || this.authService.getToken()) return;
    const raw = sessionStorage.getItem(this.pendingStorageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        assessment: AssessmentConfig;
        result: AssessmentResult & { completedAt: string };
        savedAt: string;
      };
      const savedAt = new Date(parsed.savedAt).getTime();
      const isFresh = Date.now() - savedAt < 60 * 60 * 1000;
      if (!isFresh) {
        this.clearPendingResult();
        return;
      }

      this.selectedAssessment.set(parsed.assessment);
      this.selectedAccess.set(parsed.assessment.access ?? null);
      this.answers.set(parsed.result.answers);
      this.result.set({
        ...parsed.result,
        completedAt: new Date(parsed.result.completedAt),
      });
      this.assessmentStarted.set(false);
      this.resultLocked.set(true);
    } catch {
      this.clearPendingResult();
    }
  }

  private clearPendingResult() {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(this.pendingStorageKey);
  }

  private async refreshSelectedAccess(): Promise<void> {
    const assessment = this.selectedAssessment();
    if (!assessment) return;
    const access = await firstValueFrom(this.assessmentDefinitionService.access(assessment.id));
    if (access) this.selectedAccess.set(access);
  }
}
