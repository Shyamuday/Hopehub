import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
    UserProgress,
    AssessmentProgress,
    ExerciseProgress,
    ExerciseSession,
    LifestyleTipProgress,
    ArticleProgress,
    ProgressStats,
    UserGoal,
    Achievement,
    ProgressDashboard,
    RecentActivity,
    ProgressRecommendation,
    ProgressInsight,
    MoodRating,
    LifestyleTipStatus,
    ReadingStatus,
    GoalType,
    GoalStatus,
    GoalCategory,
    ActivityType,
    RecommendationType,
    InsightType,
    AchievementCategory,
    AchievementRarity,
    StreakMilestone
} from '../models/progress.model';

@Injectable({
    providedIn: 'root'
})
export class ProgressService {
    private readonly STORAGE_KEY = 'healing_hub_progress';
    private userProgressSubject = new BehaviorSubject<UserProgress | null>(null);
    private isBrowser: boolean;
    public userProgress$ = this.userProgressSubject.asObservable();

    constructor(@Inject(PLATFORM_ID) platformId: Object) {
        this.isBrowser = isPlatformBrowser(platformId);
        this.loadProgress();
    }

    // Initialize or load user progress
    private loadProgress(): void {
        // Check if we're in a browser environment
        if (this.isBrowser && typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                try {
                    const progress = JSON.parse(stored);
                    // Convert date strings back to Date objects
                    this.deserializeDates(progress);
                    this.userProgressSubject.next(progress);
                } catch (error) {
                    console.error('Error loading progress:', error);
                    this.initializeProgress();
                }
            } else {
                this.initializeProgress();
            }
        } else {
            // Server-side rendering - initialize with default progress
            this.initializeProgress();
        }
    }

    private initializeProgress(): void {
        const userId = this.generateUserId();
        const initialProgress: UserProgress = {
            userId,
            createdAt: new Date(),
            lastUpdated: new Date(),
            assessmentHistory: [],
            exerciseProgress: [],
            lifestyleTipProgress: [],
            articleProgress: [],
            stats: this.initializeStats(),
            goals: this.createDefaultGoals(),
            streaks: {
                currentStreak: 0,
                longestStreak: 0,
                lastActivityDate: new Date(),
                streakType: 'daily_activity' as any,
                milestones: [
                    { days: 7 },
                    { days: 30 },
                    { days: 100 },
                    { days: 365 }
                ]
            },
            achievements: []
        };

        this.userProgressSubject.next(initialProgress);
        this.saveProgress();
    }

    private initializeStats(): ProgressStats {
        return {
            totalDaysActive: 0,
            currentStreak: 0,
            longestStreak: 0,
            totalAssessments: 0,
            assessmentImprovementRate: 0,
            totalExerciseSessions: 0,
            totalExerciseTime: 0,
            favoriteExerciseType: '',
            averageExerciseRating: 0,
            totalTipsStarted: 0,
            totalTipsCompleted: 0,
            tipCompletionRate: 0,
            totalArticlesRead: 0,
            totalReadingTime: 0,
            favoriteArticleCategory: '',
            averageMoodRating: 3,
            moodTrend: 'stable',
            weeklyStats: {
                weekStarting: new Date(),
                exerciseSessions: 0,
                assessmentsTaken: 0,
                articlesRead: 0,
                tipsWorkedOn: 0,
                averageMood: 3,
                totalTimeSpent: 0
            },
            monthlyStats: {
                month: new Date().getMonth(),
                year: new Date().getFullYear(),
                exerciseSessions: 0,
                assessmentsTaken: 0,
                articlesRead: 0,
                tipsCompleted: 0,
                averageMood: 3,
                totalTimeSpent: 0,
                improvements: []
            }
        };
    }

    private createDefaultGoals(): UserGoal[] {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

        return [
            {
                goalId: this.generateId(),
                title: 'Complete 3 Exercise Sessions',
                description: 'Practice wellness exercises 3 times this week',
                type: GoalType.EXERCISE_SESSIONS,
                targetValue: 3,
                currentValue: 0,
                unit: 'sessions',
                deadline: nextWeek,
                createdAt: now,
                status: GoalStatus.ACTIVE,
                category: GoalCategory.WEEKLY
            },
            {
                goalId: this.generateId(),
                title: 'Read 2 Mental Health Articles',
                description: 'Expand your knowledge with educational content',
                type: GoalType.READING_TIME,
                targetValue: 2,
                currentValue: 0,
                unit: 'articles',
                deadline: nextWeek,
                createdAt: now,
                status: GoalStatus.ACTIVE,
                category: GoalCategory.WEEKLY
            },
            {
                goalId: this.generateId(),
                title: 'Maintain 7-Day Activity Streak',
                description: 'Stay consistent with daily mental health activities',
                type: GoalType.STREAK_DAYS,
                targetValue: 7,
                currentValue: 0,
                unit: 'days',
                deadline: nextMonth,
                createdAt: now,
                status: GoalStatus.ACTIVE,
                category: GoalCategory.MONTHLY
            }
        ];
    }

    // Assessment Progress Methods
    recordAssessmentCompletion(assessmentId: string, assessmentType: string, score: number, level: string): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        const previousAssessment = progress.assessmentHistory
            .filter((a: AssessmentProgress) => a.assessmentType === assessmentType)
            .sort((a: AssessmentProgress, b: AssessmentProgress) => b.completedAt.getTime() - a.completedAt.getTime())[0];

        const assessmentProgress: AssessmentProgress = {
            assessmentId,
            assessmentType,
            completedAt: new Date(),
            score,
            level,
            previousScore: previousAssessment?.score,
            improvement: previousAssessment ? score - previousAssessment.score : 0
        };

        progress.assessmentHistory.push(assessmentProgress);
        progress.stats.totalAssessments++;

        if (assessmentProgress.improvement && assessmentProgress.improvement > 0) {
            progress.stats.assessmentImprovementRate = this.calculateImprovementRate(progress.assessmentHistory);
        }

        this.updateActivity();
        this.checkAchievements();
        this.saveProgress();
    }

    // Exercise Progress Methods
    recordExerciseSession(exerciseId: string, exerciseTitle: string, exerciseType: string, duration: number, rating: number, mood: MoodRating, notes?: string): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        const session: ExerciseSession = {
            sessionId: this.generateId(),
            completedAt: new Date(),
            duration,
            rating,
            notes,
            mood
        };

        let exerciseProgress = progress.exerciseProgress.find((ep: ExerciseProgress) => ep.exerciseId === exerciseId);

        if (!exerciseProgress) {
            exerciseProgress = {
                exerciseId,
                exerciseTitle,
                exerciseType,
                completedSessions: [],
                totalSessions: 0,
                totalDuration: 0,
                averageRating: 0,
                lastCompletedAt: new Date(),
                streak: 0,
                isBookmarked: false
            };
            progress.exerciseProgress.push(exerciseProgress);
        }

        exerciseProgress.completedSessions.push(session);
        exerciseProgress.totalSessions++;
        exerciseProgress.totalDuration += duration;
        exerciseProgress.averageRating = this.calculateAverageRating(exerciseProgress.completedSessions);
        exerciseProgress.lastCompletedAt = new Date();
        exerciseProgress.streak = this.calculateExerciseStreak(exerciseProgress);

        // Update global stats
        progress.stats.totalExerciseSessions++;
        progress.stats.totalExerciseTime += duration;
        progress.stats.averageExerciseRating = this.calculateGlobalExerciseRating(progress.exerciseProgress);
        progress.stats.favoriteExerciseType = this.getFavoriteExerciseType(progress.exerciseProgress);

        this.updateActivity();
        this.updateGoalProgress(GoalType.EXERCISE_SESSIONS, 1);
        this.checkAchievements();
        this.saveProgress();
    }

    // Lifestyle Tip Progress Methods
    startLifestyleTip(tipId: string, tipTitle: string, tipType: string, totalSteps: number): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        const existingTip = progress.lifestyleTipProgress.find((ltp: LifestyleTipProgress) => ltp.tipId === tipId);
        if (existingTip) return; // Already started

        const tipProgress: LifestyleTipProgress = {
            tipId,
            tipTitle,
            tipType,
            status: LifestyleTipStatus.IN_PROGRESS,
            startedAt: new Date(),
            completedSteps: 0,
            totalSteps,
            progressPercentage: 0,
            lastUpdatedAt: new Date(),
            checkIns: [],
            isBookmarked: false
        };

        progress.lifestyleTipProgress.push(tipProgress);
        progress.stats.totalTipsStarted++;

        this.updateActivity();
        this.saveProgress();
    }

    updateLifestyleTipProgress(tipId: string, stepCompleted: number, rating: number, notes?: string, challenges?: string[]): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        const tipProgress = progress.lifestyleTipProgress.find((ltp: LifestyleTipProgress) => ltp.tipId === tipId);
        if (!tipProgress) return;

        const checkIn = {
            checkInId: this.generateId(),
            date: new Date(),
            stepCompleted,
            rating,
            notes,
            challenges
        };

        tipProgress.checkIns.push(checkIn);
        tipProgress.completedSteps = Math.max(tipProgress.completedSteps, stepCompleted);
        tipProgress.progressPercentage = (tipProgress.completedSteps / tipProgress.totalSteps) * 100;
        tipProgress.lastUpdatedAt = new Date();

        if (tipProgress.progressPercentage >= 100) {
            tipProgress.status = LifestyleTipStatus.COMPLETED;
            progress.stats.totalTipsCompleted++;
            progress.stats.tipCompletionRate = (progress.stats.totalTipsCompleted / progress.stats.totalTipsStarted) * 100;
        }

        this.updateActivity();
        this.checkAchievements();
        this.saveProgress();
    }

    // Article Progress Methods
    startReadingArticle(articleId: string, articleTitle: string, articleType: string): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        const existingArticle = progress.articleProgress.find((ap: ArticleProgress) => ap.articleId === articleId);
        if (existingArticle) return;

        const articleProgress: ArticleProgress = {
            articleId,
            articleTitle,
            articleType,
            status: ReadingStatus.IN_PROGRESS,
            startedAt: new Date(),
            readingTime: 0,
            progressPercentage: 0,
            isBookmarked: false
        };

        progress.articleProgress.push(articleProgress);
        this.saveProgress();
    }

    completeArticleReading(articleId: string, readingTime: number, rating?: number, notes?: string, keyTakeaways?: string[]): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        const articleProgress = progress.articleProgress.find((ap: ArticleProgress) => ap.articleId === articleId);
        if (!articleProgress) return;

        articleProgress.status = ReadingStatus.COMPLETED;
        articleProgress.completedAt = new Date();
        articleProgress.readingTime = readingTime;
        articleProgress.progressPercentage = 100;
        articleProgress.rating = rating;
        articleProgress.notes = notes;
        articleProgress.keyTakeaways = keyTakeaways;

        progress.stats.totalArticlesRead++;
        progress.stats.totalReadingTime += readingTime;

        this.updateActivity();
        this.updateGoalProgress(GoalType.READING_TIME, 1);
        this.checkAchievements();
        this.saveProgress();
    }

    // Goal Management
    addGoal(title: string, description: string, type: GoalType, targetValue: number, unit: string, category: GoalCategory, deadline?: Date): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        const goal: UserGoal = {
            goalId: this.generateId(),
            title,
            description,
            type,
            targetValue,
            currentValue: 0,
            unit,
            deadline,
            createdAt: new Date(),
            status: GoalStatus.ACTIVE,
            category
        };

        progress.goals.push(goal);
        this.saveProgress();
    }

    updateGoalProgress(goalType: GoalType, increment: number): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        const activeGoals = progress.goals.filter((g: UserGoal) => g.type === goalType && g.status === GoalStatus.ACTIVE);

        activeGoals.forEach((goal: UserGoal) => {
            goal.currentValue += increment;

            if (goal.currentValue >= goal.targetValue) {
                goal.status = GoalStatus.COMPLETED;
                goal.completedAt = new Date();
                this.unlockAchievement('goal_achiever', 'Goal Achiever', 'Completed your first goal!', AchievementCategory.MILESTONE);
            }
        });

        this.saveProgress();
    }

    // Dashboard Data
    getDashboard(): Observable<ProgressDashboard> {
        const progress = this.userProgressSubject.value;
        if (!progress) {
            return of({} as ProgressDashboard);
        }

        const dashboard: ProgressDashboard = {
            user: progress,
            recentActivity: this.getRecentActivity(progress),
            upcomingGoals: this.getUpcomingGoals(progress),
            recommendations: this.getRecommendations(progress),
            insights: this.getInsights(progress)
        };

        return of(dashboard);
    }

    // Bookmarking
    toggleBookmark(type: 'exercise' | 'tip' | 'article', id: string): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        switch (type) {
            case 'exercise':
                const exercise = progress.exerciseProgress.find((ep: ExerciseProgress) => ep.exerciseId === id);
                if (exercise) exercise.isBookmarked = !exercise.isBookmarked;
                break;
            case 'tip':
                const tip = progress.lifestyleTipProgress.find((ltp: LifestyleTipProgress) => ltp.tipId === id);
                if (tip) tip.isBookmarked = !tip.isBookmarked;
                break;
            case 'article':
                const article = progress.articleProgress.find((ap: ArticleProgress) => ap.articleId === id);
                if (article) article.isBookmarked = !article.isBookmarked;
                break;
        }

        this.saveProgress();
    }

    // Private Helper Methods
    private updateActivity(): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        const today = new Date();
        const lastActivity = new Date(progress.streaks.lastActivityDate);

        // Check if it's a new day
        if (this.isSameDay(today, lastActivity)) {
            return; // Already active today
        }

        // Check if streak continues (yesterday)
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (this.isSameDay(lastActivity, yesterday)) {
            progress.streaks.currentStreak++;
        } else {
            progress.streaks.currentStreak = 1; // Reset streak
        }

        progress.streaks.lastActivityDate = today;
        progress.streaks.longestStreak = Math.max(progress.streaks.longestStreak, progress.streaks.currentStreak);
        progress.stats.currentStreak = progress.streaks.currentStreak;
        progress.stats.longestStreak = progress.streaks.longestStreak;

        // Check streak milestones
        progress.streaks.milestones.forEach((milestone: StreakMilestone) => {
            if (progress.streaks.currentStreak >= milestone.days && !milestone.achievedAt) {
                milestone.achievedAt = new Date();
                this.unlockAchievement(
                    `streak_${milestone.days}`,
                    `${milestone.days} Day Streak`,
                    `Maintained activity for ${milestone.days} consecutive days!`,
                    AchievementCategory.STREAK
                );
            }
        });

        this.updateGoalProgress(GoalType.STREAK_DAYS, 1);
    }

    private checkAchievements(): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        // First assessment
        if (progress.stats.totalAssessments === 1) {
            this.unlockAchievement('first_assessment', 'Self-Aware', 'Completed your first mental health assessment', AchievementCategory.ASSESSMENT);
        }

        // First exercise
        if (progress.stats.totalExerciseSessions === 1) {
            this.unlockAchievement('first_exercise', 'Getting Started', 'Completed your first wellness exercise', AchievementCategory.EXERCISE);
        }

        // Exercise milestones
        if (progress.stats.totalExerciseSessions === 10) {
            this.unlockAchievement('exercise_10', 'Dedicated Practitioner', 'Completed 10 exercise sessions', AchievementCategory.EXERCISE);
        }

        // Reading achievements
        if (progress.stats.totalArticlesRead === 5) {
            this.unlockAchievement('reader_5', 'Knowledge Seeker', 'Read 5 mental health articles', AchievementCategory.READING);
        }
    }

    private unlockAchievement(achievementId: string, title: string, description: string, category: AchievementCategory): void {
        const progress = this.userProgressSubject.value;
        if (!progress) return;

        // Check if already unlocked
        if (progress.achievements.some(a => a.achievementId === achievementId)) {
            return;
        }

        const achievement: Achievement = {
            achievementId,
            title,
            description,
            icon: this.getAchievementIcon(category),
            category,
            unlockedAt: new Date(),
            rarity: AchievementRarity.COMMON
        };

        progress.achievements.push(achievement);
    }

    private getAchievementIcon(category: AchievementCategory): string {
        const icons = {
            [AchievementCategory.ASSESSMENT]: '📊',
            [AchievementCategory.EXERCISE]: '🧘',
            [AchievementCategory.LIFESTYLE]: '🌱',
            [AchievementCategory.READING]: '📚',
            [AchievementCategory.STREAK]: '🔥',
            [AchievementCategory.IMPROVEMENT]: '📈',
            [AchievementCategory.MILESTONE]: '🏆'
        };
        return icons[category] || '⭐';
    }

    private getRecentActivity(progress: UserProgress): RecentActivity[] {
        const activities: RecentActivity[] = [];

        // Recent assessments
        progress.assessmentHistory.slice(-5).forEach(assessment => {
            activities.push({
                activityId: this.generateId(),
                type: ActivityType.ASSESSMENT_COMPLETED,
                title: `${assessment.assessmentType} Assessment`,
                description: `Score: ${assessment.score} (${assessment.level})`,
                completedAt: assessment.completedAt,
                icon: '📊',
                color: 'blue'
            });
        });

        // Recent exercise sessions
        progress.exerciseProgress.forEach(exercise => {
            exercise.completedSessions.slice(-3).forEach(session => {
                activities.push({
                    activityId: this.generateId(),
                    type: ActivityType.EXERCISE_SESSION,
                    title: exercise.exerciseTitle,
                    description: `${session.duration} minutes • ${session.rating}⭐`,
                    completedAt: session.completedAt,
                    icon: '🧘',
                    color: 'purple'
                });
            });
        });

        // Recent achievements
        progress.achievements.slice(-3).forEach(achievement => {
            activities.push({
                activityId: this.generateId(),
                type: ActivityType.ACHIEVEMENT_UNLOCKED,
                title: achievement.title,
                description: achievement.description,
                completedAt: achievement.unlockedAt,
                icon: achievement.icon,
                color: 'gold'
            });
        });

        return activities.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime()).slice(0, 10);
    }

    private getUpcomingGoals(progress: UserProgress): UserGoal[] {
        return progress.goals
            .filter(goal => goal.status === GoalStatus.ACTIVE)
            .sort((a, b) => {
                if (a.deadline && b.deadline) {
                    return a.deadline.getTime() - b.deadline.getTime();
                }
                return 0;
            })
            .slice(0, 5);
    }

    private getRecommendations(progress: UserProgress): ProgressRecommendation[] {
        const recommendations: ProgressRecommendation[] = [];

        // Assessment recommendations
        if (progress.assessmentHistory.length === 0) {
            recommendations.push({
                recommendationId: this.generateId(),
                title: 'Take Your First Assessment',
                description: 'Start your mental health journey with a comprehensive assessment',
                type: RecommendationType.TAKE_ASSESSMENT,
                priority: 1,
                actionUrl: '/assessments',
                actionText: 'Take Assessment'
            });
        }

        // Exercise recommendations
        if (progress.stats.totalExerciseSessions < 3) {
            recommendations.push({
                recommendationId: this.generateId(),
                title: 'Try Breathing Exercises',
                description: 'Start with simple breathing techniques to reduce stress',
                type: RecommendationType.TRY_EXERCISE,
                priority: 2,
                actionUrl: '/exercises?category=breathing',
                actionText: 'Start Exercise'
            });
        }

        return recommendations.sort((a, b) => a.priority - b.priority);
    }

    private getInsights(progress: UserProgress): ProgressInsight[] {
        const insights: ProgressInsight[] = [];

        // Streak insight
        if (progress.streaks.currentStreak > 0) {
            insights.push({
                insightId: this.generateId(),
                title: `${progress.streaks.currentStreak} Day Streak!`,
                description: `You're on a ${progress.streaks.currentStreak} day activity streak. Keep it up!`,
                type: InsightType.STREAK_ANALYSIS,
                data: { streak: progress.streaks.currentStreak },
                trend: 'positive',
                actionable: true,
                actionText: 'Continue Streak',
                actionUrl: '/exercises'
            });
        }

        return insights;
    }

    // Utility methods
    private calculateImprovementRate(assessments: AssessmentProgress[]): number {
        const improvements = assessments.filter((a: AssessmentProgress) => a.improvement && a.improvement > 0);
        return improvements.length > 0 ? (improvements.length / assessments.length) * 100 : 0;
    }

    private calculateAverageRating(sessions: ExerciseSession[]): number {
        if (sessions.length === 0) return 0;
        const sum = sessions.reduce((acc, session) => acc + session.rating, 0);
        return sum / sessions.length;
    }

    private calculateGlobalExerciseRating(exercises: ExerciseProgress[]): number {
        if (exercises.length === 0) return 0;
        const sum = exercises.reduce((acc, exercise) => acc + exercise.averageRating, 0);
        return sum / exercises.length;
    }

    private getFavoriteExerciseType(exercises: ExerciseProgress[]): string {
        const typeCounts: { [key: string]: number } = {};
        exercises.forEach(exercise => {
            typeCounts[exercise.exerciseType] = (typeCounts[exercise.exerciseType] || 0) + exercise.totalSessions;
        });

        let maxCount = 0;
        let favoriteType = '';
        Object.entries(typeCounts).forEach(([type, count]) => {
            if (count > maxCount) {
                maxCount = count;
                favoriteType = type;
            }
        });

        return favoriteType;
    }

    private calculateExerciseStreak(exercise: ExerciseProgress): number {
        // Simple implementation - could be more sophisticated
        const recentSessions = exercise.completedSessions.slice(-7); // Last 7 sessions
        return recentSessions.length;
    }

    private isSameDay(date1: Date, date2: Date): boolean {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    }

    private generateUserId(): string {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9);
    }

    private saveProgress(): void {
        const progress = this.userProgressSubject.value;
        if (progress && this.isBrowser && typeof localStorage !== 'undefined') {
            progress.lastUpdated = new Date();
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
        }
    }

    private deserializeDates(obj: any): void {
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
                if (typeof obj[key] === 'string' && this.isDateString(obj[key])) {
                    obj[key] = new Date(obj[key]);
                } else {
                    this.deserializeDates(obj[key]);
                }
            }
        }
    }

    private isDateString(value: string): boolean {
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
    }

    // Public getters
    getCurrentProgress(): UserProgress | null {
        return this.userProgressSubject.value;
    }

    getStats(): ProgressStats | null {
        return this.userProgressSubject.value?.stats || null;
    }

    getAchievements(): Achievement[] {
        return this.userProgressSubject.value?.achievements || [];
    }

    getActiveGoals(): UserGoal[] {
        return this.userProgressSubject.value?.goals.filter((g: UserGoal) => g.status === GoalStatus.ACTIVE) || [];
    }
}