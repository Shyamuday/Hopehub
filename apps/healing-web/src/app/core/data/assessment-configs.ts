import { AssessmentConfig, AssessmentType, AssessmentCategory } from '../models/assessment.model';
import { DEPRESSION_ASSESSMENTS } from './assessments/depression-assessments';
import { ANXIETY_ASSESSMENTS } from './assessments/anxiety-assessments';
import { STRESS_ASSESSMENTS } from './assessments/stress-assessments';
import { COMBINED_ASSESSMENTS } from './assessments/combined-assessments';
import { WELLBEING_ASSESSMENTS } from './assessments/wellbeing-assessments';
import { LIFESTYLE_ASSESSMENTS } from './assessments/lifestyle-assessments';
import { BREAKUP_ASSESSMENTS } from './assessments/breakup-assessments';

// Combine all assessments into a single array
export const ASSESSMENT_CONFIGS: AssessmentConfig[] = [
    ...DEPRESSION_ASSESSMENTS,
    ...ANXIETY_ASSESSMENTS,
    ...STRESS_ASSESSMENTS,
    ...COMBINED_ASSESSMENTS,
    ...WELLBEING_ASSESSMENTS,
    ...LIFESTYLE_ASSESSMENTS,
    ...BREAKUP_ASSESSMENTS
];

// Utility functions
export function getAssessmentConfig(assessmentId: string): AssessmentConfig | undefined {
    return ASSESSMENT_CONFIGS.find(config => config.id === assessmentId);
}

export function getAssessmentsByCategory(category: AssessmentCategory): AssessmentConfig[] {
    return ASSESSMENT_CONFIGS.filter(config => config.category === category);
}

export function getAllAssessmentTypes(): AssessmentType[] {
    return Object.values(AssessmentType);
}

// Export individual assessment arrays for specific use cases
export {
    DEPRESSION_ASSESSMENTS,
    ANXIETY_ASSESSMENTS,
    STRESS_ASSESSMENTS,
    COMBINED_ASSESSMENTS,
    WELLBEING_ASSESSMENTS,
    LIFESTYLE_ASSESSMENTS,
    BREAKUP_ASSESSMENTS
};