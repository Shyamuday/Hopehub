export interface UserProgress {
    userId: string;
    createdAt: Date;
    lastUpdated: Date;

    // Assessment History
    assessmentHistory: AssessmentProgress[];

    // Exercise Progress
    exerciseProgress: ExerciseProgress[];

    // Lifestyle Tips Progress
    lifestyleTipProgress: LifestyleTipProgress[];

    // Article Reading Progress
    articleProgress: ArticleProgress[];

    // Overall Statistics
    stats: ProgressStats;

    // Goals and Milestones
    goals: UserGoal[];

    // Streaks and Achievements
    streaks: StreakData;
    achievements: Achievement[];
}

export interface AssessmentProgress {
    assessmentId: string;
    assessmentType: string;
    completedAt: Date;
    score: number;
    level: string;
    previousScore?: number;
    improvement?: number;
    notes?: string;
}

export interface ExerciseProgress {
    exerciseId: string;
    exerciseTitle: string;
    exerciseType: string;
    completedSessions: ExerciseSession[];
    totalSessions: number;
    totalDuration: number; // in minutes
    averageRating: number;
    lastCompletedAt: Date;
    streak: number;
    isBookmarked: boolean;
}

export interface ExerciseSession {
    sessionId: string;
    completedAt: Date;
    duration: number; // in minutes
    rating: number; // 1-5 stars
    notes?: string;
    mood: MoodRating;
}

export interface LifestyleTipProgress {
    tipId: string;
    tipTitle: string;
    tipType: string;
    status: LifestyleTipStatus;
    startedAt: Date;
    completedSteps: number;
    totalSteps: number;
    progressPercentage: number;
    lastUpdatedAt: Date;
    checkIns: TipCheckIn[];
    isBookmarked: boolean;
}

export interface TipCheckIn {
    checkInId: string;
    date: Date;
    stepCompleted?: number;
    rating: number; // 1-5 how helpful
    notes?: string;
    challenges?: string[];
}

export interface ArticleProgress {
    articleId: string;
    articleTitle: string;
    articleType: string;
    status: ReadingStatus;
    startedAt: Date;
    completedAt?: Date;
    readingTime: number; // in minutes
    progressPercentage: number;
    rating?: number; // 1-5 stars
    notes?: string;
    isBookmarked: boolean;
    keyTakeaways?: string[];
}

export interface ProgressStats {
    // Overall
    totalDaysActive: number;
    currentStreak: number;
    longestStreak: number;

    // Assessments
    totalAssessments: number;
    assessmentImprovementRate: number;

    // Exercises
    totalExerciseSessions: number;
    totalExerciseTime: number; // in minutes
    favoriteExerciseType: string;
    averageExerciseRating: number;

    // Lifestyle Tips
    totalTipsStarted: number;
    totalTipsCompleted: number;
    tipCompletionRate: number;

    // Articles
    totalArticlesRead: number;
    totalReadingTime: number; // in minutes
    favoriteArticleCategory: string;

    // Mood Tracking
    averageMoodRating: number;
    moodTrend: 'improving' | 'stable' | 'declining';

    // Weekly/Monthly summaries
    weeklyStats: WeeklyStats;
    monthlyStats: MonthlyStats;
}

export interface WeeklyStats {
    weekStarting: Date;
    exerciseSessions: number;
    assessmentsTaken: number;
    articlesRead: number;
    tipsWorkedOn: number;
    averageMood: number;
    totalTimeSpent: number; // in minutes
}

export interface MonthlyStats {
    month: number;
    year: number;
    exerciseSessions: number;
    assessmentsTaken: number;
    articlesRead: number;
    tipsCompleted: number;
    averageMood: number;
    totalTimeSpent: number; // in minutes
    improvements: string[];
}

export interface UserGoal {
    goalId: string;
    title: string;
    description: string;
    type: GoalType;
    targetValue: number;
    currentValue: number;
    unit: string;
    deadline?: Date;
    createdAt: Date;
    completedAt?: Date;
    status: GoalStatus;
    category: GoalCategory;
}

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date;
    streakType: StreakType;
    milestones: StreakMilestone[];
}

export interface StreakMilestone {
    days: number;
    achievedAt?: Date;
    reward?: string;
}

