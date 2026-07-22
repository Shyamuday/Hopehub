import { AssessmentConfig, AssessmentType, AssessmentCategory } from '../../models/assessment.model';

export const STRESS_ASSESSMENTS: AssessmentConfig[] = [
    // Perceived Stress Scale (PSS-10)
    {
        id: 'pss10',
        type: AssessmentType.PSS,
        category: AssessmentCategory.STRESS,
        title: 'Perceived Stress Scale (PSS-10)',
        description: 'A psychological instrument for measuring the perception of stress in your life.',
        instructions: 'The questions in this scale ask you about your feelings and thoughts during the last month. In each case, please indicate how often you felt or thought a certain way.',
        timeframe: 'Past month',
        duration: '3-5 minutes',
        questions: [
            { id: 1, text: 'In the last month, how often have you been upset because of something that happened unexpectedly?', category: 'stress' },
            { id: 2, text: 'In the last month, how often have you felt that you were unable to control the important things in your life?', category: 'control' },
            { id: 3, text: 'In the last month, how often have you felt nervous and stressed?', category: 'stress' },
            { id: 4, text: 'In the last month, how often have you felt confident about your ability to handle your personal problems?', category: 'coping' },
            { id: 5, text: 'In the last month, how often have you felt that things were going your way?', category: 'positive' },
            { id: 6, text: 'In the last month, how often have you found that you could not cope with all the things that you had to do?', category: 'overwhelm' },
            { id: 7, text: 'In the last month, how often have you been able to control irritations in your life?', category: 'control' },
            { id: 8, text: 'In the last month, how often have you felt that you were on top of things?', category: 'mastery' },
            { id: 9, text: 'In the last month, how often have you been angered because of things that were outside of your control?', category: 'stress' },
            { id: 10, text: 'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?', category: 'overwhelm' }
        ],
        responseOptions: [
            { value: 0, label: 'Never' },
            { value: 1, label: 'Almost never' },
            { value: 2, label: 'Sometimes' },
            { value: 3, label: 'Fairly often' },
            { value: 4, label: 'Very often' }
        ],
        scoring: [
            {
                min: 0, max: 13,
                level: 'Low Stress',
                color: 'green',
                description: 'Your stress levels appear to be low and manageable.',
                suggestions: [
                    'Continue current stress management practices',
                    'Maintain work-life balance',
                    'Practice preventive stress management',
                    'Stay physically and socially active'
                ]
            },
            {
                min: 14, max: 26,
                level: 'Moderate Stress',
                color: 'yellow',
                description: 'Your stress levels are moderate and may benefit from attention.',
                suggestions: [
                    'Learn and practice stress reduction techniques',
                    'Improve time management skills',
                    'Set healthy boundaries',
                    'Consider mindfulness or meditation'
                ]
            },
            {
                min: 27, max: 40,
                level: 'High Stress',
                color: 'red',
                description: 'Your stress levels are high and warrant immediate attention.',
                suggestions: [
                    'Seek professional stress management support',
                    'Identify and address major stressors',
                    'Consider counseling or therapy',
                    'Implement immediate stress reduction strategies'
                ]
            }
        ],
        disclaimer: 'The PSS-10 is for educational purposes only. High stress levels may require professional intervention.',
        emergencyHelplines: [
            { name: 'AASRA', number: '91-9820466726' },
            { name: 'Sneha', number: '044-24640050' }
        ],
        references: ['Cohen, S., Kamarck, T., & Mermelstein, R. (1983). A global measure of perceived stress. Journal of Health and Social Behavior, 24, 385-396.']
    }
];