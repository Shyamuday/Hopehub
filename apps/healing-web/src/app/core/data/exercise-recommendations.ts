import { ExerciseRecommendation } from '../models/exercise.model';

export const EXERCISE_RECOMMENDATIONS: ExerciseRecommendation[] = [
    // PHQ-9 Depression Recommendations
    {
        assessmentType: 'phq9',
        scoreRange: { min: 0, max: 4 },
        recommendedExercises: ['gratitude-practice', 'mindful-walking', 'gentle-yoga-flow'],
        priority: 3
    },
    {
        assessmentType: 'phq9',
        scoreRange: { min: 5, max: 9 },
        recommendedExercises: ['gratitude-practice', 'loving-kindness', 'gentle-yoga-flow', 'mindful-breathing'],
        priority: 2
    },
    {
        assessmentType: 'phq9',
        scoreRange: { min: 10, max: 14 },
        recommendedExercises: ['thought-challenging', 'loving-kindness', 'body-scan', 'gentle-yoga-flow'],
        priority: 1
    },
    {
        assessmentType: 'phq9',
        scoreRange: { min: 15, max: 27 },
        recommendedExercises: ['thought-challenging', 'mindful-breathing', 'progressive-muscle-relaxation', 'gratitude-practice'],
        priority: 1
    },

    // GAD-7 Anxiety Recommendations
    {
        assessmentType: 'gad7',
        scoreRange: { min: 0, max: 4 },
        recommendedExercises: ['mindful-breathing', 'belly-breathing', 'mindful-walking'],
        priority: 3
    },
    {
        assessmentType: 'gad7',
        scoreRange: { min: 5, max: 9 },
        recommendedExercises: ['box-breathing', 'progressive-muscle-relaxation', 'body-scan'],
        priority: 2
    },
    {
        assessmentType: 'gad7',
        scoreRange: { min: 10, max: 14 },
        recommendedExercises: ['box-breathing', 'worry-time', 'progressive-muscle-relaxation', 'alternate-nostril'],
        priority: 1
    },
    {
        assessmentType: 'gad7',
        scoreRange: { min: 15, max: 21 },
        recommendedExercises: ['box-breathing', 'worry-time', 'body-scan', 'mindful-breathing'],
        priority: 1
    },

    // PSS-10 Stress Recommendations
    {
        assessmentType: 'pss10',
        scoreRange: { min: 0, max: 13 },
        recommendedExercises: ['mindful-breathing', 'gentle-yoga-flow', 'gratitude-practice'],
        priority: 3
    },
    {
        assessmentType: 'pss10',
        scoreRange: { min: 14, max: 26 },
        recommendedExercises: ['progressive-muscle-relaxation', 'belly-breathing', 'body-scan', 'mindful-walking'],
        priority: 2
    },
    {
        assessmentType: 'pss10',
        scoreRange: { min: 27, max: 40 },
        recommendedExercises: ['box-breathing', 'progressive-muscle-relaxation', 'worry-time', 'body-scan'],
        priority: 1
    },

    // DASS-21 Combined Recommendations
    {
        assessmentType: 'dass21',
        scoreRange: { min: 0, max: 20 },
        recommendedExercises: ['mindful-breathing', 'gratitude-practice', 'gentle-yoga-flow'],
        priority: 3
    },
    {
        assessmentType: 'dass21',
        scoreRange: { min: 21, max: 40 },
        recommendedExercises: ['box-breathing', 'loving-kindness', 'progressive-muscle-relaxation', 'mindful-walking'],
        priority: 2
    },
    {
        assessmentType: 'dass21',
        scoreRange: { min: 41, max: 60 },
        recommendedExercises: ['thought-challenging', 'box-breathing', 'body-scan', 'worry-time'],
        priority: 1
    },
    {
        assessmentType: 'dass21',
        scoreRange: { min: 61, max: 63 },
        recommendedExercises: ['mindful-breathing', 'progressive-muscle-relaxation', 'thought-challenging', 'body-scan'],
        priority: 1
    },

    // WHO-5 Well-being Recommendations
    {
        assessmentType: 'who5',
        scoreRange: { min: 0, max: 12 },
        recommendedExercises: ['gratitude-practice', 'loving-kindness', 'gentle-yoga-flow', 'mindful-walking'],
        priority: 1
    },
    {
        assessmentType: 'who5',
        scoreRange: { min: 13, max: 18 },
        recommendedExercises: ['mindful-breathing', 'gratitude-practice', 'body-scan', 'gentle-yoga-flow'],
        priority: 2
    },
    {
        assessmentType: 'who5',
        scoreRange: { min: 19, max: 25 },
        recommendedExercises: ['mindful-breathing', 'mindful-walking', 'gratitude-practice'],
        priority: 3
    },

    // Burnout Recommendations
    {
        assessmentType: 'burnout',
        scoreRange: { min: 0, max: 18 },
        recommendedExercises: ['mindful-breathing', 'gratitude-practice', 'gentle-yoga-flow'],
        priority: 3
    },
    {
        assessmentType: 'burnout',
        scoreRange: { min: 19, max: 36 },
        recommendedExercises: ['progressive-muscle-relaxation', 'body-scan', 'mindful-walking', 'belly-breathing'],
        priority: 2
    },
    {
        assessmentType: 'burnout',
        scoreRange: { min: 37, max: 54 },
        recommendedExercises: ['box-breathing', 'progressive-muscle-relaxation', 'loving-kindness', 'body-scan'],
        priority: 1
    },
    {
        assessmentType: 'burnout',
        scoreRange: { min: 55, max: 72 },
        recommendedExercises: ['mindful-breathing', 'progressive-muscle-relaxation', 'thought-challenging', 'body-scan'],
        priority: 1
    },

    // Sleep Quality Recommendations
    {
        assessmentType: 'sleep',
        scoreRange: { min: 0, max: 10 },
        recommendedExercises: ['mindful-breathing', 'gentle-yoga-flow', 'gratitude-practice'],
        priority: 3
    },
    {
        assessmentType: 'sleep',
        scoreRange: { min: 11, max: 20 },
        recommendedExercises: ['body-scan', 'progressive-muscle-relaxation', 'box-breathing'],
        priority: 2
    },
    {
        assessmentType: 'sleep',
        scoreRange: { min: 21, max: 30 },
        recommendedExercises: ['body-scan', 'progressive-muscle-relaxation', 'mindful-breathing', 'worry-time'],
        priority: 1
    },
    {
        assessmentType: 'sleep',
        scoreRange: { min: 31, max: 40 },
        recommendedExercises: ['progressive-muscle-relaxation', 'body-scan', 'box-breathing', 'thought-challenging'],
        priority: 1
    },

    // Relationship Recommendations
    {
        assessmentType: 'relationship',
        scoreRange: { min: 0, max: 15 },
        recommendedExercises: ['loving-kindness', 'thought-challenging', 'mindful-breathing', 'gratitude-practice'],
        priority: 1
    },
    {
        assessmentType: 'relationship',
        scoreRange: { min: 16, max: 25 },
        recommendedExercises: ['loving-kindness', 'mindful-breathing', 'gratitude-practice', 'gentle-yoga-flow'],
        priority: 2
    },
    {
        assessmentType: 'relationship',
        scoreRange: { min: 26, max: 35 },
        recommendedExercises: ['gratitude-practice', 'loving-kindness', 'mindful-walking'],
        priority: 2
    },
    {
        assessmentType: 'relationship',
        scoreRange: { min: 36, max: 40 },
        recommendedExercises: ['gratitude-practice', 'mindful-breathing', 'gentle-yoga-flow'],
        priority: 3
    },

    // Breakup Recovery Recommendations
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 0, max: 60 },
        recommendedExercises: ['heartbreak-healing-meditation', 'self-compassion-breakup', 'gratitude-practice', 'mindful-walking'],
        priority: 3
    },
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 61, max: 100 },
        recommendedExercises: ['heartbreak-healing-meditation', 'self-compassion-breakup', 'letting-go-visualization', 'thought-challenging', 'gratitude-practice'],
        priority: 2
    },
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 101, max: 130 },
        recommendedExercises: ['heartbreak-healing-meditation', 'self-compassion-breakup', 'letting-go-visualization', 'mindful-breathing', 'progressive-muscle-relaxation'],
        priority: 1
    },
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 131, max: 160 },
        recommendedExercises: ['heartbreak-healing-meditation', 'self-compassion-breakup', 'mindful-breathing', 'progressive-muscle-relaxation', 'body-scan'],
        priority: 1
    }
];

export function getExerciseRecommendations(assessmentType: string, score: number): string[] {
    const recommendation = EXERCISE_RECOMMENDATIONS.find(rec =>
        rec.assessmentType === assessmentType &&
        score >= rec.scoreRange.min &&
        score <= rec.scoreRange.max
    );

    return recommendation ? recommendation.recommendedExercises : [];
}