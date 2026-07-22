import { LifestyleTip, LifestyleTipType, LifestyleTipCategory } from '../models/lifestyle-tip.model';
import { SLEEP_TIPS } from './lifestyle-tips/sleep-tips';
import { NUTRITION_TIPS } from './lifestyle-tips/nutrition-tips';
import { SOCIAL_TIPS } from './lifestyle-tips/social-tips';
import { WORK_LIFE_BALANCE_TIPS } from './lifestyle-tips/work-life-balance-tips';
import { BREAKUP_TIPS } from './lifestyle-tips/breakup-tips';

// Combine all lifestyle tips
export const ALL_LIFESTYLE_TIPS: LifestyleTip[] = [
    ...SLEEP_TIPS,
    ...NUTRITION_TIPS,
    ...SOCIAL_TIPS,
    ...WORK_LIFE_BALANCE_TIPS,
    ...BREAKUP_TIPS
];

// Group tips by type for easy filtering
export const LIFESTYLE_TIPS_BY_TYPE = {
    [LifestyleTipType.SLEEP]: SLEEP_TIPS,
    [LifestyleTipType.NUTRITION]: NUTRITION_TIPS,
    [LifestyleTipType.SOCIAL]: SOCIAL_TIPS,
    [LifestyleTipType.WORK_LIFE_BALANCE]: WORK_LIFE_BALANCE_TIPS,
    [LifestyleTipType.EXERCISE]: [], // Can be added later
    [LifestyleTipType.ENVIRONMENT]: [], // Can be added later
    [LifestyleTipType.HABITS]: [], // Can be added later
    [LifestyleTipType.SELF_CARE]: [] // Can be added later
};

// Group tips by category for problem-based browsing
export const LIFESTYLE_TIPS_BY_CATEGORY = {
    [LifestyleTipCategory.DEPRESSION]: ALL_LIFESTYLE_TIPS.filter(tip =>
        tip.category.includes(LifestyleTipCategory.DEPRESSION)
    ),
    [LifestyleTipCategory.ANXIETY]: ALL_LIFESTYLE_TIPS.filter(tip =>
        tip.category.includes(LifestyleTipCategory.ANXIETY)
    ),
    [LifestyleTipCategory.STRESS]: ALL_LIFESTYLE_TIPS.filter(tip =>
        tip.category.includes(LifestyleTipCategory.STRESS)
    ),
    [LifestyleTipCategory.SLEEP]: ALL_LIFESTYLE_TIPS.filter(tip =>
        tip.category.includes(LifestyleTipCategory.SLEEP)
    ),
    [LifestyleTipCategory.BURNOUT]: ALL_LIFESTYLE_TIPS.filter(tip =>
        tip.category.includes(LifestyleTipCategory.BURNOUT)
    ),
    [LifestyleTipCategory.RELATIONSHIP]: ALL_LIFESTYLE_TIPS.filter(tip =>
        tip.category.includes(LifestyleTipCategory.RELATIONSHIP)
    ),
    [LifestyleTipCategory.GENERAL_WELLBEING]: ALL_LIFESTYLE_TIPS.filter(tip =>
        tip.category.includes(LifestyleTipCategory.GENERAL_WELLBEING)
    ),
    [LifestyleTipCategory.BREAKUP]: ALL_LIFESTYLE_TIPS.filter(tip =>
        tip.category.includes(LifestyleTipCategory.BREAKUP)
    )
};

// Helper functions
export function getLifestyleTipById(id: string): LifestyleTip | undefined {
    return ALL_LIFESTYLE_TIPS.find(tip => tip.id === id);
}

export function getLifestyleTipsByIds(ids: string[]): LifestyleTip[] {
    return ids.map(id => getLifestyleTipById(id)).filter(tip => tip !== undefined) as LifestyleTip[];
}

export function getLifestyleTipsByType(type: LifestyleTipType): LifestyleTip[] {
    return LIFESTYLE_TIPS_BY_TYPE[type] || [];
}

export function getLifestyleTipsByCategory(category: LifestyleTipCategory): LifestyleTip[] {
    return LIFESTYLE_TIPS_BY_CATEGORY[category] || [];
}

export function searchLifestyleTips(query: string): LifestyleTip[] {
    const searchTerm = query.toLowerCase();
    return ALL_LIFESTYLE_TIPS.filter(tip =>
        tip.title.toLowerCase().includes(searchTerm) ||
        tip.description.toLowerCase().includes(searchTerm) ||
        tip.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        tip.benefits.some(benefit => benefit.toLowerCase().includes(searchTerm))
    );
}

export function getRelatedLifestyleTips(tipId: string): LifestyleTip[] {
    const tip = getLifestyleTipById(tipId);
    if (!tip || !tip.relatedTips) return [];

    return getLifestyleTipsByIds(tip.relatedTips);
}

// Statistics and metadata
export const LIFESTYLE_TIP_STATS = {
    totalTips: ALL_LIFESTYLE_TIPS.length,
    tipsByType: Object.entries(LIFESTYLE_TIPS_BY_TYPE).map(([type, tips]) => ({
        type,
        count: tips.length
    })),
    tipsByCategory: Object.entries(LIFESTYLE_TIPS_BY_CATEGORY).map(([category, tips]) => ({
        category,
        count: tips.length
    })),
    tipsByDifficulty: {
        easy: ALL_LIFESTYLE_TIPS.filter(tip => tip.difficulty === 'Easy').length,
        moderate: ALL_LIFESTYLE_TIPS.filter(tip => tip.difficulty === 'Moderate').length,
        challenging: ALL_LIFESTYLE_TIPS.filter(tip => tip.difficulty === 'Challenging').length
    }
};