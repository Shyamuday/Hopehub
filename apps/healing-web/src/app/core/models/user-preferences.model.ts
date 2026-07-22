export interface UserPreferences {
    id: string;
    userId?: string;
    contentPreferences: ContentPreferences;
    dashboardSettings: DashboardSettings;
    reminderSettings: ReminderSettings;
    goalSettings: GoalSettings;
    createdAt: Date;
    updatedAt: Date;
}

export interface ContentPreferences {
    preferredCategories: string[];
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'all';
    contentTypes: {
        assessments: boolean;
        exercises: boolean;
        lifestyleTips: boolean;
        articles: boolean;
    };
    assessmentFrequency: 'daily' | 'weekly' | 'monthly' | 'as-needed';
    hideCompletedContent: boolean;
    showRecommendationsFirst: boolean;
}

export interface DashboardSettings {
    layout: 'grid' | 'list' | 'compact';
    theme: 'light' | 'dark' | 'auto';
    widgets: DashboardWidget[];
    quickAccessItems: string[];
    showProgressCharts: boolean;
    showUpcomingReminders: boolean;
}

export interface DashboardWidget {
    id: string;
    type: 'progress' | 'quick-access' | 'recommendations' | 'reminders' | 'goals' | 'recent-activity';
    position: { row: number; col: number };
    size: 'small' | 'medium' | 'large';
    visible: boolean;
    settings?: Record<string, any>;
}

export interface ReminderSettings {
    enabled: boolean;
    exerciseReminders: {
        enabled: boolean;
        frequency: 'daily' | 'weekly' | 'custom';
        time: string; // HH:MM format
        days: number[]; // 0-6, Sunday = 0
        exercises: string[];
    };
    lifestyleTipReminders: {
        enabled: boolean;
        frequency: 'daily' | 'weekly' | 'monthly';
        time: string;
        tips: string[];
    };
    assessmentReminders: {
        enabled: boolean;
        frequency: 'weekly' | 'monthly' | 'quarterly';
        assessments: string[];
        lastReminded?: Date;
    };
    customReminders: CustomReminder[];
}

export interface CustomReminder {
    id: string;
    title: string;
    description?: string;
    type: 'exercise' | 'lifestyle-tip' | 'assessment' | 'custom';
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    time: string;
    days?: number[];
    enabled: boolean;
    createdAt: Date;
}

export interface GoalSettings {
    activeGoals: PersonalGoal[];
    completedGoals: PersonalGoal[];
    achievementSettings: {
        showBadges: boolean;
        showProgress: boolean;
        celebrateAchievements: boolean;
    };
}

export interface PersonalGoal {
    id: string;
    title: string;
    description: string;
    category: 'mental-health' | 'exercise' | 'lifestyle' | 'learning' | 'custom';
    type: 'assessment-score' | 'exercise-completion' | 'habit-building' | 'milestone' | 'custom';
    targetValue: number;
    currentValue: number;
    unit: string;
    deadline?: Date;
    priority: 'low' | 'medium' | 'high';
    status: 'active' | 'completed' | 'paused' | 'cancelled';
    milestones: GoalMilestone[];
    createdAt: Date;
    updatedAt: Date;
}

export interface GoalMilestone {
    id: string;
    title: string;
    targetValue: number;
    completed: boolean;
    completedAt?: Date;
    reward?: string;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    unlockedAt?: Date;
    progress: number;
    maxProgress: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}