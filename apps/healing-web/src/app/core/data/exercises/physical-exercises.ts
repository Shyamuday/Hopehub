import { Exercise, ExerciseType, ExerciseCategory, ExerciseDifficulty } from '../../models/exercise.model';

export const PHYSICAL_EXERCISES: Exercise[] = [
    {
        id: 'progressive-muscle-relaxation',
        title: 'Progressive Muscle Relaxation (PMR)',
        description: 'Systematically tense and relax muscle groups to reduce physical tension and stress.',
        type: ExerciseType.PHYSICAL,
        category: [ExerciseCategory.STRESS, ExerciseCategory.ANXIETY, ExerciseCategory.SLEEP],
        difficulty: ExerciseDifficulty.BEGINNER,
        duration: '15-20 minutes',
        benefits: [
            'Reduces muscle tension',
            'Lowers stress and anxiety',
            'Improves sleep quality',
            'Increases body awareness',
            'Promotes deep relaxation'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Lie down or sit comfortably',
                tip: 'Wear loose, comfortable clothing'
            },
            {
                stepNumber: 2,
                instruction: 'Start with your feet - tense for 5 seconds',
                duration: '5 seconds',
                tip: 'Curl your toes and tighten foot muscles'
            },
            {
                stepNumber: 3,
                instruction: 'Release and relax for 10-15 seconds',
                duration: '10-15 seconds',
                tip: 'Notice the contrast between tension and relaxation'
            },
            {
                stepNumber: 4,
                instruction: 'Move to calves - tense and release',
                duration: '5 seconds tense, 15 seconds relax',
                tip: 'Point your toes toward your shins'
            },
            {
                stepNumber: 5,
                instruction: 'Continue with thighs, buttocks, abdomen',
                duration: '5 seconds tense, 15 seconds relax each',
                tip: 'Tighten each muscle group as much as comfortable'
            },
            {
                stepNumber: 6,
                instruction: 'Work through hands, arms, shoulders',
                duration: '5 seconds tense, 15 seconds relax each',
                tip: 'Make fists and tighten arm muscles'
            },
            {
                stepNumber: 7,
                instruction: 'Finish with neck and face muscles',
                duration: '5 seconds tense, 15 seconds relax',
                tip: 'Scrunch face muscles, then let them go completely'
            },
            {
                stepNumber: 8,
                instruction: 'Enjoy the full-body relaxation for 2-3 minutes',
                tip: 'Notice how your whole body feels now'
            }
        ],
        tips: [
            'Don\'t tense so hard that it hurts',
            'Focus on the contrast between tension and relaxation',
            'If you have injuries, skip those muscle groups',
            'Practice regularly for cumulative benefits'
        ],
        whenToUse: [
            'Before sleep to improve sleep quality',
            'When feeling physically tense or stressed',
            'During anxiety episodes',
            'After long work days',
            'As part of regular stress management'
        ],
        tags: ['physical', 'relaxation', 'stress', 'anxiety', 'sleep', 'muscle-tension', 'beginner']
    },

    {
        id: 'gentle-yoga-flow',
        title: 'Gentle Yoga Flow for Mental Health',
        description: 'A simple yoga sequence designed to reduce stress, anxiety, and improve mood.',
        type: ExerciseType.PHYSICAL,
        category: [ExerciseCategory.STRESS, ExerciseCategory.ANXIETY, ExerciseCategory.DEPRESSION, ExerciseCategory.GENERAL_WELLBEING],
        difficulty: ExerciseDifficulty.BEGINNER,
        duration: '15-30 minutes',
        benefits: [
            'Reduces stress and anxiety',
            'Improves mood and energy',
            'Increases flexibility and strength',
            'Enhances mind-body connection',
            'Promotes better sleep'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Child\'s Pose - kneel and sit back on heels',
                duration: '1-2 minutes',
                tip: 'Extend arms forward, rest forehead on ground'
            },
            {
                stepNumber: 2,
                instruction: 'Cat-Cow Pose - on hands and knees, arch and round spine',
                duration: '1-2 minutes',
                tip: 'Move slowly with your breath'
            },
            {
                stepNumber: 3,
                instruction: 'Downward Dog - lift hips up, straighten legs',
                duration: '30 seconds - 1 minute',
                tip: 'Bend knees if needed, focus on lengthening spine'
            },
            {
                stepNumber: 4,
                instruction: 'Standing Forward Fold - hang over legs',
                duration: '30 seconds - 1 minute',
                tip: 'Bend knees, let arms hang heavy'
            },
            {
                stepNumber: 5,
                instruction: 'Mountain Pose - stand tall, arms at sides',
                duration: '30 seconds',
                tip: 'Feel grounded through your feet'
            },
            {
                stepNumber: 6,
                instruction: 'Gentle twists sitting cross-legged',
                duration: '30 seconds each side',
                tip: 'Keep spine long, twist from your core'
            },
            {
                stepNumber: 7,
                instruction: 'Legs up the wall or bent knees to chest',
                duration: '2-5 minutes',
                tip: 'Very restorative - let gravity help you relax'
            },
            {
                stepNumber: 8,
                instruction: 'Savasana - lie flat, completely relax',
                duration: '3-5 minutes',
                tip: 'Let your body be heavy, mind be quiet'
            }
        ],
        tips: [
            'Listen to your body - never force poses',
            'Breathe deeply throughout the practice',
            'Modify poses as needed for your body',
            'Focus on how you feel, not how poses look'
        ],
        whenToUse: [
            'Morning routine to start day positively',
            'Evening wind-down before sleep',
            'When feeling stressed or anxious',
            'During depressive episodes for gentle movement',
            'As regular self-care practice'
        ],
        contraindications: [
            'Avoid if you have serious back or neck injuries',
            'Modify for pregnancy',
            'Stop if you feel pain or dizziness'
        ],
        tags: ['physical', 'yoga', 'stress', 'anxiety', 'depression', 'flexibility', 'beginner']
    },

    {
        id: 'walking-meditation',
        title: 'Mindful Walking Exercise',
        description: 'Combine gentle physical activity with mindfulness to reduce stress and improve mood.',
        type: ExerciseType.PHYSICAL,
        category: [ExerciseCategory.STRESS, ExerciseCategory.ANXIETY, ExerciseCategory.DEPRESSION, ExerciseCategory.GENERAL_WELLBEING],
        difficulty: ExerciseDifficulty.BEGINNER,
        duration: '10-30 minutes',
        benefits: [
            'Combines exercise with mindfulness',
            'Improves mood naturally',
            'Reduces rumination and worry',
            'Increases vitamin D (if outdoors)',
            'Enhances creativity and problem-solving'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Choose a quiet path or space to walk',
                tip: 'Can be indoors or outdoors, 10-20 steps is enough'
            },
            {
                stepNumber: 2,
                instruction: 'Begin walking slower than normal',
                tip: 'About half your usual walking speed'
            },
            {
                stepNumber: 3,
                instruction: 'Focus on the sensation of your feet touching ground',
                tip: 'Feel the heel, then toe, then lifting of each foot'
            },
            {
                stepNumber: 4,
                instruction: 'Notice your surroundings without judgment',
                tip: 'Sounds, sights, smells - just observe'
            },
            {
                stepNumber: 5,
                instruction: 'When mind wanders, gently return to walking',
                tip: 'This is normal and part of the practice'
            },
            {
                stepNumber: 6,
                instruction: 'If walking a path, turn around mindfully at the end',
                tip: 'Pause, turn slowly, begin walking back'
            },
            {
                stepNumber: 7,
                instruction: 'Continue for your chosen duration',
                tip: 'Even 5-10 minutes can be beneficial'
            }
        ],
        tips: [
            'Start with shorter durations and build up',
            'Don\'t worry about looking silly - focus inward',
            'Can be done anywhere - even in your living room',
            'Combine with nature for additional benefits'
        ],
        whenToUse: [
            'When feeling stuck or ruminating',
            'As a break during stressful days',
            'When needing gentle exercise',
            'To transition between activities',
            'As moving meditation practice'
        ],
        tags: ['physical', 'mindfulness', 'walking', 'stress', 'anxiety', 'depression', 'nature', 'beginner']
    }
];