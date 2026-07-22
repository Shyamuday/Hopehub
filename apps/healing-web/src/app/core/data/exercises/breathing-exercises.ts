import { Exercise, ExerciseType, ExerciseCategory, ExerciseDifficulty } from '../../models/exercise.model';

export const BREATHING_EXERCISES: Exercise[] = [
    {
        id: 'box-breathing',
        title: '4-7-8 Breathing Technique',
        description: 'A powerful breathing technique to reduce anxiety and promote relaxation by regulating your nervous system.',
        type: ExerciseType.BREATHING,
        category: [ExerciseCategory.ANXIETY, ExerciseCategory.STRESS, ExerciseCategory.SLEEP],
        difficulty: ExerciseDifficulty.BEGINNER,
        duration: '5-10 minutes',
        benefits: [
            'Reduces anxiety and stress',
            'Promotes better sleep',
            'Lowers heart rate',
            'Activates parasympathetic nervous system',
            'Improves focus and concentration'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Sit comfortably with your back straight or lie down',
                tip: 'Choose a quiet space where you won\'t be disturbed'
            },
            {
                stepNumber: 2,
                instruction: 'Place one hand on your chest, one on your belly',
                tip: 'This helps you feel your breathing pattern'
            },
            {
                stepNumber: 3,
                instruction: 'Exhale completely through your mouth',
                duration: '2-3 seconds'
            },
            {
                stepNumber: 4,
                instruction: 'Inhale quietly through your nose',
                duration: '4 counts',
                tip: 'Count slowly: 1-2-3-4'
            },
            {
                stepNumber: 5,
                instruction: 'Hold your breath',
                duration: '7 counts',
                tip: 'Don\'t strain - if 7 is too long, start with 4'
            },
            {
                stepNumber: 6,
                instruction: 'Exhale through your mouth',
                duration: '8 counts',
                tip: 'Make a whoosh sound as you exhale'
            },
            {
                stepNumber: 7,
                instruction: 'Repeat the cycle 3-4 times',
                tip: 'Start with fewer cycles and gradually increase'
            }
        ],
        tips: [
            'Practice regularly for best results',
            'Don\'t do more than 4 cycles when starting',
            'If you feel dizzy, return to normal breathing',
            'Best practiced on an empty stomach'
        ],
        whenToUse: [
            'Before sleep to improve sleep quality',
            'During anxiety or panic attacks',
            'When feeling stressed or overwhelmed',
            'Before important meetings or events',
            'As a daily relaxation practice'
        ],
        contraindications: [
            'Avoid if you have serious heart conditions',
            'Stop if you feel dizzy or lightheaded',
            'Consult doctor if you have breathing disorders'
        ],
        tags: ['anxiety', 'sleep', 'stress', 'relaxation', 'breathing', 'beginner']
    },

    {
        id: 'belly-breathing',
        title: 'Diaphragmatic (Belly) Breathing',
        description: 'Learn to breathe deeply using your diaphragm to activate your body\'s relaxation response.',
        type: ExerciseType.BREATHING,
        category: [ExerciseCategory.ANXIETY, ExerciseCategory.STRESS, ExerciseCategory.GENERAL_WELLBEING],
        difficulty: ExerciseDifficulty.BEGINNER,
        duration: '5-15 minutes',
        benefits: [
            'Reduces stress hormones',
            'Lowers blood pressure',
            'Improves oxygen efficiency',
            'Strengthens diaphragm',
            'Promotes relaxation'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Lie down or sit comfortably',
                tip: 'Support your head and knees with pillows if lying down'
            },
            {
                stepNumber: 2,
                instruction: 'Place one hand on your chest, one on your belly',
                tip: 'The hand on your belly should move more than the chest hand'
            },
            {
                stepNumber: 3,
                instruction: 'Breathe in slowly through your nose',
                duration: '3-4 seconds',
                tip: 'Feel your belly rise while chest stays relatively still'
            },
            {
                stepNumber: 4,
                instruction: 'Purse your lips and exhale slowly',
                duration: '6 seconds',
                tip: 'Like you\'re blowing out a candle gently'
            },
            {
                stepNumber: 5,
                instruction: 'Continue for 5-15 minutes',
                tip: 'Focus on the rhythm and the movement of your belly'
            }
        ],
        tips: [
            'Practice 2-3 times daily for best results',
            'It may feel unnatural at first - that\'s normal',
            'Don\'t force it - let it happen naturally',
            'Can be done anywhere once you learn the technique'
        ],
        whenToUse: [
            'Daily stress management',
            'Before stressful situations',
            'When feeling anxious',
            'As part of meditation practice',
            'To improve overall breathing habits'
        ],
        tags: ['stress', 'anxiety', 'relaxation', 'breathing', 'daily-practice', 'beginner']
    },

    {
        id: 'alternate-nostril',
        title: 'Alternate Nostril Breathing (Nadi Shodhana)',
        description: 'An ancient yogic breathing technique that balances the nervous system and calms the mind.',
        type: ExerciseType.BREATHING,
        category: [ExerciseCategory.ANXIETY, ExerciseCategory.STRESS, ExerciseCategory.GENERAL_WELLBEING],
        difficulty: ExerciseDifficulty.INTERMEDIATE,
        duration: '5-10 minutes',
        benefits: [
            'Balances nervous system',
            'Improves focus and concentration',
            'Reduces stress and anxiety',
            'Enhances respiratory function',
            'Promotes mental clarity'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Sit comfortably with spine straight',
                tip: 'Use a cushion or chair for comfort'
            },
            {
                stepNumber: 2,
                instruction: 'Use your right thumb to close your right nostril',
                tip: 'Rest your index and middle fingers on your forehead'
            },
            {
                stepNumber: 3,
                instruction: 'Inhale slowly through your left nostril',
                duration: '4 counts'
            },
            {
                stepNumber: 4,
                instruction: 'Close left nostril with ring finger, release thumb',
                tip: 'Both nostrils briefly closed during the switch'
            },
            {
                stepNumber: 5,
                instruction: 'Exhale through right nostril',
                duration: '4 counts'
            },
            {
                stepNumber: 6,
                instruction: 'Inhale through right nostril',
                duration: '4 counts'
            },
            {
                stepNumber: 7,
                instruction: 'Switch: close right, open left, exhale',
                duration: '4 counts'
            },
            {
                stepNumber: 8,
                instruction: 'Continue for 5-10 rounds',
                tip: 'One round = breathing through both nostrils once'
            }
        ],
        tips: [
            'Don\'t press hard on your nose',
            'Keep the pressure gentle and comfortable',
            'If you get confused, just breathe normally and restart',
            'Practice regularly for maximum benefit'
        ],
        whenToUse: [
            'Before meditation or yoga',
            'When feeling mentally scattered',
            'To improve focus before work',
            'As part of morning routine',
            'When needing emotional balance'
        ],
        tags: ['anxiety', 'stress', 'focus', 'breathing', 'yoga', 'intermediate', 'balance']
    }
];