import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    MoodEntry,
    WellnessMetrics,
    ProgressVisualization,
    PatternInsight,
    WellnessDashboard,
    MoodAnalytics,
    ActivityCorrelation,
    WellnessReport,
    ChartData,
    ChartOptions,
    InsightType,
    InsightCategory,
    DashboardRecommendation,
    Achievement,
    Milestone
} from '../models/analytics.model';
import { ProgressService } from './progress.service';
import { UserProgress } from '../models/progress.model';

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    private readonly MOOD_STORAGE_KEY = 'healing_hub_mood_entries';
    private readonly WELLNESS_STORAGE_KEY = 'healing_hub_wellness_metrics';

    private moodEntriesSubject = new BehaviorSubject<MoodEntry[]>([]);
    private wellnessMetricsSubject = new BehaviorSubject<WellnessMetrics[]>([]);
    private isBrowser: boolean;

    public moodEntries$ = this.moodEntriesSubject.asObservable();
    public wellnessMetrics$ = this.wellnessMetricsSubject.asObservable();

    constructor(
        private progressService: ProgressService,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        this.loadStoredData();
    }

    // Mood Tracking Methods
    addMoodEntry(mood: number, energy: number, anxiety: number, stress: number, sleep: number, notes?: string, tags?: string[], triggers?: string[], activities?: string[]): void {
        const entry: MoodEntry = {
            id: this.generateId(),
            date: new Date(),
            mood,
            energy,
            anxiety,
            stress,
            sleep,
            notes,
            tags,
            triggers,
            activities
        };

        const currentEntries = this.moodEntriesSubject.value;
        const updatedEntries = [...currentEntries, entry];

        this.moodEntriesSubject.next(updatedEntries);
        this.saveMoodEntries(updatedEntries);

        // Update wellness metrics
        this.updateWellnessMetrics();
    }

    getMoodEntries(days?: number): Observable<MoodEntry[]> {
        return this.moodEntries$.pipe(
            map(entries => {
                if (!days) return entries;

                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);

                return entries.filter(entry => entry.date >= cutoffDate);
            })
        );
    }

    // Analytics Methods
    getMoodAnalytics(timeframe: 'week' | 'month' | '3months' | '6months' = 'month'): Observable<MoodAnalytics> {
        return this.getMoodEntries(this.getTimeframeDays(timeframe)).pipe(
            map(entries => this.calculateMoodAnalytics(entries))
        );
    }

    getProgressVisualization(metric: 'mood' | 'wellness' | 'activity', timeframe: 'week' | 'month' | '3months' | '6months' = 'month'): Observable<ProgressVisualization> {
        const days = this.getTimeframeDays(timeframe);

        switch (metric) {
            case 'mood':
                return this.getMoodEntries(days).pipe(
                    map(entries => this.createMoodVisualization(entries, timeframe))
                );
            case 'wellness':
                return this.getWellnessMetrics(days).pipe(
                    map(metrics => this.createWellnessVisualization(metrics, timeframe))
                );
            case 'activity':
                return this.createActivityVisualization(timeframe);
            default:
                return of(this.createEmptyVisualization(timeframe));
        }
    }

    getPatternInsights(): Observable<PatternInsight[]> {
        return this.moodEntries$.pipe(
            map(entries => this.analyzePatterns(entries))
        );
    }

    getWellnessDashboard(): Observable<WellnessDashboard> {
        const userProgress = this.progressService.getCurrentProgress();
        if (!userProgress) {
            return of(this.createEmptyDashboard());
        }

        const currentMood = this.getCurrentMoodEntry();
        const insights = this.analyzePatterns(this.moodEntriesSubject.value);
        const recommendations = this.generateRecommendations(userProgress, insights);

        return of({
            userId: userProgress.userId,
            generatedAt: new Date(),
            timeframe: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
                end: new Date()
            },
            currentMood,
            currentStreak: userProgress.streaks.currentStreak,
            weeklyProgress: this.calculateWeeklyProgress(userProgress),
            metrics: {
                averageMood: this.calculateAverageMood(),
                moodTrend: this.calculateMoodTrend(),
                totalExerciseTime: userProgress.stats.totalExerciseTime,
                assessmentsCompleted: userProgress.stats.totalAssessments,
                articlesRead: userProgress.stats.totalArticlesRead,
                lifestyleTipsActive: userProgress.stats.totalTipsStarted
            },
            moodChart: this.createMoodVisualization(this.moodEntriesSubject.value.slice(-30), 'month'),
            wellnessChart: this.createWellnessVisualization(this.wellnessMetricsSubject.value.slice(-30), 'month'),
            activityChart: this.createActivityVisualizationSync('month'),
            insights,
            recommendations,
            recentAchievements: userProgress.achievements.slice(-3).map(a => ({
                id: a.achievementId,
                title: a.title,
                description: a.description,
                icon: a.icon,
                unlockedAt: a.unlockedAt,
                category: a.category.toString(),
                rarity: a.rarity.toString() as 'common' | 'uncommon' | 'rare' | 'epic'
            })),
            nextMilestones: this.generateMilestones(userProgress)
        });
    }

    generateWellnessReport(period: 'weekly' | 'monthly' | 'quarterly' = 'monthly'): Observable<WellnessReport> {
        const userProgress = this.progressService.getCurrentProgress();
        if (!userProgress) {
            return of({} as WellnessReport);
        }

        const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return this.getMoodEntries(days).pipe(
            map(moodEntries => {
                const moodAnalysis = this.calculateMoodAnalytics(moodEntries);
                const insights = this.analyzePatterns(moodEntries);

                return {
                    id: this.generateId(),
                    userId: userProgress.userId,
                    generatedAt: new Date(),
                    period: {
                        start: startDate,
                        end: new Date(),
                        type: period
                    },
                    summary: {
                        overallScore: this.calculateOverallScore(userProgress, moodAnalysis),
                        improvement: this.calculateImprovement(userProgress),
                        keyAchievements: this.getKeyAchievements(userProgress),
                        mainChallenges: this.identifyMainChallenges(insights)
                    },
                    sections: {
                        moodAnalysis,
                        activityAnalysis: {
                            totalExerciseTime: userProgress.stats.totalExerciseTime,
                            favoriteExercises: this.getFavoriteExercises(userProgress),
                            consistencyScore: this.calculateConsistencyScore(userProgress),
                            recommendations: this.getActivityRecommendations(userProgress)
                        },
                        progressAnalysis: {
                            assessmentProgress: this.getAssessmentProgress(userProgress),
                            streakAnalysis: {
                                longestStreak: userProgress.streaks.longestStreak,
                                currentStreak: userProgress.streaks.currentStreak,
                                streakConsistency: this.calculateStreakConsistency(userProgress)
                            },
                            goalProgress: {
                                completed: userProgress.goals.filter(g => g.status === 'completed').length,
                                inProgress: userProgress.goals.filter(g => g.status === 'active').length,
                                overdue: userProgress.goals.filter(g => g.deadline && g.deadline < new Date() && g.status === 'active').length
                            }
                        },
                        insights,
                        recommendations: this.generateRecommendations(userProgress, insights)
                    }
                };
            })
        );
    }

    // Chart Data Methods
    getMoodChartData(timeframe: 'week' | 'month' | '3months' = 'month'): Observable<ChartData> {
        return this.getMoodEntries(this.getTimeframeDays(timeframe)).pipe(
            map(entries => {
                const sortedEntries = entries.sort((a, b) => a.date.getTime() - b.date.getTime());

                return {
                    labels: sortedEntries.map(entry => entry.date.toLocaleDateString()),
                    datasets: [
                        {
                            label: 'Mood',
                            data: sortedEntries.map(entry => entry.mood),
                            borderColor: '#3B82F6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Energy',
                            data: sortedEntries.map(entry => entry.energy),
                            borderColor: '#10B981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: false,
                            tension: 0.4
                        },
                        {
                            label: 'Stress',
                            data: sortedEntries.map(entry => 10 - entry.stress), // Invert stress for better visualization
                            borderColor: '#F59E0B',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            fill: false,
                            tension: 0.4
                        }
                    ]
                };
            })
        );
    }

    getChartOptions(): ChartOptions {
        return {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Rating (1-10)'
                    },
                    min: 1,
                    max: 10
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        };
    }

    // Private Helper Methods
    private loadStoredData(): void {
        // Check if we're in a browser environment
        if (this.isBrowser && typeof localStorage !== 'undefined') {
            try {
                const storedMood = localStorage.getItem(this.MOOD_STORAGE_KEY);
                if (storedMood) {
                    const moodEntries = JSON.parse(storedMood);
                    this.deserializeDates(moodEntries);
                    this.moodEntriesSubject.next(moodEntries);
                }

                const storedWellness = localStorage.getItem(this.WELLNESS_STORAGE_KEY);
                if (storedWellness) {
                    const wellnessMetrics = JSON.parse(storedWellness);
                    this.deserializeDates(wellnessMetrics);
                    this.wellnessMetricsSubject.next(wellnessMetrics);
                }
            } catch (error) {
                console.error('Error loading analytics data:', error);
            }
        }
    }

    private saveMoodEntries(entries: MoodEntry[]): void {
        if (this.isBrowser && typeof localStorage !== 'undefined') {
            localStorage.setItem(this.MOOD_STORAGE_KEY, JSON.stringify(entries));
        }
    }

    private saveWellnessMetrics(metrics: WellnessMetrics[]): void {
        if (this.isBrowser && typeof localStorage !== 'undefined') {
            localStorage.setItem(this.WELLNESS_STORAGE_KEY, JSON.stringify(metrics));
        }
    }

    private updateWellnessMetrics(): void {
        const userProgress = this.progressService.getCurrentProgress();
        if (!userProgress) return;

        const today = new Date();
        const currentMetrics = this.wellnessMetricsSubject.value;

        // Check if we already have metrics for today
        const todayMetrics = currentMetrics.find(m =>
            m.date.toDateString() === today.toDateString()
        );

        const wellnessScore = this.calculateWellnessScore(userProgress);

        if (todayMetrics) {
            // Update existing metrics
            todayMetrics.overallWellness = wellnessScore;
            todayMetrics.exerciseMinutes = userProgress.stats.totalExerciseTime;
            todayMetrics.articlesRead = userProgress.stats.totalArticlesRead;
            todayMetrics.lifestyleTipsWorked = userProgress.stats.totalTipsStarted;
            todayMetrics.streakDays = userProgress.streaks.currentStreak;
        } else {
            // Create new metrics
            const newMetrics: WellnessMetrics = {
                date: today,
                overallWellness: wellnessScore,
                assessmentScores: this.getLatestAssessmentScores(userProgress),
                exerciseMinutes: userProgress.stats.totalExerciseTime,
                articlesRead: userProgress.stats.totalArticlesRead,
                lifestyleTipsWorked: userProgress.stats.totalTipsStarted,
                streakDays: userProgress.streaks.currentStreak
            };
            currentMetrics.push(newMetrics);
        }

        this.wellnessMetricsSubject.next(currentMetrics);
        this.saveWellnessMetrics(currentMetrics);
    }

    private calculateMoodAnalytics(entries: MoodEntry[]): MoodAnalytics {
        if (entries.length === 0) {
            return {
                averageMood: 5,
                moodVariability: 0,
                bestDay: { day: 'N/A', mood: 0 },
                worstDay: { day: 'N/A', mood: 0 },
                moodByDayOfWeek: {},
                moodByTimeOfDay: {},
                correlations: {
                    sleep: 0,
                    exercise: 0,
                    stress: 0,
                    activities: {}
                },
                trends: {
                    last7Days: 0,
                    last30Days: 0,
                    last90Days: 0
                }
            };
        }

        const moods = entries.map(e => e.mood);
        const averageMood = moods.reduce((sum, mood) => sum + mood, 0) / moods.length;

        // Find best and worst days
        const sortedByMood = [...entries].sort((a, b) => b.mood - a.mood);
        const bestDay = sortedByMood[0];
        const worstDay = sortedByMood[sortedByMood.length - 1];

        // Calculate mood by day of week
        const moodByDayOfWeek: { [day: string]: number } = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        entries.forEach(entry => {
            const dayName = dayNames[entry.date.getDay()];
            if (!moodByDayOfWeek[dayName]) {
                moodByDayOfWeek[dayName] = 0;
            }
            moodByDayOfWeek[dayName] += entry.mood;
        });

        // Average by day count
        Object.keys(moodByDayOfWeek).forEach(day => {
            const dayCount = entries.filter(e => dayNames[e.date.getDay()] === day).length;
            moodByDayOfWeek[day] = moodByDayOfWeek[day] / dayCount;
        });

        return {
            averageMood,
            moodVariability: this.calculateVariability(moods),
            bestDay: { day: bestDay.date.toLocaleDateString(), mood: bestDay.mood },
            worstDay: { day: worstDay.date.toLocaleDateString(), mood: worstDay.mood },
            moodByDayOfWeek,
            moodByTimeOfDay: {},
            correlations: {
                sleep: this.calculateCorrelation(entries.map(e => e.mood), entries.map(e => e.sleep)),
                exercise: 0, // Would need exercise data correlation
                stress: this.calculateCorrelation(entries.map(e => e.mood), entries.map(e => 10 - e.stress)),
                activities: {}
            },
            trends: {
                last7Days: this.calculateTrend(entries.slice(-7).map(e => e.mood)),
                last30Days: this.calculateTrend(entries.slice(-30).map(e => e.mood)),
                last90Days: this.calculateTrend(entries.slice(-90).map(e => e.mood))
            }
        };
    }

    private analyzePatterns(entries: MoodEntry[]): PatternInsight[] {
        const insights: PatternInsight[] = [];

        if (entries.length < 7) {
            return insights;
        }

        // Mood trend analysis
        const recentMoods = entries.slice(-7).map(e => e.mood);
        const trend = this.calculateTrend(recentMoods);

        if (Math.abs(trend) > 0.5) {
            insights.push({
                id: this.generateId(),
                type: InsightType.MOOD_PATTERN,
                title: trend > 0 ? 'Improving Mood Trend' : 'Declining Mood Trend',
                description: `Your mood has been ${trend > 0 ? 'improving' : 'declining'} over the past week.`,
                confidence: Math.min(Math.abs(trend) / 2, 1),
                actionable: true,
                recommendations: trend > 0 ?
                    ['Keep up the great work!', 'Continue your current wellness practices'] :
                    ['Consider talking to a counselor', 'Try some stress-reduction exercises'],
                dataPoints: recentMoods,
                discoveredAt: new Date(),
                category: InsightCategory.MOOD,
                priority: Math.abs(trend) > 1 ? 'high' : 'medium'
            });
        }

        // Sleep correlation
        const sleepCorrelation = this.calculateCorrelation(
            entries.map(e => e.mood),
            entries.map(e => e.sleep)
        );

        if (Math.abs(sleepCorrelation) > 0.6) {
            insights.push({
                id: this.generateId(),
                type: InsightType.ACTIVITY_CORRELATION,
                title: 'Sleep-Mood Connection',
                description: `Your sleep quality has a ${sleepCorrelation > 0 ? 'positive' : 'negative'} correlation with your mood.`,
                confidence: Math.abs(sleepCorrelation),
                actionable: true,
                recommendations: [
                    'Focus on improving sleep hygiene',
                    'Maintain consistent sleep schedule',
                    'Consider sleep-focused lifestyle tips'
                ],
                dataPoints: [sleepCorrelation],
                discoveredAt: new Date(),
                category: InsightCategory.SLEEP,
                priority: 'medium'
            });
        }

        return insights;
    }

    private generateRecommendations(userProgress: UserProgress, insights: PatternInsight[]): DashboardRecommendation[] {
        const recommendations: DashboardRecommendation[] = [];

        // Based on mood trends
        const moodInsight = insights.find(i => i.type === InsightType.MOOD_PATTERN);
        if (moodInsight && moodInsight.title.includes('Declining')) {
            recommendations.push({
                id: this.generateId(),
                title: 'Try Mood-Boosting Exercises',
                description: 'Your mood has been declining. Try some breathing or mindfulness exercises.',
                type: 'exercise',
                priority: 1,
                actionUrl: '/exercises?category=mindfulness',
                actionText: 'Start Exercise',
                basedOn: 'Declining mood pattern'
            });
        }

        // Based on activity levels
        if (userProgress.stats.totalExerciseSessions < 3) {
            recommendations.push({
                id: this.generateId(),
                title: 'Increase Exercise Frequency',
                description: 'Regular exercise can significantly improve mood and reduce stress.',
                type: 'exercise',
                priority: 2,
                actionUrl: '/exercises',
                actionText: 'Browse Exercises',
                basedOn: 'Low exercise activity'
            });
        }

        // Based on assessment history
        if (userProgress.assessmentHistory.length === 0) {
            recommendations.push({
                id: this.generateId(),
                title: 'Take a Mental Health Assessment',
                description: 'Get insights into your mental health with our validated assessments.',
                type: 'assessment',
                priority: 3,
                actionUrl: '/assessments',
                actionText: 'Take Assessment',
                basedOn: 'No assessment history'
            });
        }

        return recommendations.sort((a, b) => a.priority - b.priority);
    }

    private generateMilestones(userProgress: UserProgress): Milestone[] {
        const milestones: Milestone[] = [];

        // Exercise milestone
        const nextExerciseTarget = Math.ceil(userProgress.stats.totalExerciseSessions / 10) * 10;
        if (nextExerciseTarget > userProgress.stats.totalExerciseSessions) {
            milestones.push({
                id: this.generateId(),
                title: `${nextExerciseTarget} Exercise Sessions`,
                description: 'Complete exercise sessions to improve your wellness',
                progress: (userProgress.stats.totalExerciseSessions / nextExerciseTarget) * 100,
                target: nextExerciseTarget,
                current: userProgress.stats.totalExerciseSessions,
                unit: 'sessions'
            });
        }

        // Streak milestone
        const nextStreakTarget = Math.ceil(userProgress.streaks.currentStreak / 7) * 7;
        if (nextStreakTarget > userProgress.streaks.currentStreak) {
            milestones.push({
                id: this.generateId(),
                title: `${nextStreakTarget} Day Streak`,
                description: 'Maintain daily activity to build consistency',
                progress: (userProgress.streaks.currentStreak / nextStreakTarget) * 100,
                target: nextStreakTarget,
                current: userProgress.streaks.currentStreak,
                unit: 'days'
            });
        }

        return milestones;
    }

    // Utility methods
    private getTimeframeDays(timeframe: string): number {
        switch (timeframe) {
            case 'week': return 7;
            case 'month': return 30;
            case '3months': return 90;
            case '6months': return 180;
            default: return 30;
        }
    }

    private calculateVariability(values: number[]): number {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    private calculateCorrelation(x: number[], y: number[]): number {
        if (x.length !== y.length || x.length === 0) return 0;

        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        const sumYY = y.reduce((sum, val) => sum + val * val, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

        return denominator === 0 ? 0 : numerator / denominator;
    }

    private calculateTrend(values: number[]): number {
        if (values.length < 2) return 0;

        const n = values.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const y = values;

        const correlation = this.calculateCorrelation(x, y);
        return correlation * (y[y.length - 1] - y[0]);
    }

    private createMoodVisualization(entries: MoodEntry[], timeframe: string): ProgressVisualization {
        const dataPoints = entries.map(entry => ({
            date: entry.date,
            value: entry.mood,
            label: `Mood: ${entry.mood}/10`
        }));

        const trend = this.calculateTrend(entries.map(e => e.mood));

        return {
            timeframe: timeframe as any,
            dataPoints,
            trend: trend > 0.5 ? 'improving' : trend < -0.5 ? 'declining' : 'stable',
            trendPercentage: Math.abs(trend) * 10,
            insights: [
                `Average mood: ${(entries.reduce((sum, e) => sum + e.mood, 0) / entries.length).toFixed(1)}/10`,
                `Mood ${trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable'} over time`
            ]
        };
    }

    private createWellnessVisualization(metrics: WellnessMetrics[], timeframe: string): ProgressVisualization {
        const dataPoints = metrics.map(metric => ({
            date: metric.date,
            value: metric.overallWellness,
            label: `Wellness: ${metric.overallWellness.toFixed(1)}/10`
        }));

        const trend = this.calculateTrend(metrics.map(m => m.overallWellness));

        return {
            timeframe: timeframe as any,
            dataPoints,
            trend: trend > 0.5 ? 'improving' : trend < -0.5 ? 'declining' : 'stable',
            trendPercentage: Math.abs(trend) * 10,
            insights: [
                `Average wellness: ${(metrics.reduce((sum, m) => sum + m.overallWellness, 0) / metrics.length).toFixed(1)}/10`,
                `Overall wellness ${trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable'}`
            ]
        };
    }

    private createActivityVisualization(timeframe: string): Observable<ProgressVisualization> {
        const userProgress = this.progressService.getCurrentProgress();
        if (!userProgress) {
            return of(this.createEmptyVisualization(timeframe));
        }

        // Create activity data based on recent exercise sessions
        const dataPoints = userProgress.exerciseProgress.slice(-30).map((exercise, index) => ({
            date: exercise.lastCompletedAt,
            value: exercise.totalSessions,
            label: `${exercise.exerciseTitle}: ${exercise.totalSessions} sessions`
        }));

        return of({
            timeframe: timeframe as any,
            dataPoints,
            trend: 'stable',
            trendPercentage: 0,
            insights: [
                `Total exercises: ${userProgress.stats.totalExerciseSessions}`,
                `Total time: ${userProgress.stats.totalExerciseTime} minutes`
            ]
        });
    }

    private createActivityVisualizationSync(timeframe: string): ProgressVisualization {
        const userProgress = this.progressService.getCurrentProgress();
        if (!userProgress) {
            return this.createEmptyVisualization(timeframe);
        }

        // Create activity data based on recent exercise sessions
        const dataPoints = userProgress.exerciseProgress.slice(-30).map((exercise, index) => ({
            date: exercise.lastCompletedAt,
            value: exercise.totalSessions,
            label: `${exercise.exerciseTitle}: ${exercise.totalSessions} sessions`
        }));

        return {
            timeframe: timeframe as any,
            dataPoints,
            trend: 'stable',
            trendPercentage: 0,
            insights: [
                `Total exercises: ${userProgress.stats.totalExerciseSessions}`,
                `Total time: ${userProgress.stats.totalExerciseTime} minutes`
            ]
        };
    }

    private createEmptyVisualization(timeframe: string): ProgressVisualization {
        return {
            timeframe: timeframe as any,
            dataPoints: [],
            trend: 'stable',
            trendPercentage: 0,
            insights: ['No data available yet']
        };
    }

    private createEmptyDashboard(): WellnessDashboard {
        return {
            userId: '',
            generatedAt: new Date(),
            timeframe: { start: new Date(), end: new Date() },
            currentMood: null,
            currentStreak: 0,
            weeklyProgress: 0,
            metrics: {
                averageMood: 5,
                moodTrend: 'stable',
                totalExerciseTime: 0,
                assessmentsCompleted: 0,
                articlesRead: 0,
                lifestyleTipsActive: 0
            },
            moodChart: this.createEmptyVisualization('month'),
            wellnessChart: this.createEmptyVisualization('month'),
            activityChart: this.createEmptyVisualization('month'),
            insights: [],
            recommendations: [],
            recentAchievements: [],
            nextMilestones: []
        };
    }

    private getCurrentMoodEntry(): MoodEntry | null {
        const entries = this.moodEntriesSubject.value;
        if (entries.length === 0) return null;

        return entries.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
    }

    private calculateAverageMood(): number {
        const entries = this.moodEntriesSubject.value;
        if (entries.length === 0) return 5;

        return entries.reduce((sum, entry) => sum + entry.mood, 0) / entries.length;
    }

    private calculateMoodTrend(): 'improving' | 'stable' | 'declining' {
        const entries = this.moodEntriesSubject.value.slice(-14); // Last 2 weeks
        if (entries.length < 7) return 'stable';

        const trend = this.calculateTrend(entries.map(e => e.mood));
        return trend > 0.5 ? 'improving' : trend < -0.5 ? 'declining' : 'stable';
    }

    private calculateWeeklyProgress(userProgress: UserProgress): number {
        // Calculate progress based on goals and activities this week
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        let progress = 0;
        let maxProgress = 100;

        // Add progress for streak
        if (userProgress.streaks.currentStreak > 0) {
            progress += 25;
        }

        // Add progress for recent activities
        if (userProgress.stats.totalExerciseSessions > 0) {
            progress += 25;
        }

        if (userProgress.stats.totalAssessments > 0) {
            progress += 25;
        }

        if (userProgress.stats.totalArticlesRead > 0) {
            progress += 25;
        }

        return Math.min(progress, maxProgress);
    }

    private calculateWellnessScore(userProgress: UserProgress): number {
        let score = 5; // Base score

        // Add points for activities
        if (userProgress.stats.totalExerciseSessions > 0) {
            score += Math.min(userProgress.stats.totalExerciseSessions * 0.1, 2);
        }

        if (userProgress.streaks.currentStreak > 0) {
            score += Math.min(userProgress.streaks.currentStreak * 0.05, 1.5);
        }

        if (userProgress.stats.totalAssessments > 0) {
            score += Math.min(userProgress.stats.totalAssessments * 0.2, 1.5);
        }

        return Math.min(score, 10);
    }

    private getLatestAssessmentScores(userProgress: UserProgress): { [assessmentType: string]: number } {
        const scores: { [assessmentType: string]: number } = {};

        userProgress.assessmentHistory.forEach(assessment => {
            if (!scores[assessment.assessmentType] ||
                assessment.completedAt > new Date(scores[assessment.assessmentType])) {
                scores[assessment.assessmentType] = assessment.score;
            }
        });

        return scores;
    }

    private getWellnessMetrics(days: number): Observable<WellnessMetrics[]> {
        return this.wellnessMetrics$.pipe(
            map(metrics => {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);

                return metrics.filter(metric => metric.date >= cutoffDate);
            })
        );
    }

    private calculateOverallScore(userProgress: UserProgress, moodAnalysis: MoodAnalytics): number {
        return (moodAnalysis.averageMood + this.calculateWellnessScore(userProgress)) / 2;
    }

    private calculateImprovement(userProgress: UserProgress): number {
        return userProgress.stats.assessmentImprovementRate;
    }

    private getKeyAchievements(userProgress: UserProgress): string[] {
        return userProgress.achievements.slice(-3).map(a => a.title);
    }

    private identifyMainChallenges(insights: PatternInsight[]): string[] {
        return insights
            .filter(i => i.priority === 'high' && i.title.includes('Declining'))
            .map(i => i.description);
    }

    private getFavoriteExercises(userProgress: UserProgress): string[] {
        return userProgress.exerciseProgress
            .sort((a, b) => b.totalSessions - a.totalSessions)
            .slice(0, 3)
            .map(e => e.exerciseTitle);
    }

    private calculateConsistencyScore(userProgress: UserProgress): number {
        const totalDays = Math.max(1, (new Date().getTime() - userProgress.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return (userProgress.stats.totalDaysActive / totalDays) * 100;
    }

    private getActivityRecommendations(userProgress: UserProgress): string[] {
        const recommendations = [];

        if (userProgress.stats.totalExerciseSessions < 10) {
            recommendations.push('Try to complete more exercise sessions');
        }

        if (userProgress.streaks.currentStreak < 7) {
            recommendations.push('Focus on building a consistent daily streak');
        }

        return recommendations;
    }

    private getAssessmentProgress(userProgress: UserProgress): { [type: string]: number } {
        const progress: { [type: string]: number } = {};

        userProgress.assessmentHistory.forEach(assessment => {
            if (!progress[assessment.assessmentType]) {
                progress[assessment.assessmentType] = 0;
            }
            progress[assessment.assessmentType]++;
        });

        return progress;
    }

    private calculateStreakConsistency(userProgress: UserProgress): number {
        return (userProgress.streaks.currentStreak / Math.max(1, userProgress.streaks.longestStreak)) * 100;
    }

    private deserializeDates(obj: any): void {
        for (const key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
                if (Array.isArray(obj[key])) {
                    obj[key].forEach((item: any) => this.deserializeDates(item));
                } else if (typeof obj[key] === 'string' && this.isDateString(obj[key])) {
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

    private generateId(): string {
        return Math.random().toString(36).substring(2, 9);
    }
}