import { AssessmentConfig, AssessmentType, AssessmentCategory } from '../../models/assessment.model';

export const COMBINED_ASSESSMENTS: AssessmentConfig[] = [
    // DASS-21 Combined Assessment
    {
        id: 'dass21',
        type: AssessmentType.DASS21,
        category: AssessmentCategory.COMBINED,
        title: 'DASS-21 Depression, Anxiety & Stress Scale',
        description: 'A comprehensive assessment measuring depression, anxiety, and stress levels simultaneously.',
        instructions: 'Please read each statement and select the response that indicates how much the statement applied to you over the past week.',
        timeframe: 'Past week',
        duration: '5-7 minutes',
        questions: [
            { id: 1, text: 'I found it hard to wind down', category: 'stress' },
            { id: 2, text: 'I was aware of dryness of my mouth', category: 'anxiety' },
            { id: 3, text: 'I couldn\'t seem to experience any positive feeling at all', category: 'depression' },
            { id: 4, text: 'I experienced breathing difficulty (e.g., excessively rapid breathing, breathlessness)', category: 'anxiety' },
            { id: 5, text: 'I found it difficult to work up the initiative to do things', category: 'depression' },
            { id: 6, text: 'I tended to over-react to situations', category: 'stress' },
            { id: 7, text: 'I experienced trembling (e.g., in the hands)', category: 'anxiety' },
            { id: 8, text: 'I felt that I was using a lot of nervous energy', category: 'stress' },
            { id: 9, text: 'I was worried about situations in which I might panic and make a fool of myself', category: 'anxiety' },
            { id: 10, text: 'I felt that I had nothing to look forward to', category: 'depression' },
            { id: 11, text: 'I found myself getting agitated', category: 'stress' },
            { id: 12, text: 'I found it difficult to relax', category: 'stress' },
            { id: 13, text: 'I felt down-hearted and blue', category: 'depression' },
            { id: 14, text: 'I was intolerant of anything that kept me from getting on with what I was doing', category: 'stress' },
            { id: 15, text: 'I felt I was close to panic', category: 'anxiety' },
            { id: 16, text: 'I was unable to become enthusiastic about anything', category: 'depression' },
            { id: 17, text: 'I felt I wasn\'t worth much as a person', category: 'depression' },
            { id: 18, text: 'I felt that I was rather touchy', category: 'stress' },
            { id: 19, text: 'I was aware of the action of my heart in the absence of physical exertion', category: 'anxiety' },
            { id: 20, text: 'I felt scared without any good reason', category: 'anxiety' },
            { id: 21, text: 'I felt that life was meaningless', category: 'depression' }
        ],
        responseOptions: [
            { value: 0, label: 'Did not apply to me at all' },
            { value: 1, label: 'Applied to me to some degree, or some of the time' },
            { value: 2, label: 'Applied to me to a considerable degree, or a good part of time' },
            { value: 3, label: 'Applied to me very much, or most of the time' }
        ],
        scoring: [
            {
                min: 0, max: 20,
                level: 'Normal Range',
                color: 'green',
                description: 'Your responses suggest normal levels of depression, anxiety, and stress.',
                suggestions: [
                    'Continue maintaining healthy coping strategies',
                    'Practice regular self-care and stress management',
                    'Stay physically active and socially connected',
                    'Monitor your mental health regularly'
                ]
            },
            {
                min: 21, max: 40,
                level: 'Mild Symptoms',
                color: 'yellow',
                description: 'Your responses suggest mild symptoms that may benefit from attention.',
                suggestions: [
                    'Consider learning stress management techniques',
                    'Practice mindfulness and relaxation exercises',
                    'Maintain regular sleep and exercise routines',
                    'Consider talking to a counselor if symptoms persist'
                ]
            },
            {
                min: 41, max: 60,
                level: 'Moderate Symptoms',
                color: 'orange',
                description: 'Your responses suggest moderate symptoms that warrant professional attention.',
                suggestions: [
                    'Strongly consider professional counseling',
                    'Learn cognitive-behavioral techniques',
                    'Establish structured daily routines',
                    'Consider joining a support group'
                ]
            },
            {
                min: 61, max: 63,
                level: 'Severe Symptoms',
                color: 'red',
                description: 'Your responses suggest severe symptoms requiring professional treatment.',
                suggestions: [
                    'Seek professional mental health treatment immediately',
                    'Consider both therapy and medication evaluation',
                    'Ensure you have support systems in place',
                    'Contact emergency services if feeling unsafe'
                ]
            }
        ],
        safetyQuestionIndex: 20,
        disclaimer: 'The DASS-21 is for educational purposes only and does not constitute a medical diagnosis. Please consult a healthcare professional for proper evaluation.',
        emergencyHelplines: [
            { name: 'AASRA', number: '91-9820466726' },
            { name: 'Sneha', number: '044-24640050' }
        ],
        references: ['Lovibond, S.H. & Lovibond, P.F. (1995). Manual for the Depression Anxiety Stress Scales. Sydney: Psychology Foundation.']
    }
];