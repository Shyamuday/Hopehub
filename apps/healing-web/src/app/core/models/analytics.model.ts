export interface MoodEntry {
    id: string;
    date: Date;
    mood: number; // 1-10 scale
    energy: number; // 1-10 scale
    anxiety: number; // 1-10 scale
    stress: number; // 1-10 scale
    sleep: number; // 1-10 scale
    notes?: string;
    tags?: string[];
    triggers?: string[];
    activities?: string[];
}

export interface WellnessMetrics {
    date: Date;
    overallWellness: number; // 1-10 calculated score
    assessmentScores: { [assessmentType: string]: number };
    exerciseMinutes: number;
    articlesRead: number;
    lifestyleTipsWorked: number;
    streakDays: number;
}

export interface ProgressVisualization {
    timeframe: 'week' | 'month' | '3months' | '6months' | 'year';
    dataPoints: {
        date: Date;
        value: number;
        label?: string;
    }[];
    trend: 'improving' | 'stable' | 'declining';
    trendPercentage: number;
    insights: string[];
}

export interface PatternInsight {
    id: string;
    type: InsightType;
    title: string;
    description: string;
    confidence: number; // 0-1
    actionable: boolean;
    recommendations: string[];
    dataPoints: any[];
    discoveredAt: Date;
    category: InsightCategory;
    priority: 'low' | 'medium' | 'high';
}

export enum InsightType {
    MOOD_PATTERN = 'mood_pattern',
    ACTIVITY_CORRELATION = 'activity_correlation',
    WEEKLY_TREND = 'weekly_trend',
    SEASONAL_PATTERN = 'seasonal_pattern',
    TRIGGER_IDENTIFICATION = 'trigger_identification',
    IMPROVEMENT_OPPORTUNITY = 'improvement_opportunity',
    SUCCESS_PATTERN = 'success_pattern',
    RISK_INDICATOR = 'risk_indicator'
}

export enum InsightCategory {
    MOOD = 'Mood',
    ACTIVITY = 'Activity',
    SLEEP = 'Sleep',
    STRESS = 'Stress',
    PROGRESS = 'Progress',
    BEHAVIOR = 'Behavior'
}

export interface WellnessDashboard {
    userId: string;
    generatedAt: Date;
    timeframe: {
        start: Date;
        end: Date;
    };

    // Current Status
    currentMood: MoodEntry | null;
    currentStreak: number;
    weeklyProgress: number; // 0-100%

    // Key Metrics
    metrics: {
        averageMood: number;
        moodTrend: 'improving' | 'stable' | 'declining';
        totalExerciseTime: number;
        assessmentsCompleted: number;
        articlesRead: number;
        lifestyleTipsActive: number;
    };

    // Visualizations
    moodChart: ProgressVisualization;
    wellnessChart: ProgressVisualization;
    activityChart: ProgressVisualization;

    // Insights
    insights: PatternInsight[];
    recommendations: DashboardRecommendation[];

    // Achievements
    recentAchievements: Achievement[];
    nextMilestones: Milestone[];
}

export interface DashboardRecommendation {
    id: string;
    title: string;
    description: string;
    type: 'exercise' | 'assessment' | 'lifestyle' | 'article' | 'mood_tracking';
    priority: number;
    actionUrl?: string;
    actionText?: string;
    basedOn: string; // What insight this is based on
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: Date;
    category: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic';
}

export interface Milestone {
    id: string;
    title: string;
    description: string;
    progress: number; // 0-100
    target: number;
    current: number;
    unit: string;
    estimatedCompletion?: Date;
}

export interface MoodAnalytics {
    averageMood: number;
    moodVariability: number;
    bestDay: { day: string; mood: number };
    worstDay: { day: string; mood: number };
    moodByDayOfWeek: { [day: string]: number };
    moodByTimeOfDay: { [hour: string]: number };
    correlations: {
        sleep: number;
        exercise: number;
        stress: number;
        activities: { [activity: string]: number };
    };
    trends: {
        last7Days: number;
        last30Days: number;
        last90Days: number;
    };
}

export interface ActivityCorrelation {
    activity: string;
    moodImpact: number; // -1 to 1
    frequency: number;
    confidence: number;
    recommendation: string;
}

export interface WellnessReport {
    id: string;
    userId: string;
    generatedAt: Date;
    period: {
        start: Date;
        end: Date;
        type: 'weekly' | 'monthly' | 'quarterly';
    };

    summary: {
        overallScore: number;
        improvement: number;
        keyAchievements: string[];
        mainChallenges: string[];
    };

    sections: {
        moodAnalysis: MoodAnalytics;
        activityAnalysis: {
            totalExerciseTime: number;
            favoriteExercises: string[];
            consistencyScore: number;
            recommendations: string[];
        };
        progressAnalysis: {
            assessmentProgress: { [type: string]: number };
            streakAnalysis: {
                longestStreak: number;
                currentStreak: number;
                streakConsistency: number;
            };
            goalProgress: {
                completed: number;
                inProgress: number;
                overdue: number;
            };
        };
        insights: PatternInsight[];
        recommendations: DashboardRecommendation[];
    };
}

export interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        borderColor?: string;
        backgroundColor?: string;
        fill?: boolean;
        tension?: number;
    }[];
}

export interface ChartOptions {
    responsive: boolean;
    maintainAspectRatio: boolean;
    scales?: {
        x?: any;
        y?: any;
    };
    plugins?: {
        legend?: any;
        tooltip?: any;
    };
}