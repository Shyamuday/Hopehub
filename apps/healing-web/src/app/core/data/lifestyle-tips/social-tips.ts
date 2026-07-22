import { LifestyleTip, LifestyleTipType, LifestyleTipCategory, LifestyleTipDifficulty } from '../../models/lifestyle-tip.model';

export const SOCIAL_TIPS: LifestyleTip[] = [
    {
        id: 'building-support-network',
        title: 'Building a Strong Support Network',
        description: 'Create and maintain meaningful relationships that provide emotional support and connection.',
        type: LifestyleTipType.SOCIAL,
        category: [LifestyleTipCategory.DEPRESSION, LifestyleTipCategory.ANXIETY, LifestyleTipCategory.GENERAL_WELLBEING],
        difficulty: LifestyleTipDifficulty.MODERATE,
        timeToImplement: '1-3 months',
        benefits: [
            'Reduced feelings of loneliness',
            'Better emotional resilience',
            'Improved self-esteem',
            'Enhanced coping abilities',
            'Greater life satisfaction'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Assess your current relationships',
                tip: 'Identify supportive vs. draining relationships in your life'
            },
            {
                stepNumber: 2,
                action: 'Reach out to existing friends',
                timeframe: 'Contact 1-2 people per week',
                tip: 'A simple text or call can rekindle connections'
            },
            {
                stepNumber: 3,
                action: 'Join groups based on your interests',
                tip: 'Clubs, classes, volunteer organizations, or online communities'
            },
            {
                stepNumber: 4,
                action: 'Practice active listening',
                tip: 'Show genuine interest in others to build deeper connections'
            },
            {
                stepNumber: 5,
                action: 'Be vulnerable and authentic',
                tip: 'Share your true self to create meaningful bonds'
            },
            {
                stepNumber: 6,
                action: 'Offer support to others',
                tip: 'Being helpful strengthens relationships and builds community'
            },
            {
                stepNumber: 7,
                action: 'Schedule regular social activities',
                timeframe: 'At least one social interaction per week',
                tip: 'Make it a priority, not an afterthought'
            }
        ],
        tips: [
            'Quality over quantity - a few close friends are better than many acquaintances',
            'Be patient - building trust and connection takes time',
            'Don\'t wait for others to reach out first',
            'Consider professional help if social anxiety is severe'
        ],
        scientificBasis: 'Strong social connections are linked to better mental health, increased longevity, and improved resilience to stress and depression.',
        commonMistakes: [
            'Expecting instant deep friendships',
            'Only reaching out when you need something',
            'Avoiding social situations due to anxiety',
            'Not maintaining existing relationships'
        ],
        progressTracking: [
            'Track frequency of social interactions',
            'Rate quality of connections (1-10)',
            'Monitor feelings of loneliness',
            'Note improvements in mood after social activities'
        ],
        tags: ['social', 'relationships', 'support', 'connection', 'moderate']
    },

    {
        id: 'healthy-boundaries',
        title: 'Setting Healthy Boundaries in Relationships',
        description: 'Learn to establish and maintain boundaries that protect your mental health and well-being.',
        type: LifestyleTipType.SOCIAL,
        category: [LifestyleTipCategory.STRESS, LifestyleTipCategory.RELATIONSHIP, LifestyleTipCategory.BURNOUT],
        difficulty: LifestyleTipDifficulty.CHALLENGING,
        timeToImplement: '2-6 months',
        benefits: [
            'Reduced stress and resentment',
            'Improved self-respect',
            'Better relationship quality',
            'Increased emotional energy',
            'Greater sense of control'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Identify your values and limits',
                tip: 'What behaviors, requests, or situations make you uncomfortable?'
            },
            {
                stepNumber: 2,
                action: 'Recognize boundary violations',
                tip: 'Notice when you feel resentful, overwhelmed, or taken advantage of'
            },
            {
                stepNumber: 3,
                action: 'Start with small boundaries',
                tip: 'Practice saying no to minor requests before tackling major issues'
            },
            {
                stepNumber: 4,
                action: 'Communicate boundaries clearly',
                tip: 'Use "I" statements: "I need..." or "I\'m not comfortable with..."'
            },
            {
                stepNumber: 5,
                action: 'Be consistent with enforcement',
                tip: 'Follow through on consequences when boundaries are crossed'
            },
            {
                stepNumber: 6,
                action: 'Prepare for pushback',
                tip: 'Some people may resist your new boundaries - stay firm'
            },
            {
                stepNumber: 7,
                action: 'Practice self-compassion',
                tip: 'It\'s okay to feel guilty at first - this is normal'
            }
        ],
        tips: [
            'Boundaries are not walls - they\'re guidelines for healthy interaction',
            'You don\'t need to justify your boundaries to others',
            'Start with people who are more likely to respect your boundaries',
            'Remember: saying no to others means saying yes to yourself'
        ],
        scientificBasis: 'Healthy boundaries are essential for mental health, reducing stress, preventing burnout, and maintaining healthy relationships.',
        commonMistakes: [
            'Setting boundaries only when angry or overwhelmed',
            'Not being clear about what the boundary is',
            'Feeling guilty and backing down',
            'Expecting others to automatically respect new boundaries'
        ],
        progressTracking: [
            'Track instances of boundary setting',
            'Monitor stress levels in relationships',
            'Note improvements in self-respect',
            'Record successful boundary maintenance'
        ],
        relatedTips: ['building-support-network'],
        tags: ['boundaries', 'relationships', 'self-respect', 'stress', 'challenging']
    },

    {
        id: 'social-anxiety-management',
        title: 'Managing Social Anxiety in Daily Life',
        description: 'Practical strategies to reduce social anxiety and increase comfort in social situations.',
        type: LifestyleTipType.SOCIAL,
        category: [LifestyleTipCategory.ANXIETY, LifestyleTipCategory.GENERAL_WELLBEING],
        difficulty: LifestyleTipDifficulty.MODERATE,
        timeToImplement: '1-2 months',
        benefits: [
            'Increased social confidence',
            'Reduced avoidance behaviors',
            'Better social connections',
            'Improved self-esteem',
            'Greater life opportunities'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Start with low-stakes social interactions',
                tip: 'Cashiers, neighbors, or online communities'
            },
            {
                stepNumber: 2,
                action: 'Practice deep breathing before social events',
                timeframe: '5 minutes before entering social situations',
                tip: 'Calms the nervous system and reduces physical anxiety symptoms'
            },
            {
                stepNumber: 3,
                action: 'Prepare conversation topics in advance',
                tip: 'Have 3-5 topics ready to reduce worry about awkward silences'
            },
            {
                stepNumber: 4,
                action: 'Focus on others rather than yourself',
                tip: 'Ask questions about others to shift attention away from self-consciousness'
            },
            {
                stepNumber: 5,
                action: 'Challenge negative thoughts',
                tip: 'Question catastrophic thinking: "What\'s the worst that could really happen?"'
            },
            {
                stepNumber: 6,
                action: 'Gradually increase social exposure',
                tip: 'Slowly work up to more challenging social situations'
            },
            {
                stepNumber: 7,
                action: 'Celebrate small victories',
                tip: 'Acknowledge progress, even if interactions don\'t go perfectly'
            }
        ],
        tips: [
            'Most people are focused on themselves, not judging you',
            'Imperfect social interactions are normal and okay',
            'Practice self-compassion when social situations don\'t go as planned',
            'Consider therapy if social anxiety significantly impacts your life'
        ],
        scientificBasis: 'Gradual exposure therapy and cognitive restructuring are evidence-based treatments for social anxiety disorder.',
        commonMistakes: [
            'Avoiding all social situations (increases anxiety over time)',
            'Setting unrealistic expectations for social performance',
            'Focusing too much on what others might think',
            'Not recognizing and celebrating progress'
        ],
        progressTracking: [
            'Track social situations attended',
            'Rate anxiety levels before and after social events',
            'Note successful social interactions',
            'Monitor avoidance behaviors'
        ],
        relatedTips: ['building-support-network'],
        tags: ['social-anxiety', 'confidence', 'exposure', 'anxiety', 'moderate']
    }
];