import { SupportGroup, SuccessStory, CommunityChallenge } from '../models/community.model';

export const SUPPORT_GROUPS: SupportGroup[] = [
    {
        id: 'depression-support',
        name: 'Depression Support Circle',
        description: 'A safe space for those dealing with depression to share experiences and support each other.',
        category: 'depression',
        memberCount: 127,
        isActive: true,
        moderator: 'Dr. Sarah M.',
        meetingSchedule: 'Tuesdays & Thursdays, 7:00 PM EST',
        tags: ['depression', 'mood', 'support', 'therapy'],
        createdAt: new Date('2024-01-15'),
        lastActivity: new Date('2024-12-21')
    },
    {
        id: 'anxiety-warriors',
        name: 'Anxiety Warriors',
        description: 'Empowering individuals to overcome anxiety through shared strategies and mutual support.',
        category: 'anxiety',
        memberCount: 89,
        isActive: true,
        moderator: 'Licensed Counselor Mike R.',
        meetingSchedule: 'Mondays & Wednesdays, 6:30 PM EST',
        tags: ['anxiety', 'panic', 'coping', 'mindfulness'],
        createdAt: new Date('2024-02-01'),
        lastActivity: new Date('2024-12-20')
    },
    {
        id: 'stress-management',
        name: 'Stress Management Hub',
        description: 'Learn and practice effective stress management techniques with peers.',
        category: 'stress',
        memberCount: 156,
        isActive: true,
        moderator: 'Wellness Coach Lisa T.',
        meetingSchedule: 'Daily check-ins, Weekly sessions Sundays 5:00 PM EST',
        tags: ['stress', 'burnout', 'workplace', 'balance'],
        createdAt: new Date('2024-01-20'),
        lastActivity: new Date('2024-12-22')
    },
    {
        id: 'general-wellness',
        name: 'General Wellness Community',
        description: 'A welcoming space for anyone looking to improve their mental health and wellbeing.',
        category: 'general',
        memberCount: 203,
        isActive: true,
        moderator: 'Community Team',
        meetingSchedule: 'Open discussions daily, Featured topics Fridays 7:00 PM EST',
        tags: ['wellness', 'general', 'support', 'community'],
        createdAt: new Date('2024-01-10'),
        lastActivity: new Date('2024-12-22')
    },
    {
        id: 'addiction-recovery',
        name: 'Recovery Journey',
        description: 'Supporting each other through addiction recovery with understanding and hope.',
        category: 'addiction',
        memberCount: 74,
        isActive: true,
        moderator: 'Recovery Specialist John D.',
        meetingSchedule: 'Daily check-ins, Group sessions Tuesdays & Saturdays 8:00 PM EST',
        tags: ['addiction', 'recovery', 'sobriety', 'support'],
        createdAt: new Date('2024-02-10'),
        lastActivity: new Date('2024-12-21')
    },
    {
        id: 'grief-support',
        name: 'Healing Hearts',
        description: 'A compassionate community for those navigating grief and loss.',
        category: 'grief',
        memberCount: 45,
        isActive: true,
        moderator: 'Grief Counselor Maria S.',
        meetingSchedule: 'Thursdays 7:30 PM EST, Memorial sharing Sundays 6:00 PM EST',
        tags: ['grief', 'loss', 'healing', 'memorial'],
        createdAt: new Date('2024-03-01'),
        lastActivity: new Date('2024-12-19')
    }
];

