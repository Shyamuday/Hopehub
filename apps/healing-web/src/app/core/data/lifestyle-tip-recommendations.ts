import { LifestyleTipRecommendation } from '../models/lifestyle-tip.model';

export const LIFESTYLE_TIP_RECOMMENDATIONS: LifestyleTipRecommendation[] = [
    // PHQ-9 Depression Recommendations
    {
        assessmentType: 'phq9',
        scoreRange: { min: 0, max: 4 },
        recommendedTips: ['mood-boosting-foods', 'meal-timing-energy', 'building-support-network'],
        priority: 3
    },
    {
        assessmentType: 'phq9',
        scoreRange: { min: 5, max: 9 },
        recommendedTips: ['mood-boosting-foods', 'building-support-network', 'sleep-hygiene-basics', 'meal-timing-energy'],
        priority: 2
    },
    {
        assessmentType: 'phq9',
        scoreRange: { min: 10, max: 14 },
        recommendedTips: ['sleep-hygiene-basics', 'mood-boosting-foods', 'building-support-network', 'bedroom-optimization'],
        priority: 1
    },
    {
        assessmentType: 'phq9',
        scoreRange: { min: 15, max: 27 },
        recommendedTips: ['sleep-hygiene-basics', 'building-support-network', 'mood-boosting-foods', 'healthy-boundaries'],
        priority: 1
    },

    // GAD-7 Anxiety Recommendations
    {
        assessmentType: 'gad7',
        scoreRange: { min: 0, max: 4 },
        recommendedTips: ['sleep-hygiene-basics', 'meal-timing-energy', 'digital-boundaries'],
        priority: 3
    },
    {
        assessmentType: 'gad7',
        scoreRange: { min: 5, max: 9 },
        recommendedTips: ['stress-eating-management', 'sleep-hygiene-basics', 'social-anxiety-management'],
        priority: 2
    },
    {
        assessmentType: 'gad7',
        scoreRange: { min: 10, max: 14 },
        recommendedTips: ['natural-sleep-aids', 'stress-eating-management', 'time-management-wellbeing', 'healthy-boundaries'],
        priority: 1
    },
    {
        assessmentType: 'gad7',
        scoreRange: { min: 15, max: 21 },
        recommendedTips: ['bedroom-optimization', 'natural-sleep-aids', 'digital-boundaries', 'social-anxiety-management'],
        priority: 1
    },

    // PSS-10 Stress Recommendations
    {
        assessmentType: 'pss10',
        scoreRange: { min: 0, max: 13 },
        recommendedTips: ['time-management-wellbeing', 'digital-boundaries', 'meal-timing-energy'],
        priority: 3
    },
    {
        assessmentType: 'pss10',
        scoreRange: { min: 14, max: 26 },
        recommendedTips: ['stress-eating-management', 'healthy-boundaries', 'sleep-hygiene-basics', 'digital-boundaries'],
        priority: 2
    },
    {
        assessmentType: 'pss10',
        scoreRange: { min: 27, max: 40 },
        recommendedTips: ['burnout-prevention', 'healthy-boundaries', 'natural-sleep-aids', 'stress-eating-management'],
        priority: 1
    },

    // DASS-21 Combined Recommendations
    {
        assessmentType: 'dass21',
        scoreRange: { min: 0, max: 20 },
        recommendedTips: ['sleep-hygiene-basics', 'mood-boosting-foods', 'building-support-network'],
        priority: 3
    },
    {
        assessmentType: 'dass21',
        scoreRange: { min: 21, max: 40 },
        recommendedTips: ['stress-eating-management', 'digital-boundaries', 'time-management-wellbeing', 'natural-sleep-aids'],
        priority: 2
    },
    {
        assessmentType: 'dass21',
        scoreRange: { min: 41, max: 60 },
        recommendedTips: ['healthy-boundaries', 'burnout-prevention', 'bedroom-optimization', 'building-support-network'],
        priority: 1
    },
    {
        assessmentType: 'dass21',
        scoreRange: { min: 61, max: 63 },
        recommendedTips: ['burnout-prevention', 'natural-sleep-aids', 'healthy-boundaries', 'mood-boosting-foods'],
        priority: 1
    },

    // WHO-5 Well-being Recommendations
    {
        assessmentType: 'who5',
        scoreRange: { min: 0, max: 12 },
        recommendedTips: ['building-support-network', 'mood-boosting-foods', 'sleep-hygiene-basics', 'time-management-wellbeing'],
        priority: 1
    },
    {
        assessmentType: 'who5',
        scoreRange: { min: 13, max: 18 },
        recommendedTips: ['meal-timing-energy', 'digital-boundaries', 'building-support-network', 'sleep-hygiene-basics'],
        priority: 2
    },
    {
        assessmentType: 'who5',
        scoreRange: { min: 19, max: 25 },
        recommendedTips: ['mood-boosting-foods', 'time-management-wellbeing', 'building-support-network'],
        priority: 3
    },

    // Burnout Recommendations
    {
        assessmentType: 'burnout',
        scoreRange: { min: 0, max: 18 },
        recommendedTips: ['digital-boundaries', 'time-management-wellbeing', 'sleep-hygiene-basics'],
        priority: 3
    },
    {
        assessmentType: 'burnout',
        scoreRange: { min: 19, max: 36 },
        recommendedTips: ['burnout-prevention', 'healthy-boundaries', 'stress-eating-management', 'natural-sleep-aids'],
        priority: 2
    },
    {
        assessmentType: 'burnout',
        scoreRange: { min: 37, max: 54 },
        recommendedTips: ['burnout-prevention', 'digital-boundaries', 'healthy-boundaries', 'bedroom-optimization'],
        priority: 1
    },
    {
        assessmentType: 'burnout',
        scoreRange: { min: 55, max: 72 },
        recommendedTips: ['burnout-prevention', 'healthy-boundaries', 'building-support-network', 'natural-sleep-aids'],
        priority: 1
    },

    // Sleep Quality Recommendations
    {
        assessmentType: 'sleep',
        scoreRange: { min: 0, max: 10 },
        recommendedTips: ['sleep-hygiene-basics', 'digital-boundaries', 'meal-timing-energy'],
        priority: 3
    },
    {
        assessmentType: 'sleep',
        scoreRange: { min: 11, max: 20 },
        recommendedTips: ['bedroom-optimization', 'natural-sleep-aids', 'stress-eating-management'],
        priority: 2
    },
    {
        assessmentType: 'sleep',
        scoreRange: { min: 21, max: 30 },
        recommendedTips: ['natural-sleep-aids', 'bedroom-optimization', 'digital-boundaries', 'time-management-wellbeing'],
        priority: 1
    },
    {
        assessmentType: 'sleep',
        scoreRange: { min: 31, max: 40 },
        recommendedTips: ['bedroom-optimization', 'natural-sleep-aids', 'burnout-prevention', 'healthy-boundaries'],
        priority: 1
    },

    // Relationship Recommendations
    {
        assessmentType: 'relationship',
        scoreRange: { min: 0, max: 15 },
        recommendedTips: ['healthy-boundaries', 'building-support-network', 'social-anxiety-management', 'stress-eating-management'],
        priority: 1
    },
    {
        assessmentType: 'relationship',
        scoreRange: { min: 16, max: 25 },
        recommendedTips: ['building-support-network', 'healthy-boundaries', 'digital-boundaries', 'time-management-wellbeing'],
        priority: 2
    },
    {
        assessmentType: 'relationship',
        scoreRange: { min: 26, max: 35 },
        recommendedTips: ['building-support-network', 'time-management-wellbeing', 'mood-boosting-foods'],
        priority: 2
    },
    {
        assessmentType: 'relationship',
        scoreRange: { min: 36, max: 40 },
        recommendedTips: ['building-support-network', 'digital-boundaries', 'sleep-hygiene-basics'],
        priority: 3
    },

    // Breakup Recovery Recommendations
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 0, max: 60 },
        recommendedTips: ['no-contact-rule', 'rebuilding-social-circle', 'social-media-boundaries-breakup', 'building-support-network'],
        priority: 3
    },
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 61, max: 100 },
        recommendedTips: ['no-contact-rule', 'social-media-boundaries-breakup', 'rebuilding-social-circle', 'healthy-boundaries', 'sleep-hygiene-basics'],
        priority: 2
    },
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 101, max: 130 },
        recommendedTips: ['no-contact-rule', 'social-media-boundaries-breakup', 'rebuilding-social-circle', 'building-support-network', 'sleep-hygiene-basics'],
        priority: 1
    },
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 131, max: 160 },
        recommendedTips: ['no-contact-rule', 'social-media-boundaries-breakup', 'building-support-network', 'rebuilding-social-circle', 'sleep-hygiene-basics'],
        priority: 1
    }
];

export function getLifestyleTipRecommendations(assessmentType: string, score: number): string[] {
    const recommendation = LIFESTYLE_TIP_RECOMMENDATIONS.find(rec =>
        rec.assessmentType === assessmentType &&
        score >= rec.scoreRange.min &&
        score <= rec.scoreRange.max
    );

    return recommendation ? recommendation.recommendedTips : [];
}