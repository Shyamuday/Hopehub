export enum LifestyleTipType {
    SLEEP = 'Sleep',
    NUTRITION = 'Nutrition',
    EXERCISE = 'Exercise',
    SOCIAL = 'Social',
    WORK_LIFE_BALANCE = 'Work-Life Balance',
    ENVIRONMENT = 'Environment',
    HABITS = 'Habits',
    SELF_CARE = 'Self-Care'
}

export enum LifestyleTipCategory {
    DEPRESSION = 'Depression',
    ANXIETY = 'Anxiety',
    STRESS = 'Stress',
    SLEEP = 'Sleep',
    BURNOUT = 'Burnout',
    RELATIONSHIP = 'Relationship',
    BREAKUP = 'Breakup Recovery',
    GENERAL_WELLBEING = 'General Well-being'
}

export enum LifestyleTipDifficulty {
    EASY = 'Easy',
    MODERATE = 'Moderate',
    CHALLENGING = 'Challenging'
}

export interface LifestyleTipStep {
    stepNumber: number;
    action: string;
    timeframe?: string;
    tip?: string;
}

export interface LifestyleTip {
    id: string;
    title: string;
    description: string;
    type: LifestyleTipType;
    category: LifestyleTipCategory[];
    difficulty: LifestyleTipDifficulty;
    timeToImplement: string;
    benefits: string[];
    steps: LifestyleTipStep[];
    tips: string[];
    scientificBasis?: string;
    commonMistakes?: string[];
    progressTracking?: string[];
    relatedTips?: string[]; // IDs of related tips
    tags: string[];
}

export interface LifestyleTipRecommendation {
    assessmentType: string;
    scoreRange: { min: number; max: number };
    recommendedTips: string[]; // Lifestyle tip IDs
    priority: number; // 1 = highest priority
}

export interface PersonalizedLifestylePlan {
    userId?: string;
    assessmentResults: {
        assessmentId: string;
        score: number;
        level: string;
    }[];
    recommendedTips: LifestyleTip[];
    dailyHabits: LifestyleTip[];
    weeklyGoals: string[];
    monthlyTargets: string[];
    createdAt: Date;
}