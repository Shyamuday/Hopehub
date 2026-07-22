import { AssessmentConfig, AssessmentType, AssessmentCategory } from '../../models/assessment.model';

export const LIFESTYLE_ASSESSMENTS: AssessmentConfig[] = [
    // Professional Burnout Assessment
    {
        id: 'burnout',
        type: AssessmentType.BURNOUT,
        category: AssessmentCategory.BURNOUT,
        title: 'Professional Burnout Assessment',
        description: 'Assess your level of work-related burnout and emotional exhaustion.',
        instructions: 'Please indicate how often you experience each of the following in relation to your work or daily responsibilities.',
        timeframe: 'Recent weeks',
        duration: '4-6 minutes',
        questions: [
            { id: 1, text: 'I feel emotionally drained from my work', category: 'exhaustion' },
            { id: 2, text: 'I feel used up at the end of the workday', category: 'exhaustion' },
            { id: 3, text: 'I feel tired when I get up in the morning and have to face another day', category: 'exhaustion' },
            { id: 4, text: 'Working all day is really a strain for me', category: 'exhaustion' },
            { id: 5, text: 'I feel burned out from my work', category: 'exhaustion' },
            { id: 6, text: 'I have become less interested in my work since I started this job', category: 'cynicism' },
            { id: 7, text: 'I have become less enthusiastic about my work', category: 'cynicism' },
            { id: 8, text: 'I have become more cynical about whether my work contributes anything', category: 'cynicism' },
            { id: 9, text: 'I doubt the significance of my work', category: 'cynicism' },
            { id: 10, text: 'I can effectively solve problems that arise in my work', category: 'efficacy' },
            { id: 11, text: 'I feel I am making an effective contribution to what this organization does', category: 'efficacy' },
            { id: 12, text: 'In my opinion, I am good at my job', category: 'efficacy' }
        ],
        responseOptions: [
            { value: 0, label: 'Never' },
            { value: 1, label: 'A few times a year' },
            { value: 2, label: 'Once a month or less' },
            { value: 3, label: 'A few times a month' },
            { value: 4, label: 'Once a week' },
            { value: 5, label: 'A few times a week' },
            { value: 6, label: 'Every day' }
        ],
        scoring: [
            {
                min: 0, max: 18,
                level: 'Low Burnout',
                color: 'green',
                description: 'Your burnout levels are low. You appear to be managing work stress well.',
                suggestions: [
                    'Continue maintaining work-life balance',
                    'Keep practicing self-care',
                    'Maintain healthy boundaries',
                    'Stay connected with supportive colleagues'
                ]
            },
            {
                min: 19, max: 36,
                level: 'Moderate Burnout',
                color: 'yellow',
                description: 'You are experiencing moderate burnout symptoms that need attention.',
                suggestions: [
                    'Reassess your workload and priorities',
                    'Take regular breaks and time off',
                    'Practice stress management techniques',
                    'Consider discussing concerns with supervisor'
                ]
            },
            {
                min: 37, max: 54,
                level: 'High Burnout',
                color: 'orange',
                description: 'You are experiencing significant burnout that requires immediate action.',
                suggestions: [
                    'Seek professional counseling or coaching',
                    'Consider taking extended time off',
                    'Evaluate career options and changes',
                    'Implement immediate stress reduction strategies'
                ]
            },
            {
                min: 55, max: 72,
                level: 'Severe Burnout',
                color: 'red',
                description: 'You are experiencing severe burnout requiring urgent intervention.',
                suggestions: [
                    'Seek immediate professional help',
                    'Consider medical leave if possible',
                    'Consult with mental health professional',
                    'Make significant life/work changes'
                ]
            }
        ],
        disclaimer: 'This burnout assessment is for educational purposes. Severe burnout may require professional intervention and workplace changes.',
        emergencyHelplines: [
            { name: 'AASRA', number: '91-9820466726' },
            { name: 'Sneha', number: '044-24640050' }
        ]
    },

    // Sleep Quality Assessment
    {
        id: 'sleep',
        type: AssessmentType.SLEEP,
        category: AssessmentCategory.SLEEP,
        title: 'Sleep Quality Assessment',
        description: 'Evaluate your sleep quality and identify potential sleep-related issues.',
        instructions: 'Please answer the following questions about your sleep patterns over the past month.',
        timeframe: 'Past month',
        duration: '3-4 minutes',
        questions: [
            { id: 1, text: 'How would you rate your sleep quality overall?', category: 'quality' },
            { id: 2, text: 'How often do you have trouble falling asleep?', category: 'onset' },
            { id: 3, text: 'How often do you wake up during the night?', category: 'maintenance' },
            { id: 4, text: 'How often do you wake up too early and can\'t get back to sleep?', category: 'early-waking' },
            { id: 5, text: 'How often do you feel tired or sleepy during the day?', category: 'daytime' },
            { id: 6, text: 'How often does poor sleep affect your mood?', category: 'impact' },
            { id: 7, text: 'How often does poor sleep affect your concentration?', category: 'impact' },
            { id: 8, text: 'How often does poor sleep affect your daily activities?', category: 'impact' },
            { id: 9, text: 'How satisfied are you with your current sleep pattern?', category: 'satisfaction' },
            { id: 10, text: 'How worried are you about your sleep?', category: 'concern' }
        ],
        responseOptions: [
            { value: 0, label: 'Not at all' },
            { value: 1, label: 'Rarely' },
            { value: 2, label: 'Sometimes' },
            { value: 3, label: 'Often' },
            { value: 4, label: 'Always' }
        ],
        scoring: [
            {
                min: 0, max: 10,
                level: 'Good Sleep Quality',
                color: 'green',
                description: 'Your sleep quality appears to be good with minimal issues.',
                suggestions: [
                    'Continue maintaining good sleep hygiene',
                    'Keep consistent sleep schedule',
                    'Maintain relaxing bedtime routine',
                    'Avoid screens before bedtime'
                ]
            },
            {
                min: 11, max: 20,
                level: 'Mild Sleep Issues',
                color: 'yellow',
                description: 'You are experiencing mild sleep issues that may benefit from attention.',
                suggestions: [
                    'Improve sleep hygiene practices',
                    'Create a relaxing bedtime routine',
                    'Limit caffeine and alcohol',
                    'Consider relaxation techniques before bed'
                ]
            },
            {
                min: 21, max: 30,
                level: 'Moderate Sleep Problems',
                color: 'orange',
                description: 'You are experiencing moderate sleep problems that warrant attention.',
                suggestions: [
                    'Consult with a healthcare provider',
                    'Consider cognitive behavioral therapy for insomnia',
                    'Evaluate medications and health conditions',
                    'Keep a sleep diary'
                ]
            },
            {
                min: 31, max: 40,
                level: 'Severe Sleep Problems',
                color: 'red',
                description: 'You are experiencing severe sleep problems requiring professional evaluation.',
                suggestions: [
                    'Seek immediate medical evaluation',
                    'Consider sleep study if recommended',
                    'Consult sleep specialist',
                    'Address underlying health conditions'
                ]
            }
        ],
        disclaimer: 'This sleep assessment is for educational purposes. Persistent sleep problems should be evaluated by a healthcare professional.',
        emergencyHelplines: [
            { name: 'AASRA', number: '91-9820466726' },
            { name: 'Sneha', number: '044-24640050' }
        ]
    },

    // Relationship Health Assessment
    {
        id: 'relationship',
        type: AssessmentType.RELATIONSHIP,
        category: AssessmentCategory.RELATIONSHIP,
        title: 'Relationship Health Assessment',
        description: 'Evaluate the health and satisfaction in your romantic relationship.',
        instructions: 'Please answer the following questions about your current romantic relationship.',
        timeframe: 'Current relationship',
        duration: '4-5 minutes',
        questions: [
            { id: 1, text: 'How satisfied are you with your relationship overall?', category: 'satisfaction' },
            { id: 2, text: 'How well do you and your partner communicate?', category: 'communication' },
            { id: 3, text: 'How often do you and your partner have conflicts?', category: 'conflict' },
            { id: 4, text: 'How well do you resolve conflicts when they arise?', category: 'resolution' },
            { id: 5, text: 'How much do you trust your partner?', category: 'trust' },
            { id: 6, text: 'How emotionally connected do you feel to your partner?', category: 'intimacy' },
            { id: 7, text: 'How satisfied are you with the physical intimacy in your relationship?', category: 'intimacy' },
            { id: 8, text: 'How well do you and your partner support each other?', category: 'support' },
            { id: 9, text: 'How much do you and your partner share common interests and values?', category: 'compatibility' },
            { id: 10, text: 'How optimistic are you about the future of your relationship?', category: 'future' }
        ],
        responseOptions: [
            { value: 0, label: 'Not at all' },
            { value: 1, label: 'Slightly' },
            { value: 2, label: 'Moderately' },
            { value: 3, label: 'Very much' },
            { value: 4, label: 'Extremely' }
        ],
        scoring: [
            {
                min: 0, max: 15,
                level: 'Relationship Distress',
                color: 'red',
                description: 'Your relationship appears to be experiencing significant distress.',
                suggestions: [
                    'Consider couples counseling immediately',
                    'Improve communication skills',
                    'Address underlying issues',
                    'Evaluate relationship goals and compatibility'
                ]
            },
            {
                min: 16, max: 25,
                level: 'Relationship Challenges',
                color: 'orange',
                description: 'Your relationship has some challenges that need attention.',
                suggestions: [
                    'Consider relationship counseling',
                    'Work on communication skills',
                    'Schedule quality time together',
                    'Address specific problem areas'
                ]
            },
            {
                min: 26, max: 35,
                level: 'Healthy Relationship',
                color: 'yellow',
                description: 'Your relationship is generally healthy with room for growth.',
                suggestions: [
                    'Continue nurturing your relationship',
                    'Maintain open communication',
                    'Keep investing in quality time',
                    'Address minor issues before they grow'
                ]
            },
            {
                min: 36, max: 40,
                level: 'Thriving Relationship',
                color: 'green',
                description: 'Your relationship appears to be thriving and healthy.',
                suggestions: [
                    'Continue current positive practices',
                    'Keep prioritizing your relationship',
                    'Maintain emotional connection',
                    'Celebrate your relationship strengths'
                ]
            }
        ],
        disclaimer: 'This relationship assessment is for educational purposes. Relationship issues may benefit from professional couples counseling.',
        emergencyHelplines: [
            { name: 'AASRA', number: '91-9820466726' },
            { name: 'Sneha', number: '044-24640050' }
        ]
    }
];