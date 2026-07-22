import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProgressService } from '../../../core/services/progress.service';
import { PersonalizationService } from '../../../core/services/personalization.service';
import {
    ProgressDashboard,
    UserProgress,
    RecentActivity,
    UserGoal,
    Achievement,
    ProgressRecommendation,
    DailySuggestion
} from '../../../core/models/progress.model';

@Component({
    selector: 'app-progress-dashboard',
    standalone: true,
    imports: [RouterModule, DatePipe, DecimalPipe, TitleCasePipe],
    templateUrl: './progress-dashboard.component.html',
    styleUrl: './progress-dashboard.component.scss'
})
export class ProgressDashboardComponent implements OnInit {
    private progressService = inject(ProgressService);
    private personalizationService = inject(PersonalizationService);

    // Signal-based state
    userProgress = signal<UserProgress | null>(null);
    recentActivity = signal<RecentActivity[]>([]);
    activeGoals = signal<UserGoal[]>([]);
    recentAchievements = signal<Achievement[]>([]);
    dailySuggestions = signal<DailySuggestion[]>([]);

    constructor() {
        // Subscribe to user progress
        this.progressService.userProgress$
            .pipe(takeUntilDestroyed())
            .subscribe((progress: UserProgress | null) => {
                this.userProgress.set(progress);
                if (progress) {
                    this.activeGoals.set(progress.goals.filter((g: UserGoal) => g.status === 'active'));
                    this.recentAchievements.set(progress.achievements.slice(-3));
                }
            });

        // Subscribe to dashboard data
        this.progressService.getDashboard()
            .pipe(takeUntilDestroyed())
            .subscribe((dashboard: ProgressDashboard) => {
                if (dashboard.recentActivity) {
                    this.recentActivity.set(dashboard.recentActivity);
                }
            });

        // Subscribe to daily suggestions
        this.personalizationService.getDailySuggestions()
            .pipe(takeUntilDestroyed())
            .subscribe((suggestions: DailySuggestion[]) => {
                this.dailySuggestions.set(suggestions);
            });
    }

    ngOnInit(): void {
        // Component initialized
    }

    getSuggestionRoute(suggestion: DailySuggestion): string {
        switch (suggestion.type) {
            case 'exercise':
                return '/exercises';
            case 'lifestyle-tip':
                return '/lifestyle-tips';
            case 'article':
                return '/articles';
            case 'assessment':
                return '/assessments';
            default:
                return '/';
        }
    }
}