export interface Achievement {
    achievementId: string;
    title: string;
    description: string;
    icon: string;
    category: AchievementCategory;
    unlockedAt: Date;
    rarity: AchievementRarity;
    progress?: number;
    maxProgress?: number;
}

// Enums
export enum LifestyleTipStatus {
    NOT_STARTED = 'not_started',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    PAUSED = 'paused'
}

export enum ReadingStatus {
    NOT_STARTED = 'not_started',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    BOOKMARKED = 'bookmarked'
}

export enum MoodRating {
    VERY_LOW = 1,
    LOW = 2,
    NEUTRAL = 3,
    GOOD = 4,
    EXCELLENT = 5
}

export enum GoalType {
    EXERCISE_SESSIONS = 'exercise_sessions',
    ASSESSMENT_IMPROVEMENT = 'assessment_improvement',
    LIFESTYLE_TIPS = 'lifestyle_tips',
    READING_TIME = 'reading_time',
    STREAK_DAYS = 'streak_days',
    MOOD_IMPROVEMENT = 'mood_improvement'
}

export enum GoalStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed',
    PAUSED = 'paused',
    EXPIRED = 'expired'
}

export enum GoalCategory {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    LONG_TERM = 'long_term'
}

export enum StreakType {
    DAILY_ACTIVITY = 'daily_activity',
    EXERCISE = 'exercise',
    ASSESSMENT = 'assessment',
    READING = 'reading'
}

export enum AchievementCategory {
    ASSESSMENT = 'assessment',
    EXERCISE = 'exercise',
    LIFESTYLE = 'lifestyle',
    READING = 'reading',
    STREAK = 'streak',
    IMPROVEMENT = 'improvement',
    MILESTONE = 'milestone'
}

export enum AchievementRarity {
    COMMON = 'common',
    UNCOMMON = 'uncommon',
    RARE = 'rare',
    EPIC = 'epic',
    LEGENDARY = 'legendary'
}

// Dashboard Data Interfaces
export interface ProgressDashboard {
    user: UserProgress;
    recentActivity: RecentActivity[];
    upcomingGoals: UserGoal[];
    recommendations: ProgressRecommendation[];
    insights: ProgressInsight[];
}

export interface RecentActivity {
    activityId: string;
    type: ActivityType;
    title: string;
    description: string;
    completedAt: Date;
    icon: string;
    color: string;
}

export enum ActivityType {
    ASSESSMENT_COMPLETED = 'assessment_completed',
    EXERCISE_SESSION = 'exercise_session',
    TIP_PROGRESS = 'tip_progress',
    ARTICLE_READ = 'article_read',
    GOAL_ACHIEVED = 'goal_achieved',
    STREAK_MILESTONE = 'streak_milestone',
    ACHIEVEMENT_UNLOCKED = 'achievement_unlocked'
}

export interface ProgressRecommendation {
    recommendationId: string;
    title: string;
    description: string;
    type: RecommendationType;
    priority: number;
    actionUrl: string;
    actionText: string;
}

export enum RecommendationType {
    TAKE_ASSESSMENT = 'take_assessment',
    TRY_EXERCISE = 'try_exercise',
    READ_ARTICLE = 'read_article',
    WORK_ON_TIP = 'work_on_tip',
    SET_GOAL = 'set_goal',
    MAINTAIN_STREAK = 'maintain_streak'
}

export interface ProgressInsight {
    insightId: string;
    title: string;
    description: string;
    type: InsightType;
    data: any;
    trend: 'positive' | 'neutral' | 'negative';
    actionable: boolean;
    actionText?: string;
    actionUrl?: string;
}

export interface DailySuggestion {
    suggestionId: string;
    title: string;
    description: string;
    type: 'exercise' | 'assessment' | 'article' | 'lifestyle-tip';
    priority: number;
    estimatedTime: number; // in minutes
    actionUrl: string;
    actionText: string;
    reason: string;
    icon: string;
}

export enum InsightType {
    MOOD_TREND = 'mood_trend',
    EXERCISE_PATTERN = 'exercise_pattern',
    ASSESSMENT_IMPROVEMENT = 'assessment_improvement',
    GOAL_PROGRESS = 'goal_progress',
    STREAK_ANALYSIS = 'streak_analysis',
    USAGE_PATTERN = 'usage_pattern'
}