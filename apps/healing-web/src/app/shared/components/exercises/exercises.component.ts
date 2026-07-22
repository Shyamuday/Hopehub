import { Component, OnInit, input, signal, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Exercise, ExerciseCategory, ExerciseType, ExerciseDifficulty } from '../../../core/models/exercise.model';
import { ALL_EXERCISES, getExerciseById, getExercisesByCategory, getExercisesByType, searchExercises } from '../../../core/data/exercise-configs';
import { ProgressService } from '../../../core/services/progress.service';
import { MoodRating } from '../../../core/models/progress.model';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [FormsModule, RouterModule],
  template: `
    <section class="bg-slate-50 py-12">
      <div class="max-w-6xl mx-auto px-6">
        
        <!-- Header -->
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold text-slate-800 mb-4">Mental Health Exercises</h2>
          <p class="text-slate-600 max-w-3xl mx-auto text-lg">
            Discover evidence-based exercises to improve your mental well-being. Practice regularly for best results.
          </p>
        </div>

        <!-- Filters and Search -->
        <div class="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <!-- Search -->
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-slate-700 mb-2">Search Exercises</label>
              <input 
                type="text" 
                [(ngModel)]="searchTerm"
                (input)="filterExercises()"
                placeholder="Search by name, benefits, or tags..."
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500">
            </div>

            <!-- Category Filter -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select 
                [(ngModel)]="selectedCategory"
                (change)="filterExercises()"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500">
                <option value="">All Categories</option>
                @for (category of categories; track category) {
                  <option [value]="category">{{ category }}</option>
                }
              </select>
            </div>

            <!-- Type Filter -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Type</label>
              <select 
                [(ngModel)]="selectedType"
                (change)="filterExercises()"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500">
                <option value="">All Types</option>
                @for (type of types; track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </div>
          </div>

          <!-- Quick Category Buttons -->
          <div class="flex flex-wrap gap-2 mt-4">
            @for (category of quickCategories; track category) {
              <button 
                (click)="selectQuickCategory(category)"
                [class.bg-slate-800]="selectedCategory === category"
                [class.text-white]="selectedCategory === category"
                [class.bg-slate-200]="selectedCategory !== category"
                [class.text-slate-700]="selectedCategory !== category"
                class="px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors">
                {{ category }}
              </button>
            }
            <button 
              (click)="clearFilters()"
              class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
              Clear All
            </button>
          </div>
        </div>

        <!-- Exercise Grid -->
        @if (!selectedExercise()) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (exercise of filteredExercises(); track exercise.id) {
              <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
                   (click)="selectExercise(exercise)">
                
                <!-- Exercise Header -->
                <div class="p-6 pb-4">
                  <div class="flex items-center justify-between mb-3">
                    <span class="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm font-semibold">
                      {{ exercise.type }}
                    </span>
                    <span class="text-slate-500 text-sm">{{ exercise.duration }}</span>
                  </div>

                  <h3 class="text-xl font-bold text-slate-800 mb-3">{{ exercise.title }}</h3>
                  <p class="text-slate-600 mb-4 line-clamp-3">{{ exercise.description }}</p>

                  <!-- Categories -->
                  <div class="flex flex-wrap gap-1 mb-4">
                    @for (category of exercise.category; track category) {
                      <span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                        {{ category }}
                      </span>
                    }
                  </div>

                  <!-- Difficulty -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <span class="text-sm text-slate-500 mr-2">Difficulty:</span>
                      <span [class]="getDifficultyColor(exercise.difficulty)" 
                            class="px-2 py-1 rounded text-xs font-medium">
                        {{ exercise.difficulty }}
                      </span>
                    </div>
                    <span class="text-sm font-semibold text-slate-700">{{ exercise.steps.length }} steps</span>
                  </div>
                </div>

                <!-- Benefits Preview -->
                <div class="px-6 pb-6">
                  <div class="border-t pt-4">
                    <h4 class="text-sm font-semibold text-slate-700 mb-2">Key Benefits:</h4>
                    <ul class="text-sm text-slate-600 space-y-1">
                      @for (benefit of exercise.benefits.slice(0, 3); track benefit) {
                        <li class="flex items-start">
                          <svg class="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                          </svg>
                          {{ benefit }}
                        </li>
                      }
                    </ul>
                    <button class="mt-3 w-full bg-slate-800 text-white py-2 rounded-lg font-semibold hover:bg-slate-700 transition-colors">
                      Start Exercise
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- No Results -->
        @if (filteredExercises().length === 0 && !selectedExercise()) {
          <div class="text-center py-12">
            <svg class="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47.881-6.08 2.33l-.147.083A7.994 7.994 0 0112 21.001z"/>
            </svg>
            <h3 class="text-xl font-semibold text-slate-700 mb-2">No exercises found</h3>
            <p class="text-slate-500 mb-4">Try adjusting your filters or search terms.</p>
            <button (click)="clearFilters()" class="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors">
              Clear Filters
            </button>
          </div>
        }

        <!-- Selected Exercise Detail -->
        @if (selectedExercise()) {
          <div class="bg-white rounded-xl shadow-lg p-8">
            
            <!-- Back Button -->
            <button (click)="goBack()" class="mb-6 text-slate-600 hover:text-slate-800 flex items-center">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              Back to Exercises
            </button>

            <!-- Exercise Header -->
            <div class="mb-8">
              <div class="flex items-center gap-4 mb-4">
                <span class="bg-slate-100 text-slate-700 px-4 py-2 rounded-full font-semibold">
                  {{ selectedExercise()!.type }}
                </span>
                <span class="text-slate-500">{{ selectedExercise()!.duration }}</span>
                <span [class]="getDifficultyColor(selectedExercise()!.difficulty)" 
                      class="px-3 py-1 rounded-full text-sm font-medium">
                  {{ selectedExercise()!.difficulty }}
                </span>
              </div>
              
              <h2 class="text-3xl font-bold text-slate-800 mb-4">{{ selectedExercise()!.title }}</h2>
              <p class="text-slate-600 text-lg mb-6">{{ selectedExercise()!.description }}</p>
              
              <!-- Categories -->
              <div class="flex flex-wrap gap-2 mb-6">
                @for (category of selectedExercise()!.category; track category) {
                  <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
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
                    <svg class="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                    <span class="text-green-800 text-sm">{{ benefit }}</span>
                  </div>
                }
              </div>
            </div>

            <!-- Steps -->
            <div class="mb-8">
              <h3 class="text-xl font-semibold text-slate-800 mb-4">Step-by-Step Instructions</h3>
              <div class="space-y-4">
                @for (step of selectedExercise()!.steps; track step.stepNumber) {
                  <div class="flex items-start space-x-4 p-4 bg-slate-50 rounded-lg">
                    <div class="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
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
                        <p class="text-blue-700 text-sm">
                          <strong>Tip:</strong> {{ step.tip }}
                        </p>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Tips -->
            @if (selectedExercise()!.tips.length > 0) {
              <div class="mb-8">
                <h3 class="text-xl font-semibold text-slate-800 mb-4">Helpful Tips</h3>
                <div class="bg-blue-50 rounded-lg p-6">
                  <ul class="space-y-2">
                    @for (tip of selectedExercise()!.tips; track tip) {
                      <li class="flex items-start space-x-3">
                        <svg class="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
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
                <h3 class="text-xl font-semibold text-slate-800 mb-4">When to Use This Exercise</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  @for (usage of selectedExercise()!.whenToUse; track usage) {
                    <div class="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                      <svg class="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                      </svg>
                      <span class="text-purple-800 text-sm">{{ usage }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Contraindications -->
            @if (selectedExercise() && selectedExercise()!.contraindications && selectedExercise()!.contraindications!.length > 0) {
              <div class="mb-8">
                <h3 class="text-xl font-semibold text-slate-800 mb-4">Important Considerations</h3>
                <div class="bg-red-50 border border-red-200 rounded-lg p-6">
                  <ul class="space-y-2">
                    @for (contraindication of selectedExercise()!.contraindications!; track contraindication) {
                      <li class="flex items-start space-x-3">
                        <svg class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
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
              <button 
                (click)="startExercise()"
                class="bg-slate-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-slate-700 transition-colors">
                Start This Exercise
              </button>
              @if (selectedExercise()) {
                <button 
                  (click)="showCompletionDialog(selectedExercise()!)"
                  class="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                  Mark as Completed
                </button>
              }
              <button 
                (click)="goBack()"
                class="bg-slate-200 text-slate-700 px-8 py-3 rounded-lg font-semibold hover:bg-slate-300 transition-colors">
                Browse More Exercises
              </button>
            </div>
          </div>
        }

      </div>
    </section>
  `,
  styles: [`
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
  `]
})
export class ExercisesComponent implements OnInit {
  recommendedExerciseIds = input<string[]>([]);

