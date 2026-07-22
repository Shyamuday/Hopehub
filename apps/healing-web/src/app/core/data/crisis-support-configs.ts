import { EMERGENCY_CONTACTS } from './crisis-support/emergency-contacts';
import { LOCAL_RESOURCES } from './crisis-support/local-resources';
import { SAFETY_PLAN_TEMPLATE } from './crisis-support/safety-plan-templates';
import { CRISIS_RESOURCES } from './crisis-support/crisis-resources';
import { CrisisType } from '../models/crisis-support.model';

export const CRISIS_SUPPORT_CONFIG = {
    emergencyContacts: EMERGENCY_CONTACTS,
    localResources: LOCAL_RESOURCES,
    safetyPlanTemplate: SAFETY_PLAN_TEMPLATE,
    crisisResources: CRISIS_RESOURCES
};

// Crisis assessment integration
export function getCrisisRecommendations(assessmentId: string, score: number) {
    const recommendations = {
        emergencyContacts: [] as typeof EMERGENCY_CONTACTS,
        localResources: [] as typeof LOCAL_RESOURCES,
        crisisResources: [] as typeof CRISIS_RESOURCES,
        safetyPlanRecommended: false,
        immediateAction: false
    };

    // High-risk scores require immediate action
    if (score >= 15 || assessmentId.includes('phq-9') && score >= 20) {
        recommendations.immediateAction = true;
        recommendations.safetyPlanRecommended = true;
        recommendations.emergencyContacts = EMERGENCY_CONTACTS.filter(c => c.isPrimary);
        recommendations.crisisResources = CRISIS_RESOURCES.filter(r => r.immediateHelp);
    }

    // Moderate risk - provide resources
    if (score >= 10 && score < 15) {
        recommendations.safetyPlanRecommended = true;
        recommendations.localResources = LOCAL_RESOURCES.filter(r =>
            r.crisisTypes.includes(CrisisType.DEPRESSION_CRISIS) ||
            r.crisisTypes.includes(CrisisType.SEVERE_ANXIETY)
        );
    }

    // Assessment-specific recommendations
    switch (assessmentId) {
        case 'phq-9':
            if (score >= 10) {
                recommendations.crisisResources.push(
                    ...CRISIS_RESOURCES.filter(r =>
                        r.crisisTypes.includes(CrisisType.DEPRESSION_CRISIS)
                    )
                );
            }
            break;

        case 'gad-7':
            if (score >= 10) {
                recommendations.crisisResources.push(
                    ...CRISIS_RESOURCES.filter(r =>
                        r.crisisTypes.includes(CrisisType.SEVERE_ANXIETY) ||
                        r.crisisTypes.includes(CrisisType.PANIC_ATTACK)
                    )
                );
            }
            break;

        case 'dass-21':
            if (score >= 21) {
                recommendations.crisisResources.push(
                    ...CRISIS_RESOURCES.filter(r =>
                        r.crisisTypes.includes(CrisisType.DEPRESSION_CRISIS) ||
                        r.crisisTypes.includes(CrisisType.SEVERE_ANXIETY)
                    )
                );
            }
            break;
    }

    return recommendations;
}

export { EMERGENCY_CONTACTS, LOCAL_RESOURCES, SAFETY_PLAN_TEMPLATE, CRISIS_RESOURCES };