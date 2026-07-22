import { LifestyleTip, LifestyleTipType, LifestyleTipCategory, LifestyleTipDifficulty } from '../../models/lifestyle-tip.model';

export const WORK_LIFE_BALANCE_TIPS: LifestyleTip[] = [
    {
        id: 'digital-boundaries',
        title: 'Creating Digital Boundaries for Mental Health',
        description: 'Establish healthy limits with technology and work communications to protect your personal time.',
        type: LifestyleTipType.WORK_LIFE_BALANCE,
        category: [LifestyleTipCategory.STRESS, LifestyleTipCategory.BURNOUT, LifestyleTipCategory.SLEEP],
        difficulty: LifestyleTipDifficulty.MODERATE,
        timeToImplement: '1-2 weeks',
        benefits: [
            'Reduced work-related stress',
            'Better sleep quality',
            'Improved focus during work hours',
            'More present in personal relationships',
            'Decreased anxiety and overwhelm'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Set specific work hours',
                tip: 'Communicate clear start and end times to colleagues'
            },
            {
                stepNumber: 2,
                action: 'Turn off work notifications after hours',
                tip: 'Use "Do Not Disturb" modes or separate work/personal devices'
            },
            {
                stepNumber: 3,
                action: 'Create a physical workspace boundary',
                tip: 'Designate specific area for work, avoid working in bedroom'
            },
            {
                stepNumber: 4,
                action: 'Establish an end-of-workday ritual',
                timeframe: '10-15 minutes',
                tip: 'Review day, plan tomorrow, then "close" work mentally'
            },
            {
                stepNumber: 5,
                action: 'Use technology mindfully',
                tip: 'Check emails at designated times, not constantly throughout day'
            },
            {
                stepNumber: 6,
                action: 'Take regular breaks from screens',
                timeframe: '5-10 minutes every hour',
                tip: 'Look away from screen, stretch, or take a short walk'
            },
            {
                stepNumber: 7,
                action: 'Plan tech-free time daily',
                timeframe: '1-2 hours before bed',
                tip: 'Engage in non-digital activities like reading or conversation'
            }
        ],
        tips: [
            'Start with small changes - don\'t try to implement everything at once',
            'Communicate boundaries clearly with supervisors and colleagues',
            'Use auto-reply messages to set expectations about response times',
            'Remember: urgent work issues are rare - most can wait until business hours'
        ],
        scientificBasis: 'Research shows that constant connectivity increases stress hormones and disrupts sleep, while digital boundaries improve work-life balance and mental health.',
        commonMistakes: [
            'Checking work emails "just quickly" during personal time',
            'Not communicating boundaries to others',
            'Making exceptions that become the new norm',
            'Feeling guilty about not being constantly available'
        ],
        progressTracking: [
            'Track hours spent on work-related activities outside work time',
            'Monitor sleep quality improvements',
            'Rate stress levels during personal time',
            'Note improvements in relationships and personal activities'
        ],
        tags: ['digital-boundaries', 'work-life-balance', 'stress', 'technology', 'moderate']
    },

    {
        id: 'time-management-wellbeing',
        title: 'Time Management for Mental Well-being',
        description: 'Organize your time in ways that reduce stress and create space for self-care and relationships.',
        type: LifestyleTipType.WORK_LIFE_BALANCE,
        category: [LifestyleTipCategory.STRESS, LifestyleTipCategory.BURNOUT, LifestyleTipCategory.GENERAL_WELLBEING],
        difficulty: LifestyleTipDifficulty.MODERATE,
        timeToImplement: '2-3 weeks',
        benefits: [
            'Reduced feeling of being overwhelmed',
            'More time for self-care and relationships',
            'Increased sense of control',
            'Better work performance',
            'Improved life satisfaction'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Audit how you currently spend time',
                timeframe: 'Track for 3-7 days',
                tip: 'Use a time-tracking app or simple journal'
            },
            {
                stepNumber: 2,
                action: 'Identify your peak energy hours',
                tip: 'Schedule most important tasks during these times'
            },
            {
                stepNumber: 3,
                action: 'Use the 80/20 rule',
                tip: 'Focus on the 20% of tasks that create 80% of results'
            },
            {
                stepNumber: 4,
                action: 'Block time for important activities',
                tip: 'Schedule self-care, exercise, and relationships like appointments'
            },
            {
                stepNumber: 5,
                action: 'Learn to say no strategically',
                tip: 'Decline commitments that don\'t align with your priorities'
            },
            {
                stepNumber: 6,
                action: 'Batch similar tasks together',
                tip: 'Group emails, phone calls, or errands to improve efficiency'
            },
            {
                stepNumber: 7,
                action: 'Build in buffer time',
                tip: 'Add 15-25% extra time to estimates to reduce stress'
            }
        ],
        tips: [
            'Perfect time management doesn\'t exist - aim for "good enough"',
            'Regularly review and adjust your system',
            'Don\'t over-schedule - leave room for spontaneity',
            'Remember that rest and downtime are productive too'
        ],
        scientificBasis: 'Effective time management reduces cortisol levels, improves decision-making, and increases overall life satisfaction and mental health.',
        commonMistakes: [
            'Trying to optimize every minute of the day',
            'Not accounting for unexpected interruptions',
            'Focusing on being busy rather than being effective',
            'Not scheduling time for rest and recovery'
        ],
        progressTracking: [
            'Monitor stress levels throughout the day',
            'Track completion of important vs. urgent tasks',
            'Note time spent on self-care activities',
            'Rate overall life satisfaction weekly'
        ],
        relatedTips: ['digital-boundaries'],
        tags: ['time-management', 'productivity', 'stress', 'priorities', 'moderate']
    },

    {
        id: 'burnout-prevention',
        title: 'Preventing and Recovering from Burnout',
        description: 'Recognize early signs of burnout and implement strategies to prevent or recover from it.',
        type: LifestyleTipType.WORK_LIFE_BALANCE,
        category: [LifestyleTipCategory.BURNOUT, LifestyleTipCategory.STRESS, LifestyleTipCategory.GENERAL_WELLBEING],
        difficulty: LifestyleTipDifficulty.CHALLENGING,
        timeToImplement: '1-6 months',
        benefits: [
            'Increased energy and motivation',
            'Better job satisfaction',
            'Improved physical health',
            'Enhanced creativity and problem-solving',
            'Stronger relationships'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Recognize burnout warning signs',
                tip: 'Chronic exhaustion, cynicism, reduced performance, physical symptoms'
            },
            {
                stepNumber: 2,
                action: 'Assess your workload and responsibilities',
                tip: 'Identify what can be delegated, eliminated, or streamlined'
            },
            {
                stepNumber: 3,
                action: 'Prioritize recovery activities',
                tip: 'Sleep, exercise, hobbies, and social connections are non-negotiable'
            },
            {
                stepNumber: 4,
                action: 'Set realistic expectations',
                tip: 'Lower the bar temporarily while you recover'
            },
            {
                stepNumber: 5,
                action: 'Seek support from others',
                tip: 'Talk to supervisors, colleagues, friends, or mental health professionals'
            },
            {
                stepNumber: 6,
                action: 'Rediscover your "why"',
                tip: 'Reconnect with the meaning and purpose in your work'
            },
            {
                stepNumber: 7,
                action: 'Make sustainable changes',
                tip: 'Address root causes, not just symptoms'
            }
        ],
        tips: [
            'Burnout recovery takes time - be patient with yourself',
            'Small, consistent changes are more effective than dramatic overhauls',
            'Don\'t wait until you\'re completely burned out to take action',
            'Consider professional help if burnout is severe'
        ],
        scientificBasis: 'Burnout is recognized by WHO as an occupational phenomenon. Research shows that addressing workload, control, and social support are key to prevention and recovery.',
        commonMistakes: [
            'Ignoring early warning signs',
            'Trying to push through burnout with willpower alone',
            'Not addressing underlying causes',
            'Feeling guilty about needing recovery time'
        ],
        progressTracking: [
            'Monitor energy levels daily',
            'Track engagement and motivation at work',
            'Note physical symptoms (headaches, sleep issues)',
            'Rate overall job satisfaction monthly'
        ],
        relatedTips: ['digital-boundaries', 'time-management-wellbeing'],
        tags: ['burnout', 'recovery', 'work-stress', 'energy', 'challenging']
    }
];