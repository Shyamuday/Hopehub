import { ArticleRecommendation } from '../models/article.model';

export const ARTICLE_RECOMMENDATIONS: ArticleRecommendation[] = [
    // PHQ-9 Depression Recommendations
    {
        assessmentType: 'phq9',
        scoreRange: { min: 0, max: 4 },
        recommendedArticles: ['understanding-depression-basics', 'self-care-basics-guide'],
        priority: 3
    },
    {
        assessmentType: 'phq9',
        scoreRange: { min: 5, max: 9 },
        recommendedArticles: ['understanding-depression-basics', 'coping-strategies-depression', 'self-care-basics-guide'],
        priority: 2
    },
    {
        assessmentType: 'phq9',
        scoreRange: { min: 10, max: 14 },
        recommendedArticles: ['coping-strategies-depression', 'understanding-depression-basics', 'building-healthy-boundaries'],
        priority: 1
    },
    {
        assessmentType: 'phq9',
        scoreRange: { min: 15, max: 27 },
        recommendedArticles: ['coping-strategies-depression', 'depression-myths-facts', 'building-healthy-boundaries'],
        priority: 1
    },

    // GAD-7 Anxiety Recommendations
    {
        assessmentType: 'gad7',
        scoreRange: { min: 0, max: 4 },
        recommendedArticles: ['understanding-anxiety-disorders', 'stress-management-techniques'],
        priority: 3
    },
    {
        assessmentType: 'gad7',
        scoreRange: { min: 5, max: 9 },
        recommendedArticles: ['understanding-anxiety-disorders', 'managing-panic-attacks', 'stress-management-techniques'],
        priority: 2
    },
    {
        assessmentType: 'gad7',
        scoreRange: { min: 10, max: 14 },
        recommendedArticles: ['managing-panic-attacks', 'social-anxiety-tips', 'understanding-anxiety-disorders'],
        priority: 1
    },
    {
        assessmentType: 'gad7',
        scoreRange: { min: 15, max: 21 },
        recommendedArticles: ['managing-panic-attacks', 'understanding-anxiety-disorders', 'building-healthy-boundaries'],
        priority: 1
    },

    // PSS-10 Stress Recommendations
    {
        assessmentType: 'pss10',
        scoreRange: { min: 0, max: 13 },
        recommendedArticles: ['understanding-stress-response', 'self-care-basics-guide'],
        priority: 3
    },
    {
        assessmentType: 'pss10',
        scoreRange: { min: 14, max: 26 },
        recommendedArticles: ['stress-management-techniques', 'understanding-stress-response', 'building-healthy-boundaries'],
        priority: 2
    },
    {
        assessmentType: 'pss10',
        scoreRange: { min: 27, max: 40 },
        recommendedArticles: ['stress-management-techniques', 'building-healthy-boundaries', 'self-care-basics-guide'],
        priority: 1
    },

    // DASS-21 Combined Recommendations
    {
        assessmentType: 'dass21',
        scoreRange: { min: 0, max: 20 },
        recommendedArticles: ['self-care-basics-guide', 'understanding-stress-response'],
        priority: 3
    },
    {
        assessmentType: 'dass21',
        scoreRange: { min: 21, max: 40 },
        recommendedArticles: ['stress-management-techniques', 'coping-strategies-depression', 'managing-panic-attacks'],
        priority: 2
    },
    {
        assessmentType: 'dass21',
        scoreRange: { min: 41, max: 60 },
        recommendedArticles: ['coping-strategies-depression', 'managing-panic-attacks', 'building-healthy-boundaries'],
        priority: 1
    },
    {
        assessmentType: 'dass21',
        scoreRange: { min: 61, max: 63 },
        recommendedArticles: ['coping-strategies-depression', 'stress-management-techniques', 'building-healthy-boundaries'],
        priority: 1
    },

    // WHO-5 Well-being Recommendations
    {
        assessmentType: 'who5',
        scoreRange: { min: 0, max: 12 },
        recommendedArticles: ['self-care-basics-guide', 'coping-strategies-depression', 'building-healthy-boundaries'],
        priority: 1
    },
    {
        assessmentType: 'who5',
        scoreRange: { min: 13, max: 18 },
        recommendedArticles: ['self-care-basics-guide', 'stress-management-techniques', 'understanding-depression-basics'],
        priority: 2
    },
    {
        assessmentType: 'who5',
        scoreRange: { min: 19, max: 25 },
        recommendedArticles: ['self-care-basics-guide', 'understanding-stress-response'],
        priority: 3
    },

    // Burnout Recommendations
    {
        assessmentType: 'burnout',
        scoreRange: { min: 0, max: 18 },
        recommendedArticles: ['self-care-basics-guide', 'building-healthy-boundaries'],
        priority: 3
    },
    {
        assessmentType: 'burnout',
        scoreRange: { min: 19, max: 36 },
        recommendedArticles: ['building-healthy-boundaries', 'stress-management-techniques', 'self-care-basics-guide'],
        priority: 2
    },
    {
        assessmentType: 'burnout',
        scoreRange: { min: 37, max: 54 },
        recommendedArticles: ['building-healthy-boundaries', 'stress-management-techniques', 'understanding-stress-response'],
        priority: 1
    },
    {
        assessmentType: 'burnout',
        scoreRange: { min: 55, max: 72 },
        recommendedArticles: ['building-healthy-boundaries', 'stress-management-techniques', 'coping-strategies-depression'],
        priority: 1
    },

    // Sleep Quality Recommendations
    {
        assessmentType: 'sleep',
        scoreRange: { min: 0, max: 10 },
        recommendedArticles: ['self-care-basics-guide', 'understanding-stress-response'],
        priority: 3
    },
    {
        assessmentType: 'sleep',
        scoreRange: { min: 11, max: 20 },
        recommendedArticles: ['stress-management-techniques', 'self-care-basics-guide'],
        priority: 2
    },
    {
        assessmentType: 'sleep',
        scoreRange: { min: 21, max: 30 },
        recommendedArticles: ['stress-management-techniques', 'building-healthy-boundaries', 'understanding-stress-response'],
        priority: 1
    },
    {
        assessmentType: 'sleep',
        scoreRange: { min: 31, max: 40 },
        recommendedArticles: ['building-healthy-boundaries', 'stress-management-techniques', 'coping-strategies-depression'],
        priority: 1
    },

    // Relationship Recommendations
    {
        assessmentType: 'relationship',
        scoreRange: { min: 0, max: 15 },
        recommendedArticles: ['building-healthy-boundaries', 'social-anxiety-tips', 'self-care-basics-guide'],
        priority: 1
    },
    {
        assessmentType: 'relationship',
        scoreRange: { min: 16, max: 25 },
        recommendedArticles: ['building-healthy-boundaries', 'self-care-basics-guide', 'stress-management-techniques'],
        priority: 2
    },
    {
        assessmentType: 'relationship',
        scoreRange: { min: 26, max: 35 },
        recommendedArticles: ['self-care-basics-guide', 'building-healthy-boundaries'],
        priority: 2
    },
    {
        assessmentType: 'relationship',
        scoreRange: { min: 36, max: 40 },
        recommendedArticles: ['self-care-basics-guide', 'understanding-stress-response'],
        priority: 3
    },

    // Breakup Recovery Recommendations
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 0, max: 60 },
        recommendedArticles: ['navigating-breakup-recovery', 'rebuilding-life-after-breakup', 'self-care-basics-guide'],
        priority: 3
    },
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 61, max: 100 },
        recommendedArticles: ['navigating-breakup-recovery', 'understanding-grief-after-breakup', 'rebuilding-life-after-breakup', 'self-care-basics-guide'],
        priority: 2
    },
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 101, max: 130 },
        recommendedArticles: ['navigating-breakup-recovery', 'understanding-grief-after-breakup', 'coping-strategies-depression', 'self-care-basics-guide'],
        priority: 1
    },
    {
        assessmentType: 'breakup-recovery',
        scoreRange: { min: 131, max: 160 },
        recommendedArticles: ['navigating-breakup-recovery', 'understanding-grief-after-breakup', 'coping-strategies-depression', 'understanding-depression-basics'],
        priority: 1
    }
];

export function getArticleRecommendations(assessmentType: string, score: number): string[] {
    const recommendation = ARTICLE_RECOMMENDATIONS.find(rec =>
        rec.assessmentType === assessmentType &&
        score >= rec.scoreRange.min &&
        score <= rec.scoreRange.max
    );

    return recommendation ? recommendation.recommendedArticles : [];
}