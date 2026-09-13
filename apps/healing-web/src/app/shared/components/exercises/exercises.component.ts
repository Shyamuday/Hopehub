import { Component, DestroyRef, OnInit, input, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import {
  Exercise,
  ExerciseCategory,
  ExerciseType,
  ExerciseDifficulty,
} from '../../../core/models/exercise.model';
import { ProgressService } from '../../../core/services/progress.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PracticeService } from '../../../core/services/practice.service';
import { MoodRating } from '../../../core/models/progress.model';
import type { FormDropdownOption } from '../form-dropdown/form-dropdown.component';
import { AppButtonComponent } from '../app-button/app-button.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { FilterBarComponent } from '../filter-bar/filter-bar.component';
import { PageHeaderComponent } from '../page-header/page-header.component';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    AppButtonComponent,
    EmptyStateComponent,
    FilterBarComponent,
    PageHeaderComponent,
  ],
  template: `
    <section class="professional-page">
      <div class="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <app-page-header
          title="Mental health exercises"
          description="Discover evidence-based exercises to improve your mental well-being. Practice regularly for best results."
          [level]="1"
        />

        <app-filter-bar
          [searchValue]="searchTerm"
          searchPlaceholder="Search by name, benefits, or tags..."
          [filters]="[
            {
              key: 'category',
              label: 'Category',
              placeholder: 'All Categories',
              value: selectedCategory,
              options: categoryOptions,
            },
            {
              key: 'type',
              label: 'Type',
              placeholder: 'All Types',
              value: selectedType,
              options: typeOptions,
            },
          ]"
          (searchValueChange)="updateExerciseSearch($event)"
          (filterChange)="updateExerciseFilter($event)"
        />

        <div class="-mt-4 mb-6 flex flex-wrap gap-2">
          @for (category of quickCategories; track category) {
            <app-button
              (click)="selectQuickCategory(category)"
              [variant]="selectedCategory === category ? 'primary' : 'outline'"
              size="sm"
            >
              {{ category }}
            </app-button>
          }
          <app-button variant="outline" size="sm" (click)="clearFilters()">Clear All</app-button>
        </div>

        <!-- Exercise Grid -->
        @if (!selectedExercise()) {
          <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            @for (exercise of filteredExercises(); track exercise.id) {
              <div
                class="flex h-full cursor-pointer flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
                (click)="selectExercise(exercise)"
              >
                <!-- Exercise Header -->
                <div class="flex flex-1 flex-col">
                  <div class="flex items-center justify-between mb-3">
                    <span
                      class="rounded-md bg-primary-50 px-3 py-1 text-sm font-semibold text-primary-700"
                    >
                      {{ exercise.type }}
                    </span>
                    <span class="text-sm text-gray-500">{{ exercise.duration }}</span>
                  </div>

                  <h3 class="mb-3 text-lg font-semibold text-gray-950">{{ exercise.title }}</h3>
                  <p class="mb-4 line-clamp-3 text-sm leading-6 text-gray-700">
                    {{ exercise.description }}
                  </p>

                  <!-- Difficulty -->
                  <div
                    class="mb-5 mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4"
                  >
                    <div class="flex items-center">
                      <span class="text-sm text-gray-500">{{ exercise.difficulty }}</span>
                    </div>
                    <span class="text-sm font-semibold text-gray-700"
                      >{{ exercise.steps.length }} steps</span
                    >
                  </div>
                  <app-button size="sm" block>Start exercise</app-button>
                </div>
              </div>
            }
          </div>
        }

        <!-- No Results -->
        @if (filteredExercises().length === 0 && !selectedExercise()) {
          <app-empty-state
            icon="🧘"
            title="No exercises found"
            message="Try adjusting your filters or search terms."
          >
            <app-button variant="outline" size="sm" (click)="clearFilters()"
              >Clear Filters</app-button
            >
          </app-empty-state>
        }

        <!-- Selected Exercise Detail -->
        @if (selectedExercise()) {
          <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <!-- Back Button -->
            <app-button variant="link" size="sm" class="mb-6" (click)="goBack()">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to exercises
            </app-button>

            <!-- Exercise Header -->
            <div class="mb-8">
              <div class="flex items-center gap-4 mb-4">
                <span class="bg-slate-100 text-slate-700 px-4 py-2 rounded-full font-semibold">
                  {{ selectedExercise()!.type }}
                </span>
                <span class="text-slate-500">{{ selectedExercise()!.duration }}</span>
                <span
                  [class]="getDifficultyColor(selectedExercise()!.difficulty)"
                  class="px-3 py-1 rounded-full text-sm font-medium"
                >
                  {{ selectedExercise()!.difficulty }}
                </span>
              </div>

              <h2 class="mb-4 text-2xl font-semibold text-gray-950 sm:text-3xl">
                {{ selectedExercise()!.title }}
              </h2>
              <p class="mb-6 text-base leading-7 text-gray-700 sm:text-lg">
                {{ selectedExercise()!.description }}
              </p>

              <!-- Categories -->
              <div class="flex flex-wrap gap-2 mb-6">
                @for (category of selectedExercise()!.category; track category) {
                  <span class="rounded-md bg-gray-50 px-3 py-1 text-sm text-gray-700">
                    {{ category }}
                  </span>
                }
              </div>
            </div>

            <!-- Benefits -->
            <div class="mb-8">
              <h3 class="text-xl font-semibold text-slate-800 mb-4">Benefits</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                @for (benefit of selectedExercise()!.benefits; track benefit) {
                  <div class="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                    <svg
                      class="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                    <span class="text-green-800 text-sm">{{ benefit }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Steps -->
            <div class="mb-8">
              <h3 class="mb-4 text-xl font-semibold text-gray-950">Steps</h3>
              <div class="space-y-4">
                @for (step of selectedExercise()!.steps; track step.stepNumber) {
                  <div class="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
                    <div
                      class="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    >
                      {{ step.stepNumber }}
                    </div>
                    <div class="flex-1">
                      <p class="text-slate-800 font-medium mb-1">{{ step.instruction }}</p>
                      @if (step.duration) {
                        <p class="text-slate-600 text-sm mb-1">
                          <strong>Duration:</strong> {{ step.duration }}
                        </p>
                      }
                      @if (step.tip) {
                        <p class="text-blue-700 text-sm"><strong>Tip:</strong> {{ step.tip }}</p>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Tips -->
            @if (selectedExercise()!.tips.length > 0) {
              <div class="mb-8">
                <h3 class="mb-4 text-xl font-semibold text-gray-950">Helpful tips</h3>
                <div class="bg-blue-50 rounded-lg p-6">
                  <ul class="space-y-2">
                    @for (tip of selectedExercise()!.tips; track tip) {
                      <li class="flex items-start space-x-3">
                        <svg
                          class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        <span class="text-blue-800">{{ tip }}</span>
                      </li>
                    }
                  </ul>
                </div>
              </div>
            }

            <!-- When to Use -->
            @if (selectedExercise()!.whenToUse.length > 0) {
              <div class="mb-8">
                <h3 class="mb-4 text-xl font-semibold text-gray-950">When to use this exercise</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  @for (usage of selectedExercise()!.whenToUse; track usage) {
                    <div class="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                      <svg
                        class="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      <span class="text-purple-800 text-sm">{{ usage }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Contraindications -->
            @if (
              selectedExercise() &&
              selectedExercise()!.contraindications &&
              selectedExercise()!.contraindications!.length > 0
            ) {
              <div class="mb-8">
                <h3 class="mb-4 text-xl font-semibold text-gray-950">Important considerations</h3>
                <div class="bg-red-50 border border-red-200 rounded-lg p-6">
                  <ul class="space-y-2">
                    @for (
                      contraindication of selectedExercise()!.contraindications!;
                      track contraindication
                    ) {
                      <li class="flex items-start space-x-3">
                        <svg
                          class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fill-rule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clip-rule="evenodd"
                          />
                        </svg>
                        <span class="text-red-800">{{ contraindication }}</span>
                      </li>
                    }
                  </ul>
                </div>
              </div>
            }

            <!-- Action Buttons -->
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
              <app-button size="sm" (click)="startExercise()">Start exercise</app-button>
              @if (selectedExercise()) {
                <app-button size="sm" (click)="showCompletionDialog(selectedExercise()!)">
                  Mark completed
                </app-button>
              }
              <app-button variant="outline" size="sm" (click)="goBack()"
                >Browse more exercises</app-button
              >
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      /* Line clamp for descriptions */
      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      /* Smooth transitions */
      .transition-all {
        transition: all 0.3s ease;
      }

      /* Mobile responsiveness */
      @media (max-width: 640px) {
        .grid-cols-1 {
          grid-template-columns: 1fr;
        }

        .flex-col {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class ExercisesComponent implements OnInit {
  recommendedExerciseIds = input<string[]>([]);

  exercises: Exercise[] = [];
  filteredExercises = signal<Exercise[]>([]);
  selectedExercise = signal<Exercise | null>(null);

  categories: ExerciseCategory[] = Object.values(ExerciseCategory);
  types: ExerciseType[] = Object.values(ExerciseType);
  categoryOptions: FormDropdownOption[] = [
    { value: '', label: 'All Categories' },
    ...Object.values(ExerciseCategory).map((category) => ({ value: category, label: category })),
  ];
  typeOptions: FormDropdownOption[] = [
    { value: '', label: 'All Types' },
    ...Object.values(ExerciseType).map((type) => ({ value: type, label: type })),
  ];
  quickCategories: ExerciseCategory[] = [
    ExerciseCategory.ANXIETY,
    ExerciseCategory.DEPRESSION,
    ExerciseCategory.STRESS,
    ExerciseCategory.SLEEP,
  ];

  searchTerm = '';
  selectedCategory = '';
  selectedType = '';
  private isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private progressService: ProgressService,
    private practiceService: PracticeService,
    private notificationService: NotificationService,
    private destroyRef: DestroyRef,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params: any) => {
      this.loadPageData(params);
    });

    if (this.recommendedExerciseIds().length > 0) {
      this.showRecommendedExercises(this.recommendedExerciseIds());
    }

    this.filterExercises();
  }

  private loadPageData(params: any): void {
    this.practiceService
      .pageData({
        assessmentType: params['assessment'],
        concern: params['concern'],
        score: params['score'],
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pageData) => {
          this.exercises = pageData.exercises;
          this.filteredExercises.set(pageData.exercises);

          if (pageData.recommendations.length) {
            this.filteredExercises.set(pageData.recommendations);
          } else if (params['recommended']) {
            this.showRecommendedExercises(params['recommended'].split(','));
          } else {
            this.filterExercises();
          }
        },
        error: () => {
          this.exercises = [];
          this.filteredExercises.set([]);
        },
      });
  }

  showRecommendedExercises(exerciseIds: string[]) {
    const recommended = exerciseIds
      .map((id) =>
        this.exercises.find((exercise) => exercise.id === id || exercise.sourceSlug === id),
      )
      .filter((ex) => ex !== undefined) as Exercise[];
    if (recommended.length > 0) {
      this.filteredExercises.set(recommended);
    }
  }

  filterExercises() {
    let filtered = this.exercises;

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchTerm = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (exercise) =>
          exercise.title.toLowerCase().includes(searchTerm) ||
          exercise.description.toLowerCase().includes(searchTerm) ||
          exercise.tags.some((tag) => tag.toLowerCase().includes(searchTerm)) ||
          exercise.benefits.some((benefit) => benefit.toLowerCase().includes(searchTerm)),
      );
    }

    // Apply category filter
    if (this.selectedCategory) {
      filtered = filtered.filter((ex) =>
        ex.category.includes(this.selectedCategory as ExerciseCategory),
      );
    }

    // Apply type filter
    if (this.selectedType) {
      filtered = filtered.filter((ex) => ex.type === this.selectedType);
    }

    this.filteredExercises.set(filtered);
  }

  updateExerciseSearch(value: string): void {
    this.searchTerm = value;
    this.filterExercises();
  }

  updateExerciseFilter(event: { key: string; value: string }): void {
    if (event.key === 'category') {
      this.selectedCategory = event.value;
    }

    if (event.key === 'type') {
      this.selectedType = event.value;
    }

    this.filterExercises();
  }

  selectQuickCategory(category: ExerciseCategory) {
    this.selectedCategory = category;
    this.filterExercises();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedType = '';
    this.filteredExercises.set(this.exercises);
  }

  selectExercise(exercise: Exercise) {
    this.selectedExercise.set(exercise);
  }

  goBack() {
    this.selectedExercise.set(null);
  }

  startExercise() {
    if (!this.isBrowser) return;
    this.notificationService.info('Exercise started. Follow the step-by-step instructions above.');
  }

  completeExercise(
    exercise: Exercise,
    duration: number = 10,
    rating: number = 4,
    mood: MoodRating = MoodRating.GOOD,
    notes?: string,
  ) {
    // Record exercise completion in progress service
    this.progressService.recordExerciseSession(
      exercise.id,
      exercise.title,
      exercise.type,
      duration,
      rating,
      mood,
      notes,
    );

    if (exercise.sourceSlug) {
      this.practiceService
        .recordSession(exercise.id, {
          durationMinutes: duration,
          helpfulRating: rating,
          moodAfter: String(mood),
          notes,
          source: 'healing-web',
        })
        .subscribe({ error: () => undefined });
    }

    this.notificationService.success(
      `Great job completing "${exercise.title}". Your progress has been recorded.`,
    );
  }

  // Method to show completion modal (could be enhanced with a proper modal)
  showCompletionDialog(exercise: Exercise) {
    if (!this.isBrowser) return;
    const duration = prompt('How many minutes did you practice? (default: 10)', '10');
    const rating = prompt('How would you rate this session? (1-5, default: 4)', '4');
    const notes = prompt('Any notes about this session? (optional)', '');

    if (duration && rating) {
      this.completeExercise(
        exercise,
        parseInt(duration) || 10,
        parseInt(rating) || 4,
        MoodRating.GOOD,
        notes || undefined,
      );
    }
  }

  getDifficultyColor(difficulty: ExerciseDifficulty): string {
    switch (difficulty) {
      case ExerciseDifficulty.BEGINNER:
        return 'bg-green-100 text-green-800';
      case ExerciseDifficulty.INTERMEDIATE:
        return 'bg-yellow-100 text-yellow-800';
      case ExerciseDifficulty.ADVANCED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}
