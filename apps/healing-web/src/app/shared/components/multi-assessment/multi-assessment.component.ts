import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AssessmentConfig,
  AssessmentResult,
  AssessmentCategory,
} from '../../../core/models/assessment.model';
import { ASSESSMENT_CONFIGS } from '../../../core/data/assessment-configs';
import { getExerciseRecommendations } from '../../../core/data/exercise-recommendations';
import { getLifestyleTipRecommendations } from '../../../core/data/lifestyle-tip-recommendations';
import { getArticleRecommendations } from '../../../core/data/article-recommendations';
import { ProgressService } from '../../../core/services/progress.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { AssessmentAttemptsService } from '../../../core/services/assessment-attempts.service';
import { AssessmentDefinitionService } from '../../../core/services/assessment-definition.service';
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

  // Signal-based state
  assessments = signal<AssessmentConfig[]>(ASSESSMENT_CONFIGS);
  categories = signal<AssessmentCategory[]>(Object.values(AssessmentCategory));
  selectedCategory = signal<AssessmentCategory | null>(null);
  selectedAssessment = signal<AssessmentConfig | null>(null);
  assessmentStarted = signal(false);
  showResults = signal(false);
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

  constructor() {
    this.authService.authState$.pipe(takeUntilDestroyed()).subscribe((state) => {
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
    const assessments = await firstValueFrom(this.assessmentDefinitionService.list());
    this.assessments.set(assessments);
    this.categories.set([...new Set(assessments.map((assessment) => assessment.category))]);
  }

  filterByCategory(category: AssessmentCategory) {
    this.selectedCategory.set(category);
  }

  showAllAssessments() {
    this.selectedCategory.set(null);
  }

  selectAssessment(assessment: AssessmentConfig) {
    this.selectedAssessment.set(assessment);
    this.answers.set(new Array(assessment.questions.length).fill(undefined));
  }

  startAssessment() {
    this.assessmentStarted.set(true);
    this.currentQuestion.set(0);
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
    const answersArray = [...this.answers()];
    answersArray[current] = value;
    this.answers.set(answersArray);
  }

  calculateResults() {
    const assessment = this.selectedAssessment();
    if (!assessment) return;

    const answersArray = this.answers();
    const total = answersArray.reduce((sum, answer) => sum + (answer || 0), 0);
    const maxScore =
      assessment.responseOptions[assessment.responseOptions.length - 1].value *
      assessment.questions.length;

    // Check for safety flag
    const safetyFlag =
      assessment.safetyQuestionIndex !== undefined &&
      answersArray[assessment.safetyQuestionIndex] > 0;

    // Find appropriate scoring interpretation
    const scoring = assessment.scoring.find((s) => total >= s.min && total <= s.max);

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
      safetyFlag,
      completedAt: new Date(),
      answers: [...answersArray],
    };

    this.result.set(result);
    this.savePendingResultLocally(result, assessment);

    if (!this.authService.getToken()) {
      this.resultLocked.set(true);
      this.showResults.set(false);
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
    const assessment = this.selectedAssessment();
    if (assessment) {
      this.answers.set(new Array(assessment.questions.length).fill(undefined));
    }
    this.result.set(null);
  }

  takeAnotherAssessment() {
    this.selectedAssessment.set(null);
    this.assessmentStarted.set(false);
    this.showResults.set(false);
    this.resultLocked.set(false);
    this.saveError.set(null);
    this.savedAttempt.set(null);
    this.previousAttempt.set(null);
    this.currentQuestion.set(0);
    this.answers.set([]);
    this.result.set(null);
  }

  goBack() {
    this.selectedAssessment.set(null);
    this.assessmentStarted.set(false);
    this.showResults.set(false);
    this.resultLocked.set(false);
    this.saveError.set(null);
    this.savedAttempt.set(null);
    this.previousAttempt.set(null);
    this.currentQuestion.set(0);
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
    } catch (error: any) {
      this.saveError.set(
        error?.error?.message || error?.message || 'Could not save your result. Please try again.',
      );
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
}
