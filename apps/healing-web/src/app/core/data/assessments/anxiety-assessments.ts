import { AssessmentConfig, AssessmentType, AssessmentCategory } from '../../models/assessment.model';

export const ANXIETY_ASSESSMENTS: AssessmentConfig[] = [
    // GAD-7 Anxiety Assessment
    {
        id: 'gad7',
        type: AssessmentType.GAD7,
        category: AssessmentCategory.ANXIETY,
        title: 'GAD-7 Anxiety Assessment',
        description: 'A clinical tool to assess generalized anxiety disorder symptoms over the past two weeks.',
        instructions: 'Over the last 2 weeks, how often have you been bothered by the following problems?',
        timeframe: 'Past 2 weeks',
        duration: '2-3 minutes',
        questions: [
            { id: 1, text: 'Feeling nervous, anxious, or on edge', category: 'nervousness' },
            { id: 2, text: 'Not being able to stop or control worrying', category: 'worry' },
            { id: 3, text: 'Worrying too much about different things', category: 'worry' },
            { id: 4, text: 'Trouble relaxing', category: 'relaxation' },
            { id: 5, text: 'Being so restless that it is hard to sit still', category: 'restlessness' },
            { id: 6, text: 'Becoming easily annoyed or irritable', category: 'irritability' },
            { id: 7, text: 'Feeling afraid, as if something awful might happen', category: 'fear' }
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
                level: 'Minimal Anxiety',
                color: 'green',
                description: 'Your responses suggest minimal anxiety symptoms.',
                suggestions: [
                    'Continue current coping strategies',
                    'Practice regular relaxation techniques',
                    'Maintain healthy lifestyle habits',
                    'Stay physically active'
                ]
            },
            {
                min: 5, max: 9,
                level: 'Mild Anxiety',
                color: 'yellow',
                description: 'Your responses suggest mild anxiety that may benefit from attention.',
                suggestions: [
                    'Learn and practice anxiety management techniques',
                    'Consider mindfulness or meditation',
                    'Regular exercise and good sleep hygiene',
                    'Consider professional guidance if symptoms persist'
                ]
            },
            {
                min: 10, max: 14,
                level: 'Moderate Anxiety',
                color: 'orange',
                description: 'Your responses suggest moderate anxiety that warrants professional attention.',
                suggestions: [
                    'Consider professional counseling or therapy',
                    'Learn cognitive-behavioral techniques',
                    'Practice deep breathing and relaxation',
                    'Consider joining an anxiety support group'
                ]
            },
            {
                min: 15, max: 21,
                level: 'Severe Anxiety',
                color: 'red',
                description: 'Your responses suggest severe anxiety requiring professional treatment.',
                suggestions: [
                    'Seek professional mental health treatment',
                    'Consider both therapy and medication evaluation',
                    'Learn crisis management techniques',
                    'Ensure you have support systems in place'
                ]
            }
        ],
        disclaimer: 'This GAD-7 assessment is for educational purposes only and does not constitute a medical diagnosis. Please consult a healthcare professional for proper evaluation.',
        emergencyHelplines: [
            { name: 'AASRA', number: '91-9820466726' },
            { name: 'Sneha', number: '044-24640050' }
        ],
        references: ['Spitzer, R. L., Kroenke, K., Williams, J. B., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder. Archives of internal medicine, 166(10), 1092-1097.']
    }
];