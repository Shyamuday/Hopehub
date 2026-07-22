import { Exercise, ExerciseType, ExerciseCategory, ExerciseDifficulty } from '../../models/exercise.model';

export const MINDFULNESS_EXERCISES: Exercise[] = [
    {
        id: 'body-scan',
        title: 'Progressive Body Scan Meditation',
        description: 'A mindfulness practice that helps you connect with your body and release physical tension.',
        type: ExerciseType.MINDFULNESS,
        category: [ExerciseCategory.STRESS, ExerciseCategory.ANXIETY, ExerciseCategory.SLEEP],
        difficulty: ExerciseDifficulty.BEGINNER,
        duration: '10-20 minutes',
        benefits: [
            'Reduces physical tension',
            'Improves body awareness',
            'Promotes deep relaxation',
            'Helps with sleep',
            'Reduces anxiety and stress'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Lie down comfortably on your back',
                tip: 'Use a yoga mat or comfortable surface'
            },
            {
                stepNumber: 2,
                instruction: 'Close your eyes and take 3 deep breaths',
                tip: 'Let your body settle into the surface'
            },
            {
                stepNumber: 3,
                instruction: 'Start with your toes - notice any sensations',
                duration: '30 seconds',
                tip: 'Don\'t judge, just observe what you feel'
            },
            {
                stepNumber: 4,
                instruction: 'Move to your feet, then ankles',
                duration: '30 seconds each',
                tip: 'Imagine breathing into each body part'
            },
            {
                stepNumber: 5,
                instruction: 'Continue up through legs, hips, torso',
                duration: '1 minute each section',
                tip: 'If you find tension, breathe into that area'
            },
            {
                stepNumber: 6,
                instruction: 'Scan arms, hands, shoulders, neck',
                duration: '30 seconds each',
                tip: 'Notice the difference between tense and relaxed'
            },
            {
                stepNumber: 7,
                instruction: 'Finish with your face and head',
                duration: '1 minute',
                tip: 'Relax your jaw, eyes, and forehead'
            },
            {
                stepNumber: 8,
                instruction: 'Feel your whole body as one',
                duration: '2-3 minutes',
                tip: 'Enjoy the sensation of complete relaxation'
            }
        ],
        tips: [
            'It\'s normal for your mind to wander - gently return focus',
            'Don\'t try to change anything, just observe',
            'Some areas may feel numb or tingly - that\'s normal',
            'Practice regularly for cumulative benefits'
        ],
        whenToUse: [
            'Before sleep to improve sleep quality',
            'When feeling physically tense',
            'During stress or anxiety',
            'As part of daily mindfulness practice',
            'After physical exercise or long work days'
        ],
        tags: ['mindfulness', 'relaxation', 'sleep', 'stress', 'body-awareness', 'beginner']
    },

    {
        id: 'mindful-breathing',
        title: 'Mindful Breathing Meditation',
        description: 'A foundational mindfulness practice focusing on breath awareness to calm the mind.',
        type: ExerciseType.MINDFULNESS,
        category: [ExerciseCategory.ANXIETY, ExerciseCategory.STRESS, ExerciseCategory.GENERAL_WELLBEING],
        difficulty: ExerciseDifficulty.BEGINNER,
        duration: '5-20 minutes',
        benefits: [
            'Improves focus and concentration',
            'Reduces anxiety and worry',
            'Develops mindfulness skills',
            'Calms the nervous system',
            'Increases present-moment awareness'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Sit comfortably with eyes closed or softly focused',
                tip: 'Keep your back straight but not rigid'
            },
            {
                stepNumber: 2,
                instruction: 'Notice your natural breathing rhythm',
                tip: 'Don\'t try to change it, just observe'
            },
            {
                stepNumber: 3,
                instruction: 'Focus on the sensation of breath at your nostrils',
                tip: 'Feel the air coming in cool, going out warm'
            },
            {
                stepNumber: 4,
                instruction: 'When your mind wanders, gently return to breath',
                tip: 'This is normal and part of the practice'
            },
            {
                stepNumber: 5,
                instruction: 'Count breaths from 1 to 10, then start over',
                tip: 'If you lose count, just start again at 1'
            },
            {
                stepNumber: 6,
                instruction: 'Continue for your chosen duration',
                tip: 'Start with 5 minutes and gradually increase'
            }
        ],
        tips: [
            'Consistency is more important than duration',
            'Don\'t judge your thoughts - just notice them',
            'Use a timer so you don\'t worry about time',
            'Find a regular time and place to practice'
        ],
        whenToUse: [
            'Daily mindfulness practice',
            'When feeling anxious or overwhelmed',
            'Before important meetings or events',
            'As a break during busy days',
            'To improve focus and concentration'
        ],
        tags: ['mindfulness', 'meditation', 'anxiety', 'stress', 'focus', 'daily-practice', 'beginner']
    },

    {
        id: 'loving-kindness',
        title: 'Loving-Kindness Meditation',
        description: 'A heart-centered practice that cultivates compassion for yourself and others.',
        type: ExerciseType.MINDFULNESS,
        category: [ExerciseCategory.DEPRESSION, ExerciseCategory.RELATIONSHIP, ExerciseCategory.GENERAL_WELLBEING],
        difficulty: ExerciseDifficulty.INTERMEDIATE,
        duration: '10-20 minutes',
        benefits: [
            'Increases self-compassion',
            'Improves relationships',
            'Reduces negative emotions',
            'Enhances emotional well-being',
            'Develops empathy and kindness'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Sit comfortably and close your eyes',
                tip: 'Place hand on heart if it helps you connect'
            },
            {
                stepNumber: 2,
                instruction: 'Begin with yourself: "May I be happy"',
                duration: '2-3 minutes',
                tip: 'Really mean it - send yourself genuine kindness'
            },
            {
                stepNumber: 3,
                instruction: 'Continue: "May I be healthy, May I be at peace"',
                tip: 'Feel the intention behind each phrase'
            },
            {
                stepNumber: 4,
                instruction: 'Think of a loved one, repeat the phrases for them',
                duration: '2-3 minutes',
                tip: 'Visualize them receiving your kind wishes'
            },
            {
                stepNumber: 5,
                instruction: 'Think of a neutral person, send them kindness',
                duration: '2-3 minutes',
                tip: 'Someone you neither like nor dislike'
            },
            {
                stepNumber: 6,
                instruction: 'Think of someone difficult, try sending kindness',
                duration: '2-3 minutes',
                tip: 'Start small - even wishing them freedom from suffering'
            },
            {
                stepNumber: 7,
                instruction: 'Extend to all beings: "May all beings be happy"',
                duration: '2-3 minutes',
                tip: 'Include all living creatures in your kindness'
            }
        ],
        tips: [
            'If you feel resistance, that\'s normal - be gentle',
            'You can modify the phrases to what feels authentic',
            'Don\'t force feelings - just set the intention',
            'Start with easier people and work up to difficult ones'
        ],
        whenToUse: [
            'When feeling angry or resentful',
            'To improve difficult relationships',
            'When being self-critical',
            'As part of regular meditation practice',
            'During conflicts or interpersonal stress'
        ],
        tags: ['mindfulness', 'compassion', 'relationships', 'depression', 'self-love', 'intermediate']
    }
];