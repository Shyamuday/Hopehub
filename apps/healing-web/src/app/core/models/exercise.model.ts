export enum ExerciseType {
    BREATHING = 'Breathing',
    MINDFULNESS = 'Mindfulness',
    PHYSICAL = 'Physical',
    COGNITIVE = 'Cognitive',
    RELAXATION = 'Relaxation',
    GROUNDING = 'Grounding',
    JOURNALING = 'Journaling',
    VISUALIZATION = 'Visualization'
}

export enum ExerciseCategory {
    DEPRESSION = 'Depression',
    ANXIETY = 'Anxiety',
    STRESS = 'Stress',
    SLEEP = 'Sleep',
    BURNOUT = 'Burnout',
    RELATIONSHIP = 'Relationship',
    BREAKUP = 'Breakup Recovery',
    GENERAL_WELLBEING = 'General Well-being'
}

export enum ExerciseDifficulty {
    BEGINNER = 'Beginner',
    INTERMEDIATE = 'Intermediate',
    ADVANCED = 'Advanced'
}

export interface ExerciseStep {
    stepNumber: number;
    instruction: string;
    duration?: string;
    tip?: string;
}

export interface Exercise {
    id: string;
    title: string;
    description: string;
    type: ExerciseType;
    category: ExerciseCategory[];
    difficulty: ExerciseDifficulty;
    duration: string;
    benefits: string[];
    steps: ExerciseStep[];
    tips: string[];
    whenToUse: string[];
    contraindications?: string[];
    videoUrl?: string;
    audioUrl?: string;
    tags: string[];
}

export interface ExerciseRecommendation {
    assessmentType: string;
    scoreRange: { min: number; max: number };
    recommendedExercises: string[]; // Exercise IDs
    priority: number; // 1 = highest priority
}

export interface PersonalizedExercisePlan {
    userId?: string;
    assessmentResults: {
        assessmentId: string;
        score: number;
        level: string;
    }[];
    recommendedExercises: Exercise[];
    dailyRoutine: Exercise[];
    weeklyGoals: string[];
    createdAt: Date;
}