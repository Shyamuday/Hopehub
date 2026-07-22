import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AssessmentConfig, AssessmentResult, AssessmentCategory } from '../../../core/models/assessment.model';
import { ASSESSMENT_CONFIGS } from '../../../core/data/assessment-configs';
import { getExerciseRecommendations } from '../../../core/data/exercise-recommendations';
import { getLifestyleTipRecommendations } from '../../../core/data/lifestyle-tip-recommendations';
import { getArticleRecommendations } from '../../../core/data/article-recommendations';
import { ProgressService } from '../../../core/services/progress.service';

@Component({
  selector: 'app-multi-assessment',
  standalone: true,
  imports: [FormsModule, RouterModule, DatePipe],
  templateUrl: './multi-assessment.component.html',
  styleUrl: './multi-assessment.component.scss'
})
export class MultiAssessmentComponent implements OnInit {
  Math = Math; // Make Math available in template

  private router = inject(Router);
  private progressService = inject(ProgressService);

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

  // Computed signals
  filteredAssessments = computed(() => {
    const category = this.selectedCategory();
    if (!category) {
      return this.assessments();
    }
    return this.assessments().filter(a => a.category === category);
  });

  constructor() { }

  ngOnInit() {
    // Component initialized
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
    const maxScore = assessment.responseOptions[assessment.responseOptions.length - 1].value * assessment.questions.length;

    // Check for safety flag
    const safetyFlag = assessment.safetyQuestionIndex !== undefined &&
      answersArray[assessment.safetyQuestionIndex] > 0;

    // Find appropriate scoring interpretation
    const scoring = assessment.scoring.find(s => total >= s.min && total <= s.max);

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
      answers: [...answersArray]
    };

    this.result.set(result);

    // Record progress
    this.progressService.recordAssessmentCompletion(
      assessment.id,
      assessment.type,
      total,
      scoring.level
    );

    this.showResults.set(true);
  }

  retakeAssessment() {
    this.assessmentStarted.set(false);
    this.showResults.set(false);
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
    this.currentQuestion.set(0);
    this.answers.set([]);
    this.result.set(null);
  }

  goBack() {
    this.selectedAssessment.set(null);
    this.assessmentStarted.set(false);
    this.showResults.set(false);
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
          level: result.level
        }
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
          level: result.level
        }
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
          level: result.level
        }
      });
    } else {
      // Navigate to general articles page
      this.router.navigate(['/articles']);
    }
  }
}