export const SUCCESS_STORIES: SuccessStory[] = [
    {
        id: 'story-1',
        title: 'From Panic Attacks to Peace: My 6-Month Journey',
        content: 'Six months ago, I couldn\'t leave my house without having a panic attack. Today, I gave a presentation at work and felt confident. The breathing exercises and community support made all the difference. To anyone struggling - you\'re not alone, and recovery is possible.',
        category: 'recovery',
        tags: ['anxiety', 'panic attacks', 'breathing exercises', 'workplace'],
        upvotes: 127,
        isAnonymous: true,
        authorPseudonym: 'BreatheEasy23',
        submittedAt: new Date('2024-12-15'),
        isVerified: true,
        inspirationLevel: 'intermediate'
    },
    {
        id: 'story-2',
        title: 'Breaking the Cycle: How I Overcame Depression',
        content: 'After years of struggling with depression, I finally found hope through this community. The daily check-ins, peer support, and professional guidance helped me build healthy habits. I\'m now 3 months into consistent self-care and feeling more like myself again.',
        category: 'milestone',
        tags: ['depression', 'self-care', 'community', 'habits'],
        upvotes: 89,
        isAnonymous: true,
        authorPseudonym: 'SunriseHope',
        submittedAt: new Date('2024-12-10'),
        isVerified: true,
        inspirationLevel: 'advanced'
    },
    {
        id: 'story-3',
        title: 'Small Steps, Big Changes: My Stress Management Success',
        content: 'I used to be overwhelmed by work stress daily. Through the stress management group, I learned to set boundaries and practice mindfulness. It took time, but now I handle challenges with much more calm and clarity.',
        category: 'breakthrough',
        tags: ['stress', 'work', 'boundaries', 'mindfulness'],
        upvotes: 156,
        isAnonymous: true,
        authorPseudonym: 'CalmMind',
        submittedAt: new Date('2024-12-08'),
        isVerified: true,
        inspirationLevel: 'beginner'
    },
    {
        id: 'story-4',
        title: 'Finding My Voice: Social Anxiety Recovery',
        content: 'Social situations used to terrify me. With help from my peer buddy and gradual exposure exercises, I\'ve made real friends and even started dating. The community challenges pushed me out of my comfort zone in the best way.',
        category: 'relationship',
        tags: ['social anxiety', 'relationships', 'peer support', 'challenges'],
        upvotes: 203,
        isAnonymous: true,
        authorPseudonym: 'SocialButterfly',
        submittedAt: new Date('2024-12-05'),
        isVerified: true,
        inspirationLevel: 'intermediate'
    }
];

export const COMMUNITY_CHALLENGES: CommunityChallenge[] = [
    {
        id: 'mindful-december',
        title: 'Mindful December',
        description: 'Practice mindfulness daily throughout December. Track your meditation, breathing exercises, and mindful moments.',
        type: 'monthly',
        category: 'mindfulness',
        startDate: new Date('2024-12-01'),
        endDate: new Date('2024-12-31'),
        participants: 234,
        goals: [
            {
                id: 'daily-meditation',
                description: 'Meditate for at least 10 minutes',
                targetValue: 31,
                unit: 'days',
                isCompleted: false
            },
            {
                id: 'breathing-exercises',
                description: 'Complete breathing exercises',
                targetValue: 20,
                unit: 'sessions',
                isCompleted: false
            }
        ],
        rewards: ['Mindfulness Master Badge', 'December Completion Certificate'],
        difficulty: 'medium',
        isActive: true
    },
    {
        id: 'gratitude-week',
        title: 'Gratitude Week Challenge',
        description: 'Share three things you\'re grateful for each day and spread positivity in the community.',
        type: 'weekly',
        category: 'self-care',
        startDate: new Date('2024-12-16'),
        endDate: new Date('2024-12-22'),
        participants: 156,
        goals: [
            {
                id: 'daily-gratitude',
                description: 'Share daily gratitude',
                targetValue: 7,
                unit: 'posts',
                isCompleted: false
            },
            {
                id: 'encourage-others',
                description: 'Encourage other participants',
                targetValue: 5,
                unit: 'interactions',
                isCompleted: false
            }
        ],
        rewards: ['Gratitude Guardian Badge', 'Community Supporter Recognition'],
        difficulty: 'easy',
        isActive: true
    },
    {
        id: 'movement-monday',
        title: 'Movement Monday',
        description: 'Start each week with physical activity to boost mood and energy.',
        type: 'weekly',
        category: 'exercise',
        startDate: new Date('2024-12-02'),
        endDate: new Date('2024-12-30'),
        participants: 89,
        goals: [
            {
                id: 'weekly-exercise',
                description: 'Complete physical activity',
                targetValue: 4,
                unit: 'sessions',
                isCompleted: false
            },
            {
                id: 'share-progress',
                description: 'Share your movement wins',
                targetValue: 3,
                unit: 'posts',
                isCompleted: false
            }
        ],
        rewards: ['Movement Motivator Badge', 'Fitness Journey Certificate'],
        difficulty: 'medium',
        isActive: true
    }
];

export const COMMUNITY_CATEGORIES = [
    { id: 'depression', name: 'Depression Support', icon: '🌱', color: '#10B981' },
    { id: 'anxiety', name: 'Anxiety Management', icon: '🦋', color: '#3B82F6' },
    { id: 'stress', name: 'Stress Relief', icon: '🧘', color: '#8B5CF6' },
    { id: 'general', name: 'General Wellness', icon: '💚', color: '#06B6D4' },
    { id: 'addiction', name: 'Recovery Support', icon: '🌟', color: '#F59E0B' },
    { id: 'grief', name: 'Grief & Loss', icon: '🕊️', color: '#EF4444' },
    { id: 'relationships', name: 'Relationships', icon: '🤝', color: '#EC4899' }
];