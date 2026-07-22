import { AssessmentConfig, AssessmentType, AssessmentCategory } from '../../models/assessment.model';

export const WELLBEING_ASSESSMENTS: AssessmentConfig[] = [
    // WHO-5 Well-Being Index
    {
        id: 'who5',
        type: AssessmentType.WHO5,
        category: AssessmentCategory.WELLBEING,
        title: 'WHO-5 Well-Being Index',
        description: 'A short questionnaire measuring current mental well-being and quality of life.',
        instructions: 'Please indicate for each of the five statements which is closest to how you have been feeling over the last two weeks.',
        timeframe: 'Past 2 weeks',
        duration: '2 minutes',
        questions: [
            { id: 1, text: 'I have felt cheerful and in good spirits', category: 'mood' },
            { id: 2, text: 'I have felt calm and relaxed', category: 'relaxation' },
            { id: 3, text: 'I have felt active and vigorous', category: 'energy' },
            { id: 4, text: 'I woke up feeling fresh and rested', category: 'sleep' },
            { id: 5, text: 'My daily life has been filled with things that interest me', category: 'interest' }
        ],
        responseOptions: [
            { value: 0, label: 'At no time' },
            { value: 1, label: 'Some of the time' },
            { value: 2, label: 'Less than half of the time' },
            { value: 3, label: 'More than half of the time' },
            { value: 4, label: 'Most of the time' },
            { value: 5, label: 'All of the time' }
        ],
        scoring: [
            {
                min: 0, max: 12,
                level: 'Poor Well-being',
                color: 'red',
                description: 'Your well-being score suggests you may be experiencing significant distress.',
                suggestions: [
                    'Consider seeking professional support',
                    'Focus on basic self-care activities',
                    'Reach out to trusted friends or family',
                    'Consider professional counseling'
                ]
            },
            {
                min: 13, max: 18,
                level: 'Below Average Well-being',
                color: 'orange',
                description: 'Your well-being could benefit from some attention and care.',
                suggestions: [
                    'Engage in activities you enjoy',
                    'Practice stress management techniques',
                    'Maintain social connections',
                    'Consider lifestyle improvements'
                ]
            },
            {
                min: 19, max: 25,
                level: 'Good Well-being',
                color: 'green',
                description: 'Your well-being appears to be in a healthy range.',
                suggestions: [
                    'Continue current positive practices',
                    'Maintain work-life balance',
                    'Keep nurturing relationships',
                    'Practice gratitude and mindfulness'
                ]
            }
        ],
        disclaimer: 'The WHO-5 is a measure of current well-being. Low scores may indicate the need for further evaluation.',
        emergencyHelplines: [
            { name: 'AASRA', number: '91-9820466726' },
            { name: 'Sneha', number: '044-24640050' }
        ],
        references: ['Topp, C. W., Østergaard, S. D., Søndergaard, S., & Bech, P. (2015). The WHO-5 Well-Being Index: a systematic review of the literature. Psychotherapy and psychosomatics, 84(3), 167-176.']
    }
];