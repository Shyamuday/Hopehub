import { LifestyleTip, LifestyleTipType, LifestyleTipCategory, LifestyleTipDifficulty } from '../../models/lifestyle-tip.model';

export const BREAKUP_TIPS: LifestyleTip[] = [
    {
        id: 'no-contact-rule',
        title: 'The No-Contact Rule: Why and How',
        description: 'Learn why limiting or eliminating contact with your ex-partner is crucial for healing and how to implement it effectively.',
        type: LifestyleTipType.SOCIAL,
        category: [LifestyleTipCategory.BREAKUP, LifestyleTipCategory.RELATIONSHIP],
        difficulty: LifestyleTipDifficulty.CHALLENGING,
        timeToImplement: 'Immediate',
        benefits: [
            'Allows emotional space for healing',
            'Prevents reopening emotional wounds',
            'Reduces rumination and obsessive thinking',
            'Helps establish new boundaries',
            'Facilitates moving forward'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Unfollow or mute your ex on all social media platforms',
                timeframe: 'Day 1',
                tip: 'You can always refollow later if you become friends, but for now, create distance'
            },
            {
                stepNumber: 2,
                action: 'Remove or store away physical reminders (photos, gifts, mementos)',
                timeframe: 'Week 1',
                tip: 'You don\'t have to throw everything away - just put it out of sight for now'
            },
            {
                stepNumber: 3,
                action: 'Delete or archive old text messages and emails',
                timeframe: 'Week 1',
                tip: 'Consider backing them up if you want to keep them, but remove them from daily access'
            },
            {
                stepNumber: 4,
                action: 'Avoid places you frequently visited together (temporarily)',
                timeframe: 'First month',
                tip: 'This is temporary - you can return to these places once you\'ve healed'
            },
            {
                stepNumber: 5,
                action: 'Ask mutual friends not to share updates about your ex',
                timeframe: 'Ongoing',
                tip: 'Be clear but kind: "I appreciate you, but I need space from news about [ex\'s name]"'
            },
            {
                stepNumber: 6,
                action: 'Block or restrict if contact becomes problematic',
                timeframe: 'As needed',
                tip: 'This is about protecting your healing, not being mean'
            },
            {
                stepNumber: 7,
                action: 'Set a timeframe for no-contact (e.g., 30, 60, or 90 days)',
                timeframe: 'Ongoing',
                tip: 'Having an end date can make it feel more manageable'
            }
        ],
        tips: [
            'No-contact is not about punishment - it\'s about healing',
            'If you have children together, maintain necessary contact but keep it minimal and business-like',
            'It\'s okay to break no-contact if you genuinely need closure, but do it intentionally',
            'Use this time to focus on yourself, not to wait for them to come back',
            'Consider telling your ex about your no-contact decision if appropriate'
        ],
        scientificBasis: 'Research shows that continued contact with an ex-partner can maintain attachment bonds and delay emotional recovery. No-contact periods allow the brain to rewire neural pathways associated with the relationship, facilitating healing and moving forward.',
        commonMistakes: [
            'Breaking no-contact when feeling lonely or nostalgic',
            'Using social media to "check in" on your ex',
            'Asking mutual friends to report on your ex\'s activities',
            'Breaking no-contact to "just be friends" too soon',
            'Not being clear with friends about your boundaries'
        ],
        progressTracking: [
            'Track days of successful no-contact',
            'Note how your urge to contact changes over time',
            'Monitor your emotional state - does it improve with distance?',
            'Celebrate milestones (1 week, 1 month, etc.)'
        ],
        relatedTips: ['social-media-boundaries-breakup', 'rebuilding-social-circle'],
        tags: ['breakup', 'no-contact', 'boundaries', 'healing', 'social', 'recovery']
    },
    {
        id: 'social-media-boundaries-breakup',
        title: 'Social Media Boundaries After Breakup',
        description: 'How to manage social media to protect your healing and avoid triggers after a breakup.',
        type: LifestyleTipType.SOCIAL,
        category: [LifestyleTipCategory.BREAKUP, LifestyleTipCategory.GENERAL_WELLBEING],
        difficulty: LifestyleTipDifficulty.MODERATE,
        timeToImplement: 'Immediate',
        benefits: [
            'Reduces emotional triggers',
            'Prevents obsessive checking',
            'Protects your mental health',
            'Allows focus on your own life',
            'Reduces comparison and jealousy'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Unfollow or mute your ex on all platforms',
                timeframe: 'Day 1',
                tip: 'Muting allows you to stay connected without seeing their posts'
            },
            {
                stepNumber: 2,
                action: 'Remove or hide relationship status and photos',
                timeframe: 'Week 1',
                tip: 'You can archive photos instead of deleting if you want to keep them'
            },
            {
                stepNumber: 3,
                action: 'Limit time on social media, especially during vulnerable times',
                timeframe: 'Ongoing',
                tip: 'Use app timers or schedule specific times for social media'
            },
            {
                stepNumber: 4,
                action: 'Unfollow or mute mutual friends who frequently post about your ex',
                timeframe: 'As needed',
                tip: 'This is temporary - you can refollow later'
            },
            {
                stepNumber: 5,
                action: 'Consider a social media break or detox',
                timeframe: 'First month',
                tip: 'Even a week-long break can significantly help your healing'
            },
            {
                stepNumber: 6,
                action: 'Curate your feed to include positive, uplifting content',
                timeframe: 'Ongoing',
                tip: 'Follow accounts that inspire and support your healing journey'
            },
            {
                stepNumber: 7,
                action: 'Avoid posting about your breakup or your ex',
                timeframe: 'Ongoing',
                tip: 'Process your feelings privately or with close friends, not publicly'
            }
        ],
        tips: [
            'Remember: social media shows curated highlights, not reality',
            'If you find yourself checking their profile, take a break',
            'Consider using browser extensions to block specific sites temporarily',
            'Focus on your own content and growth, not theirs',
            'It\'s okay to take a complete social media break if needed'
        ],
        scientificBasis: 'Studies show that social media use after breakups can increase depression, anxiety, and rumination. Limiting exposure to your ex\'s online presence reduces triggers and supports emotional recovery.',
        commonMistakes: [
            'Stalking their profile "just to check"',
            'Comparing your life to their posts',
            'Posting passive-aggressive content',
            'Checking their new partner\'s profile',
            'Not setting clear boundaries with yourself'
        ],
        progressTracking: [
            'Track days without checking their profile',
            'Monitor your emotional state before and after social media use',
            'Note triggers and adjust your boundaries accordingly',
            'Celebrate progress in reducing social media dependency'
        ],
        relatedTips: ['no-contact-rule', 'rebuilding-social-circle'],
        tags: ['breakup', 'social-media', 'boundaries', 'healing', 'self-care', 'recovery']
    },
    {
        id: 'rebuilding-social-circle',
        title: 'Rebuilding Your Social Circle After a Breakup',
        description: 'Strategies for reconnecting with old friends and building new social connections after a relationship ends.',
        type: LifestyleTipType.SOCIAL,
        category: [LifestyleTipCategory.BREAKUP, LifestyleTipCategory.RELATIONSHIP],
        difficulty: LifestyleTipDifficulty.MODERATE,
        timeToImplement: '2-4 weeks',
        benefits: [
            'Reduces loneliness and isolation',
            'Provides emotional support',
            'Helps rebuild identity outside the relationship',
            'Creates new opportunities and experiences',
            'Improves overall well-being'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Reach out to friends you may have lost touch with during the relationship',
                timeframe: 'Week 1-2',
                tip: 'Be honest: "I\'ve been going through a breakup and would love to reconnect"'
            },
            {
                stepNumber: 2,
                action: 'Join clubs, classes, or groups aligned with your interests',
                timeframe: 'Week 2-4',
                tip: 'Consider book clubs, fitness classes, hobby groups, or volunteer organizations'
            },
            {
                stepNumber: 3,
                action: 'Attend social events, even if you don\'t feel like it',
                timeframe: 'Ongoing',
                tip: 'Start with low-pressure events and gradually increase social activities'
            },
            {
                stepNumber: 4,
                action: 'Consider joining a breakup support group or online community',
                timeframe: 'Week 1-2',
                tip: 'Connecting with others going through similar experiences can be very helpful'
            },
            {
                stepNumber: 5,
                action: 'Make plans with friends and commit to them',
                timeframe: 'Ongoing',
                tip: 'Schedule regular social activities to maintain connections'
            },
            {
                stepNumber: 6,
                action: 'Be open to new friendships',
                timeframe: 'Ongoing',
                tip: 'Don\'t limit yourself to only old friends - new people bring new perspectives'
            },
            {
                stepNumber: 7,
                action: 'Practice being vulnerable and sharing your experience',
                timeframe: 'Ongoing',
                tip: 'Opening up helps deepen connections and receive support'
            }
        ],
        tips: [
            'Quality over quantity - focus on meaningful connections',
            'Don\'t rush into new romantic relationships to fill the void',
            'Be patient - rebuilding social connections takes time',
            'It\'s okay to say no to social events if you need alone time',
            'Consider therapy or counseling as part of your support network'
        ],
        scientificBasis: 'Strong social support is one of the most important factors in recovery from relationship loss. Research shows that people with robust social networks recover faster and experience less depression after breakups.',
        commonMistakes: [
            'Isolating yourself completely',
            'Relying solely on one person for support',
            'Rushing into new relationships to avoid being alone',
            'Comparing new friendships to the lost relationship',
            'Not making an effort to maintain connections'
        ],
        progressTracking: [
            'Track number of social interactions per week',
            'Note improvements in feelings of loneliness',
            'Monitor your comfort level in social situations',
            'Celebrate new connections and reconnections'
        ],
        relatedTips: ['no-contact-rule', 'building-support-network'],
        tags: ['breakup', 'social', 'friends', 'support', 'recovery', 'community']
    }
];