  exercises: Exercise[] = ALL_EXERCISES;
  filteredExercises = signal<Exercise[]>(ALL_EXERCISES);
  selectedExercise = signal<Exercise | null>(null);

  categories: ExerciseCategory[] = Object.values(ExerciseCategory);
  types: ExerciseType[] = Object.values(ExerciseType);
  quickCategories: ExerciseCategory[] = [
    ExerciseCategory.ANXIETY,
    ExerciseCategory.DEPRESSION,
    ExerciseCategory.STRESS,
    ExerciseCategory.SLEEP
  ];

  searchTerm = '';
  selectedCategory = '';
  selectedType = '';
  private isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private progressService: ProgressService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    // Check for recommended exercises from route params
    this.route.queryParams
      .pipe(takeUntilDestroyed())
      .subscribe((params: any) => {
        if (params['recommended']) {
          const recommendedIds = params['recommended'].split(',');
          this.showRecommendedExercises(recommendedIds);
        }
      });

    // If recommended exercises provided as input, show them
    if (this.recommendedExerciseIds().length > 0) {
      this.showRecommendedExercises(this.recommendedExerciseIds());
    }

    this.filterExercises();
  }

  showRecommendedExercises(exerciseIds: string[]) {
    const recommended = exerciseIds.map(id => getExerciseById(id)).filter(ex => ex !== undefined) as Exercise[];
    if (recommended.length > 0) {
      this.filteredExercises.set(recommended);
    }
  }

  filterExercises() {
    let filtered = this.exercises;

    // Apply search filter
    if (this.searchTerm.trim()) {
      filtered = searchExercises(this.searchTerm);
    }

    // Apply category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(ex => ex.category.includes(this.selectedCategory as ExerciseCategory));
    }

    // Apply type filter
    if (this.selectedType) {
      filtered = filtered.filter(ex => ex.type === this.selectedType);
    }

    this.filteredExercises.set(filtered);
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
    // Could implement timer, guided mode, etc.
    alert('Exercise started! Follow the step-by-step instructions above.');
  }

  completeExercise(exercise: Exercise, duration: number = 10, rating: number = 4, mood: MoodRating = MoodRating.GOOD, notes?: string) {
    // Record exercise completion in progress service
    this.progressService.recordExerciseSession(
      exercise.id,
      exercise.title,
      exercise.type,
      duration,
      rating,
      mood,
      notes
    );

    // Show completion message
    if (this.isBrowser) {
      alert(`Great job completing "${exercise.title}"! Your progress has been recorded.`);
    }
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
        notes || undefined
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