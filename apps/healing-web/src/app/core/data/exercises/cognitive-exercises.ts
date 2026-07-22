import { Exercise, ExerciseType, ExerciseCategory, ExerciseDifficulty } from '../../models/exercise.model';

export const COGNITIVE_EXERCISES: Exercise[] = [
    {
        id: 'thought-challenging',
        title: 'Cognitive Restructuring (Thought Challenging)',
        description: 'Learn to identify and challenge negative thought patterns that contribute to depression and anxiety.',
        type: ExerciseType.COGNITIVE,
        category: [ExerciseCategory.DEPRESSION, ExerciseCategory.ANXIETY, ExerciseCategory.STRESS],
        difficulty: ExerciseDifficulty.INTERMEDIATE,
        duration: '10-15 minutes',
        benefits: [
            'Reduces negative thinking patterns',
            'Improves emotional regulation',
            'Increases self-awareness',
            'Develops problem-solving skills',
            'Builds resilience'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Identify the negative thought or belief',
                tip: 'Write it down exactly as it appears in your mind'
            },
            {
                stepNumber: 2,
                instruction: 'Rate how much you believe it (0-100%)',
                tip: 'Be honest about your current belief level'
            },
            {
                stepNumber: 3,
                instruction: 'Ask: "What evidence supports this thought?"',
                tip: 'Look for concrete facts, not feelings or assumptions'
            },
            {
                stepNumber: 4,
                instruction: 'Ask: "What evidence contradicts this thought?"',
                tip: 'Consider times when the opposite was true'
            },
            {
                stepNumber: 5,
                instruction: 'Consider: "What would I tell a friend in this situation?"',
                tip: 'We\'re often kinder to others than ourselves'
            },
            {
                stepNumber: 6,
                instruction: 'Develop a more balanced, realistic thought',
                tip: 'Not necessarily positive, just more accurate'
            },
            {
                stepNumber: 7,
                instruction: 'Rate your belief in the new thought (0-100%)',
                tip: 'Notice any shift in your emotional state'
            }
        ],
        tips: [
            'Practice with less emotionally charged thoughts first',
            'It takes time to change thought patterns - be patient',
            'Write things down to make the process more concrete',
            'Look for thinking traps like all-or-nothing thinking'
        ],
        whenToUse: [
            'When stuck in negative thinking loops',
            'During depressive episodes',
            'When anxiety is driven by catastrophic thoughts',
            'Before important decisions',
            'As part of daily mental health maintenance'
        ],
        tags: ['cognitive', 'depression', 'anxiety', 'negative-thoughts', 'CBT', 'intermediate']
    },

    {
        id: 'gratitude-practice',
        title: 'Daily Gratitude Practice',
        description: 'A simple but powerful exercise to shift focus toward positive aspects of life.',
        type: ExerciseType.COGNITIVE,
        category: [ExerciseCategory.DEPRESSION, ExerciseCategory.GENERAL_WELLBEING],
        difficulty: ExerciseDifficulty.BEGINNER,
        duration: '5-10 minutes',
        benefits: [
            'Improves mood and life satisfaction',
            'Reduces depression symptoms',
            'Enhances optimism',
            'Strengthens relationships',
            'Improves sleep quality'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Set aside time each day (morning or evening)',
                tip: 'Consistency is key - same time each day works best'
            },
            {
                stepNumber: 2,
                instruction: 'Write down 3 things you\'re grateful for',
                tip: 'Be specific rather than general'
            },
            {
                stepNumber: 3,
                instruction: 'For each item, write why you\'re grateful',
                tip: 'This deepens the emotional impact'
            },
            {
                stepNumber: 4,
                instruction: 'Include different categories: people, experiences, things',
                tip: 'Variety prevents the practice from becoming routine'
            },
            {
                stepNumber: 5,
                instruction: 'Notice small, everyday things, not just big events',
                tip: 'A warm cup of coffee, a friend\'s smile, etc.'
            },
            {
                stepNumber: 6,
                instruction: 'Take a moment to really feel the gratitude',
                tip: 'Don\'t just think it - try to feel it in your body'
            }
        ],
        tips: [
            'Start small - even one thing daily is beneficial',
            'Don\'t repeat the same items too often',
            'Include challenges that led to growth',
            'Share your gratitude with others when appropriate'
        ],
        whenToUse: [
            'Daily as part of morning or evening routine',
            'When feeling depressed or negative',
            'During difficult life periods',
            'To enhance overall well-being',
            'Before sleep to improve sleep quality'
        ],
        tags: ['gratitude', 'depression', 'wellbeing', 'daily-practice', 'mood', 'beginner']
    },

    {
        id: 'worry-time',
        title: 'Scheduled Worry Time',
        description: 'A technique to contain and manage excessive worrying by scheduling specific times for it.',
        type: ExerciseType.COGNITIVE,
        category: [ExerciseCategory.ANXIETY, ExerciseCategory.STRESS],
        difficulty: ExerciseDifficulty.INTERMEDIATE,
        duration: '15-20 minutes',
        benefits: [
            'Reduces constant worrying',
            'Improves focus during the day',
            'Provides structure for anxiety management',
            'Helps distinguish productive from unproductive worry',
            'Increases sense of control'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Schedule 15-20 minutes daily for "worry time"',
                tip: 'Same time each day, not too close to bedtime'
            },
            {
                stepNumber: 2,
                instruction: 'Throughout the day, write down worries as they arise',
                tip: 'Keep a small notebook or phone note for this'
            },
            {
                stepNumber: 3,
                instruction: 'Tell yourself "I\'ll think about this during worry time"',
                tip: 'Redirect attention back to current activity'
            },
            {
                stepNumber: 4,
                instruction: 'During worry time, review your list',
                tip: 'You may find some worries seem less important now'
            },
            {
                stepNumber: 5,
                instruction: 'For each worry, ask: "Is this productive or unproductive?"',
                tip: 'Productive worries have actionable solutions'
            },
            {
                stepNumber: 6,
                instruction: 'For productive worries, make an action plan',
                tip: 'What specific steps can you take?'
            },
            {
                stepNumber: 7,
                instruction: 'For unproductive worries, practice letting go',
                tip: 'Use breathing or mindfulness techniques'
            }
        ],
        tips: [
            'It takes practice to postpone worries - be patient',
            'If worries intrude outside worry time, gently redirect',
            'Don\'t exceed your scheduled worry time',
            'End worry time with a pleasant or relaxing activity'
        ],
        whenToUse: [
            'When experiencing excessive worrying',
            'For generalized anxiety management',
            'When worries interfere with daily activities',
            'As part of anxiety treatment plan',
            'To improve focus and productivity'
        ],
        tags: ['anxiety', 'worry', 'stress', 'time-management', 'cognitive', 'intermediate']
    }
];