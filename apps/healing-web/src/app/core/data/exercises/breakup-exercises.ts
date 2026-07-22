import { Exercise, ExerciseType, ExerciseCategory, ExerciseDifficulty } from '../../models/exercise.model';

export const BREAKUP_EXERCISES: Exercise[] = [
    {
        id: 'heartbreak-healing-meditation',
        title: 'Heartbreak Healing Meditation',
        description: 'A guided meditation specifically designed to help process emotions and find peace after a breakup.',
        type: ExerciseType.MINDFULNESS,
        category: [ExerciseCategory.BREAKUP, ExerciseCategory.DEPRESSION, ExerciseCategory.RELATIONSHIP],
        difficulty: ExerciseDifficulty.BEGINNER,
        duration: '15-20 minutes',
        benefits: [
            'Processes grief and sadness',
            'Reduces emotional pain',
            'Promotes self-compassion',
            'Helps with acceptance',
            'Restores inner peace'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Find a quiet, comfortable space where you won\'t be disturbed. Sit or lie down in a relaxed position.',
                duration: '2 minutes'
            },
            {
                stepNumber: 2,
                instruction: 'Close your eyes and take three deep breaths. Inhale slowly through your nose, hold for a moment, then exhale through your mouth.',
                duration: '1 minute'
            },
            {
                stepNumber: 3,
                instruction: 'Bring your awareness to your heart area. Notice any physical sensations - tightness, heaviness, or warmth. Simply observe without judgment.',
                duration: '2 minutes'
            },
            {
                stepNumber: 4,
                instruction: 'Acknowledge your feelings. Say to yourself: "I recognize that I am feeling [sadness/anger/loneliness]. These feelings are valid and temporary."',
                duration: '2 minutes'
            },
            {
                stepNumber: 5,
                instruction: 'Place your hand over your heart. Imagine sending warmth and compassion to yourself. Repeat: "I am worthy of love and healing."',
                duration: '3 minutes'
            },
            {
                stepNumber: 6,
                instruction: 'Visualize your emotions as clouds passing through the sky. Watch them come and go without holding onto them.',
                duration: '3 minutes'
            },
            {
                stepNumber: 7,
                instruction: 'Focus on your breath. With each exhale, imagine releasing a little bit of the pain. With each inhale, imagine bringing in peace and healing.',
                duration: '4 minutes'
            },
            {
                stepNumber: 8,
                instruction: 'Slowly bring your awareness back to the room. Wiggle your fingers and toes. When ready, gently open your eyes.',
                duration: '1 minute'
            }
        ],
        tips: [
            'Practice this daily, especially during difficult moments',
            'Be patient with yourself - healing takes time',
            'It\'s okay to cry during this meditation',
            'You can adjust the duration based on your needs',
            'Consider using a guided audio version if available'
        ],
        whenToUse: [
            'When feeling intense sadness or grief',
            'During moments of longing for your ex-partner',
            'When struggling with self-blame or self-criticism',
            'Before bed to help with sleep',
            'During emotional triggers or memories'
        ],
        tags: ['breakup', 'healing', 'meditation', 'grief', 'self-compassion', 'emotional-processing']
    },
    {
        id: 'letting-go-visualization',
        title: 'Letting Go Visualization',
        description: 'A powerful visualization exercise to help release attachment and move forward after a relationship ends.',
        type: ExerciseType.VISUALIZATION,
        category: [ExerciseCategory.BREAKUP, ExerciseCategory.RELATIONSHIP],
        difficulty: ExerciseDifficulty.INTERMEDIATE,
        duration: '20-25 minutes',
        benefits: [
            'Releases emotional attachment',
            'Promotes acceptance',
            'Facilitates closure',
            'Reduces rumination',
            'Encourages forward movement'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Sit comfortably with your back straight. Close your eyes and take several deep, calming breaths.',
                duration: '2 minutes'
            },
            {
                stepNumber: 2,
                instruction: 'Imagine yourself standing in a beautiful, peaceful place - perhaps a beach, forest, or garden. Feel the ground beneath your feet.',
                duration: '2 minutes'
            },
            {
                stepNumber: 3,
                instruction: 'Visualize a box or container in front of you. This represents all the memories, hopes, and attachments from your past relationship.',
                duration: '2 minutes'
            },
            {
                stepNumber: 4,
                instruction: 'One by one, place items into the box: memories, photos, shared dreams, and emotional attachments. Acknowledge each one as you place it inside.',
                duration: '5 minutes'
            },
            {
                stepNumber: 5,
                instruction: 'Close the box and thank it for holding these important parts of your journey. Recognize that they shaped you but no longer define you.',
                duration: '2 minutes'
            },
            {
                stepNumber: 6,
                instruction: 'Visualize the box transforming into something beautiful - perhaps a tree, a flower, or light. This represents growth and transformation.',
                duration: '3 minutes'
            },
            {
                stepNumber: 7,
                instruction: 'Turn away from the transformed box and look ahead. See a path leading forward, filled with possibilities and new opportunities.',
                duration: '3 minutes'
            },
            {
                stepNumber: 8,
                instruction: 'Take a step forward on this path. Feel the strength in your legs and the courage in your heart. Know that you are moving toward healing.',
                duration: '2 minutes'
            },
            {
                stepNumber: 9,
                instruction: 'Slowly return your awareness to the present moment. Open your eyes and take a moment to ground yourself in the here and now.',
                duration: '1 minute'
            }
        ],
        tips: [
            'Practice this when you\'re feeling ready to let go',
            'Be gentle with yourself - this is a process',
            'You may need to repeat this exercise multiple times',
            'Consider journaling about your experience afterward',
            'If emotions arise, allow them - they\'re part of the process'
        ],
        whenToUse: [
            'When stuck in the past or replaying memories',
            'During moments of hope for reconciliation',
            'When ready to move forward',
            'After processing initial grief',
            'When feeling ready to release attachment'
        ],
        tags: ['breakup', 'letting-go', 'visualization', 'closure', 'acceptance', 'moving-forward']
    },
    {
        id: 'self-compassion-breakup',
        title: 'Self-Compassion Practice for Breakups',
        description: 'A structured practice to cultivate self-kindness and reduce self-blame during breakup recovery.',
        type: ExerciseType.COGNITIVE,
        category: [ExerciseCategory.BREAKUP, ExerciseCategory.DEPRESSION],
        difficulty: ExerciseDifficulty.BEGINNER,
        duration: '10-15 minutes',
        benefits: [
            'Reduces self-blame and criticism',
            'Increases self-worth',
            'Promotes emotional healing',
            'Builds resilience',
            'Fosters self-love'
        ],
        steps: [
            {
                stepNumber: 1,
                instruction: 'Find a comfortable seated position. Close your eyes and take a few deep breaths to center yourself.',
                duration: '1 minute'
            },
            {
                stepNumber: 2,
                instruction: 'Bring to mind a difficult thought or feeling about the breakup. Notice where you feel it in your body.',
                duration: '1 minute'
            },
            {
                stepNumber: 3,
                instruction: 'Acknowledge the pain: "This is a moment of suffering. Breakups are painful, and it\'s normal to feel this way."',
                duration: '2 minutes'
            },
            {
                stepNumber: 4,
                instruction: 'Recognize common humanity: "Many people experience breakups. I am not alone in this pain. Suffering is part of the human experience."',
                duration: '2 minutes'
            },
            {
                stepNumber: 5,
                instruction: 'Offer yourself kindness: Place your hand over your heart and say: "May I be kind to myself. May I give myself the compassion I need."',
                duration: '3 minutes'
            },
            {
                stepNumber: 6,
                instruction: 'Challenge self-blame: "I did the best I could with what I knew at the time. Relationships end for many reasons, and it\'s not all my fault."',
                duration: '3 minutes'
            },
            {
                stepNumber: 7,
                instruction: 'Offer yourself forgiveness: "I forgive myself for any mistakes I made. I am learning and growing from this experience."',
                duration: '2 minutes'
            },
            {
                stepNumber: 8,
                instruction: 'End with a self-compassionate phrase: "I am worthy of love and happiness. I deserve kindness, especially from myself."',
                duration: '1 minute'
            }
        ],
        tips: [
            'Practice this daily, especially when self-critical thoughts arise',
            'Write down your self-compassion phrases and keep them visible',
            'Remember that self-compassion is not self-pity',
            'Be patient - self-compassion is a skill that develops over time',
            'Consider using a self-compassion journal'
        ],
        whenToUse: [
            'When experiencing self-blame or self-criticism',
            'During moments of low self-esteem',
            'When questioning your worth',
            'After replaying "what went wrong"',
            'When feeling like you\'re not good enough'
        ],
        tags: ['breakup', 'self-compassion', 'self-kindness', 'self-blame', 'healing', 'self-worth']
    }
];

