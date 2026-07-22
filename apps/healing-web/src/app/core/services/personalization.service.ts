import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { UserPreferencesService } from './user-preferences.service';
import { ProgressService } from './progress.service';
import { Exercise } from '../models/exercise.model';
import { LifestyleTip } from '../models/lifestyle-tip.model';
import { Article } from '../models/article.model';
import { DailySuggestion } from '../models/progress.model';
import {
    getExerciseRecommendations
} from '../data/exercise-recommendations';
import {
    getLifestyleTipRecommendations
} from '../data/lifestyle-tip-recommendations';
import {
    getArticleRecommendations
} from '../data/article-recommendations';
import { ALL_EXERCISES } from '../data/exercise-configs';
import { ALL_LIFESTYLE_TIPS } from '../data/lifestyle-tip-configs';
import { ALL_ARTICLES } from '../data/article-configs';

export interface PersonalizedContent {
    recommendedExercises: Exercise[];
    recommendedTips: LifestyleTip[];
    recommendedArticles: Article[];
    dailySuggestions: DailySuggestion[];
    personalizedGoals: PersonalizedGoal[];
}

export interface PersonalizedGoal {
    id: string;
    title: string;
    description: string;
    targetValue: number;
    unit: string;
    timeframe: string;
    category: string;
    difficulty: 'easy' | 'moderate' | 'challenging';
}

@Injectable({
    providedIn: 'root'
})
export class PersonalizationService {
    private personalizedContentSubject = new BehaviorSubject<PersonalizedContent | null>(null);
    public personalizedContent$ = this.personalizedContentSubject.asObservable();

    constructor(
        private userPreferencesService: UserPreferencesService,
        private progressService: ProgressService
    ) {
        this.initializePersonalization();
    }

    private initializePersonalization(): void {
        // Combine user preferences and progress to create personalized content
        combineLatest([
            this.progressService.userProgress$
        ]).pipe(
            map(([progress]) => {
                if (!progress) return null;
                return this.generatePersonalizedContent({}, progress);
            })
        ).subscribe(content => {
            this.personalizedContentSubject.next(content);
        });
    }

    private generatePersonalizedContent(preferences: any, progress: any): PersonalizedContent {
        const recentAssessments = progress.assessmentHistory.slice(-3);

        // Get recommendations based on recent assessments
        let recommendedExercises: Exercise[] = [];
        let recommendedTips: LifestyleTip[] = [];
        let recommendedArticles: Article[] = [];

        if (recentAssessments.length > 0) {
            const latestAssessment = recentAssessments[0];

            // Get exercise recommendations
            const exerciseIds = getExerciseRecommendations(latestAssessment.assessmentId, latestAssessment.score);
            recommendedExercises = ALL_EXERCISES.filter(ex => exerciseIds.includes(ex.id));

            // Get lifestyle tip recommendations
            const tipIds = getLifestyleTipRecommendations(latestAssessment.assessmentId, latestAssessment.score);
            recommendedTips = ALL_LIFESTYLE_TIPS.filter(tip => tipIds.includes(tip.id));

            // Get article recommendations
            const articleIds = getArticleRecommendations(latestAssessment.assessmentId, latestAssessment.score);
            recommendedArticles = ALL_ARTICLES.filter(article => articleIds.includes(article.id));
        }

        // Generate daily suggestions
        const dailySuggestions = this.generateDailySuggestions(preferences, progress);

        // Generate personalized goals
        const personalizedGoals = this.generatePersonalizedGoals(preferences, progress);

        return {
            recommendedExercises,
            recommendedTips,
            recommendedArticles,
            dailySuggestions,
            personalizedGoals
        };
    }

    private generateDailySuggestions(preferences: any, progress: any): DailySuggestion[] {
        const suggestions: DailySuggestion[] = [];

        // Check if user hasn't done exercises recently
        const lastExercise = progress.exerciseProgress
            .map((ep: any) => ep.lastCompletedAt)
            .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];

        if (!lastExercise || this.daysSince(lastExercise) > 2) {
            suggestions.push({
                suggestionId: 'daily-exercise',
                type: 'exercise',
                title: 'Quick Breathing Exercise',
                description: 'Start your day with a 5-minute breathing exercise',
                estimatedTime: 5,
                priority: 1,
                reason: 'You haven\'t practiced exercises recently',
                actionUrl: '/exercises?recommended=box-breathing',
                actionText: 'Start Exercise',
                icon: 'breathing'
            });
        }

        // Check streak maintenance
        if (progress.streaks.currentStreak > 0) {
            suggestions.push({
                suggestionId: 'maintain-streak',
                type: 'exercise',
                title: 'Maintain Your Streak',
                description: `Keep your ${progress.streaks.currentStreak}-day streak going!`,
                estimatedTime: 10,
                priority: 2,
                reason: 'Maintain your current streak',
                actionUrl: '/exercises',
                actionText: 'Continue Streak',
                icon: 'streak'
            });
        }

        return suggestions.sort((a, b) => a.priority - b.priority);
    }

    private generatePersonalizedGoals(preferences: any, progress: any): PersonalizedGoal[] {
        const goals: PersonalizedGoal[] = [];

        // Exercise goal based on current activity
        if (progress.stats.totalExerciseSessions < 10) {
            goals.push({
                id: 'exercise-consistency',
                title: 'Build Exercise Habit',
                description: 'Complete 3 exercise sessions this week',
                targetValue: 3,
                unit: 'sessions',
                timeframe: 'weekly',
                category: 'exercise',
                difficulty: 'easy'
            });
        }

        // Reading goal
        if (progress.stats.totalArticlesRead < 5) {
            goals.push({
                id: 'knowledge-building',
                title: 'Expand Mental Health Knowledge',
                description: 'Read 2 educational articles this week',
                targetValue: 2,
                unit: 'articles',
                timeframe: 'weekly',
                category: 'learning',
                difficulty: 'easy'
            });
        }

        return goals;
    }

    // Get personalized recommendations for specific content types
    getPersonalizedExercises(): Observable<Exercise[]> {
        return this.personalizedContent$.pipe(
            map(content => content?.recommendedExercises || [])
        );
    }

    getPersonalizedTips(): Observable<LifestyleTip[]> {
        return this.personalizedContent$.pipe(
            map(content => content?.recommendedTips || [])
        );
    }

    getPersonalizedArticles(): Observable<Article[]> {
        return this.personalizedContent$.pipe(
            map(content => content?.recommendedArticles || [])
        );
    }

    getDailySuggestions(): Observable<DailySuggestion[]> {
        return this.personalizedContent$.pipe(
            map(content => content?.dailySuggestions || [])
        );
    }

    getPersonalizedGoals(): Observable<PersonalizedGoal[]> {
        return this.personalizedContent$.pipe(
            map(content => content?.personalizedGoals || [])
        );
    }

    // Utility methods
    private daysSince(date: Date): number {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Update personalization based on user actions
    updatePersonalization(): void {
        // Trigger recalculation of personalized content
        this.initializePersonalization();
    }
}