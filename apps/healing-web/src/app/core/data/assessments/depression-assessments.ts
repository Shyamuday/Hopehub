import { AssessmentConfig, AssessmentType, AssessmentCategory } from '../../models/assessment.model';

export const DEPRESSION_ASSESSMENTS: AssessmentConfig[] = [
    // PHQ-9 Depression Assessment
    {
        id: 'phq9',
        type: AssessmentType.PHQ9,
        category: AssessmentCategory.DEPRESSION,
        title: 'PHQ-9 Depression Assessment',
        description: 'A widely used clinical tool to assess depression severity over the past two weeks.',
        instructions: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
        timeframe: 'Past 2 weeks',
        duration: '3-5 minutes',
        questions: [
            { id: 1, text: 'Little interest or pleasure in doing things', category: 'mood' },
            { id: 2, text: 'Feeling down, depressed, or hopeless', category: 'mood' },
            { id: 3, text: 'Trouble falling or staying asleep, or sleeping too much', category: 'sleep' },
            { id: 4, text: 'Feeling tired or having little energy', category: 'energy' },
            { id: 5, text: 'Poor appetite or overeating', category: 'appetite' },
            { id: 6, text: 'Feeling bad about yourself or that you are a failure or have let yourself or your family down', category: 'self-worth' },
            { id: 7, text: 'Trouble concentrating on things, such as reading the newspaper or watching television', category: 'concentration' },
            { id: 8, text: 'Moving or speaking so slowly that other people could have noticed, or the opposite - being so fidgety or restless that you have been moving around a lot more than usual', category: 'psychomotor' },
            { id: 9, text: 'Thoughts that you would be better off dead, or of hurting yourself', category: 'safety' }
        ],
        responseOptions: [
            { value: 0, label: 'Not at all' },
            { value: 1, label: 'Several days' },
            { value: 2, label: 'More than half the days' },
            { value: 3, label: 'Nearly every day' }
        ],
        scoring: [
            {
                min: 0, max: 4,
                level: 'Minimal Depression',
                color: 'green',
                description: 'Your responses suggest minimal or no depression symptoms.',
                suggestions: [
                    'Continue maintaining healthy lifestyle habits',
                    'Practice regular self-care and stress management',
                    'Stay connected with supportive relationships',
                    'Consider preventive mental health practices like mindfulness'
                ]
            },
            {
                min: 5, max: 9,
                level: 'Mild Depression',
                color: 'yellow',
                description: 'Your responses suggest mild depression symptoms that may benefit from attention.',
                suggestions: [
                    'Consider talking to a mental health professional',
                    'Engage in regular physical activity',
                    'Maintain a consistent sleep schedule',
                    'Practice stress reduction techniques',
                    'Stay socially connected'
                ]
            },
            {
                min: 10, max: 14,
                level: 'Moderate Depression',
                color: 'orange',
                description: 'Your responses suggest moderate depression symptoms that warrant professional attention.',
                suggestions: [
                    'Strongly consider professional counseling or therapy',
                    'Consult with your healthcare provider',
                    'Establish a daily routine and structure',
                    'Engage in activities you previously enjoyed',
                    'Consider joining a support group'
                ]
            },
            {
                min: 15, max: 19,
                level: 'Moderately Severe Depression',
                color: 'red',
                description: 'Your responses suggest moderately severe depression that requires professional treatment.',
                suggestions: [
                    'Seek professional mental health treatment immediately',
                    'Consider both therapy and medication evaluation',
                    'Inform trusted family members or friends',
                    'Create a safety plan with professional help',
                    'Consider intensive outpatient treatment'
                ]
            },
            {
                min: 20, max: 27,
                level: 'Severe Depression',
                color: 'red',
                description: 'Your responses suggest severe depression requiring immediate professional intervention.',
                suggestions: [
                    'Seek immediate professional help',
                    'Contact emergency services if feeling unsafe',
                    'Consider inpatient or intensive treatment options',
                    'Ensure you have 24/7 support available',
                    'Do not delay seeking professional care'
                ]
            }
        ],
        safetyQuestionIndex: 8,
        disclaimer: 'This PHQ-9 assessment is for educational purposes only and does not constitute a medical diagnosis. If you are experiencing thoughts of self-harm or suicide, please seek immediate professional help.',
        emergencyHelplines: [
            { name: 'AASRA', number: '91-9820466726' },
            { name: 'Sneha', number: '044-24640050' },
            { name: 'Emergency', number: '112' }
        ],
        references: ['Kroenke, K., Spitzer, R. L., & Williams, J. B. (2001). The PHQ‐9. Journal of general internal medicine, 16(9), 606-613.']
    },

    // PHQ-2 Quick Depression Screening
    {
        id: 'phq2',
        type: AssessmentType.PHQ2,
        category: AssessmentCategory.DEPRESSION,
        title: 'PHQ-2 Quick Depression Screening',
        description: 'A brief screening tool for depression using the first two questions of the PHQ-9.',
        instructions: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
        timeframe: 'Past 2 weeks',
        duration: '1 minute',
        questions: [
            { id: 1, text: 'Little interest or pleasure in doing things', category: 'mood' },
            { id: 2, text: 'Feeling down, depressed, or hopeless', category: 'mood' }
        ],
        responseOptions: [
            { value: 0, label: 'Not at all' },
            { value: 1, label: 'Several days' },
            { value: 2, label: 'More than half the days' },
            { value: 3, label: 'Nearly every day' }
        ],
        scoring: [
            {
                min: 0, max: 2,
                level: 'Low Risk for Depression',
                color: 'green',
                description: 'Your responses suggest a low likelihood of depression.',
                suggestions: [
                    'Continue maintaining good mental health practices',
                    'Stay connected with supportive relationships',
                    'Practice regular self-care'
                ]
            },
            {
                min: 3, max: 6,
                level: 'Possible Depression - Further Assessment Recommended',
                color: 'orange',
                description: 'Your responses suggest possible depression. Consider a more comprehensive assessment.',
                suggestions: [
                    'Consider taking a full PHQ-9 assessment',
                    'Consult with a mental health professional',
                    'Monitor your symptoms over time',
                    'Reach out for support if symptoms persist'
                ]
            }
        ],
        disclaimer: 'This PHQ-2 is a brief screening tool. A positive result suggests the need for further evaluation with a complete assessment.',
        emergencyHelplines: [
            { name: 'AASRA', number: '91-9820466726' },
            { name: 'Sneha', number: '044-24640050' }
        ]
    },

    // Beck Depression Inventory (BDI-II)
    {
        id: 'bdi',
        type: AssessmentType.BDI,
        category: AssessmentCategory.DEPRESSION,
        title: 'Beck Depression Inventory (BDI-II)',
        description: 'A widely used assessment for measuring the severity of depression symptoms.',
        instructions: 'This questionnaire consists of statements about how you have been feeling. Please read each group of statements carefully and select the one that best describes the way you have been feeling during the past two weeks.',
        timeframe: 'Past 2 weeks',
        duration: '5-10 minutes',
        questions: [
            { id: 1, text: 'How would you rate your overall sadness level?', category: 'mood' },
            { id: 2, text: 'How pessimistic do you feel about the future?', category: 'outlook' },
            { id: 3, text: 'How much do you feel like a failure?', category: 'self-perception' },
            { id: 4, text: 'How much pleasure do you get from activities you used to enjoy?', category: 'anhedonia' },
            { id: 5, text: 'How guilty do you feel?', category: 'emotions' },
            { id: 6, text: 'Do you feel you are being punished?', category: 'emotions' },
            { id: 7, text: 'How much do you dislike yourself?', category: 'self-perception' },
            { id: 8, text: 'How critical are you of yourself?', category: 'self-perception' },
            { id: 9, text: 'Do you have thoughts of killing yourself?', category: 'safety' },
            { id: 10, text: 'How much do you cry?', category: 'behavior' },
            { id: 11, text: 'How agitated or restless do you feel?', category: 'behavior' },
            { id: 12, text: 'How much interest do you have in other people or activities?', category: 'motivation' },
            { id: 13, text: 'How difficult is it for you to make decisions?', category: 'cognition' },
            { id: 14, text: 'How worthless do you feel?', category: 'self-perception' },
            { id: 15, text: 'How much energy do you have?', category: 'physical' },
            { id: 16, text: 'How much have your sleeping patterns changed?', category: 'physical' },
            { id: 17, text: 'How irritable are you?', category: 'mood' },
            { id: 18, text: 'How much has your appetite changed?', category: 'physical' },
            { id: 19, text: 'How difficult is it to concentrate?', category: 'cognition' },
            { id: 20, text: 'How tired or fatigued do you feel?', category: 'physical' },
            { id: 21, text: 'How much has your interest in sex decreased?', category: 'physical' }
        ],
        responseOptions: [
            { value: 0, label: 'Not present' },
            { value: 1, label: 'Mild' },
            { value: 2, label: 'Moderate' },
            { value: 3, label: 'Severe' }
        ],
        scoring: [
            {
                min: 0, max: 13,
                level: 'Minimal Depression',
                color: 'green',
                description: 'Your responses suggest minimal or no depression.',
                suggestions: [
                    'Continue healthy lifestyle practices',
                    'Maintain social connections',
                    'Practice preventive mental health care',
                    'Stay physically active'
                ]
            },
            {
                min: 14, max: 19,
                level: 'Mild Depression',
                color: 'yellow',
                description: 'Your responses suggest mild depression symptoms.',
                suggestions: [
                    'Consider talking to a mental health professional',
                    'Engage in regular physical activity',
                    'Practice stress reduction techniques',
                    'Monitor symptoms over time'
                ]
            },
            {
                min: 20, max: 28,
                level: 'Moderate Depression',
                color: 'orange',
                description: 'Your responses suggest moderate depression requiring attention.',
                suggestions: [
                    'Seek professional counseling or therapy',
                    'Consider medication evaluation',
                    'Establish daily routines',
                    'Engage in behavioral activation'
                ]
            },
            {
                min: 29, max: 63,
                level: 'Severe Depression',
                color: 'red',
                description: 'Your responses suggest severe depression requiring immediate professional help.',
                suggestions: [
                    'Seek immediate professional treatment',
                    'Consider intensive therapy options',
                    'Medication evaluation recommended',
                    'Ensure 24/7 support availability'
                ]
            }
        ],
        safetyQuestionIndex: 8,
        disclaimer: 'The BDI-II is for educational purposes only. This is not a diagnostic tool. Please consult a mental health professional for proper evaluation.',
        emergencyHelplines: [
            { name: 'AASRA', number: '91-9820466726' },
            { name: 'Sneha', number: '044-24640050' },
            { name: 'Emergency', number: '112' }
        ],
        references: ['Beck, A. T., Steer, R. A., & Brown, G. K. (1996). Manual for the Beck Depression Inventory-II. San Antonio, TX: Psychological Corporation.']
    }
];