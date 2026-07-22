import { Article, ArticleType, ArticleCategory, ArticleDifficulty } from '../../models/article.model';

export const SELF_CARE_ARTICLES: Article[] = [
    {
        id: 'self-care-basics-guide',
        title: 'Self-Care 101: Building a Sustainable Self-Care Routine',
        subtitle: 'Essential guide to creating lasting self-care habits',
        description: 'Learn how to build a personalized self-care routine that fits your lifestyle and supports your mental health.',
        type: ArticleType.GUIDE,
        category: [ArticleCategory.SELF_CARE, ArticleCategory.GENERAL_WELLBEING],
        difficulty: ArticleDifficulty.BEGINNER,
        readingTime: '12 min read',
        author: 'Dr. Maya Patel, Wellness Psychologist',
        publishedDate: new Date('2024-03-01'),
        tags: ['self-care', 'routine', 'mental-health', 'wellness', 'habits'],

        introduction: 'Self-care isn\'t selfish – it\'s essential for maintaining good mental health and overall well-being. This guide will help you understand what self-care really means and how to create a sustainable routine that works for your life.',

        sections: [
            {
                heading: 'What Is Self-Care?',
                content: 'Self-care is the practice of taking deliberate actions to care for your physical, mental, and emotional health. It\'s about maintaining your well-being, not just treating problems after they arise.',
                type: 'text'
            },
            {
                heading: 'The Four Dimensions of Self-Care',
                content: 'Effective self-care addresses multiple areas of your life:',
                type: 'text'
            },
            {
                heading: 'Physical Self-Care',
                content: 'Taking care of your body\'s needs:',
                type: 'list',
                items: [
                    'Regular exercise or movement',
                    'Adequate sleep (7-9 hours)',
                    'Nutritious eating',
                    'Regular medical check-ups',
                    'Personal hygiene and grooming',
                    'Relaxation and rest'
                ]
            },
            {
                heading: 'Emotional Self-Care',
                content: 'Managing and processing your emotions:',
                type: 'list',
                items: [
                    'Journaling or expressive writing',
                    'Therapy or counseling',
                    'Practicing self-compassion',
                    'Setting emotional boundaries',
                    'Engaging in activities that bring joy',
                    'Processing difficult emotions healthily'
                ]
            },
            {
                heading: 'Mental Self-Care',
                content: 'Keeping your mind sharp and reducing mental fatigue:',
                type: 'list',
                items: [
                    'Reading or learning new skills',
                    'Practicing mindfulness or meditation',
                    'Limiting negative media consumption',
                    'Engaging in creative activities',
                    'Taking breaks from work',
                    'Challenging negative thought patterns'
                ]
            },
            {
                heading: 'Social Self-Care',
                content: 'Nurturing your relationships and social connections:',
                type: 'list',
                items: [
                    'Spending time with supportive people',
                    'Setting healthy boundaries',
                    'Communicating your needs clearly',
                    'Participating in community activities',
                    'Seeking support when needed',
                    'Limiting time with toxic relationships'
                ]
            },
            {
                heading: 'Creating Your Self-Care Plan',
                content: 'Follow these steps to build a personalized self-care routine:',
                type: 'text'
            },
            {
                heading: 'Step 1: Assess Your Current State',
                content: 'Identify areas where you need more support. What aspects of your well-being need attention?',
                type: 'tip'
            },
            {
                heading: 'Step 2: Start Small',
                content: 'Choose 1-2 simple self-care activities you can realistically do regularly. Build consistency before adding more.',
                type: 'tip'
            },
            {
                heading: 'Step 3: Schedule It',
                content: 'Treat self-care like any other important appointment. Put it in your calendar and protect that time.',
                type: 'tip'
            },
            {
                heading: 'Step 4: Make It Enjoyable',
                content: 'Self-care should feel good, not like another chore. Choose activities you genuinely enjoy.',
                type: 'tip'
            },
            {
                heading: 'Common Self-Care Myths',
                content: 'Let\'s debunk some misconceptions about self-care:',
                type: 'text'
            },
            {
                heading: 'Myth: Self-care is selfish',
                content: 'FACT: Taking care of yourself enables you to better care for others. You can\'t pour from an empty cup.',
                type: 'text'
            },
            {
                heading: 'Myth: Self-care is expensive',
                content: 'FACT: Many effective self-care activities are free, like walking, deep breathing, or calling a friend.',
                type: 'text'
            },
            {
                heading: 'Myth: Self-care takes too much time',
                content: 'FACT: Even 5-10 minutes of self-care can make a difference. It\'s about consistency, not duration.',
                type: 'text'
            }
        ],

        keyTakeaways: [
            'Self-care is essential for mental health, not a luxury',
            'Effective self-care addresses physical, emotional, mental, and social needs',
            'Start small and build consistency before adding more activities',
            'Self-care should be scheduled and protected like any important commitment',
            'Many effective self-care practices are simple and free'
        ],

        conclusion: 'Remember, self-care is not a one-size-fits-all solution. What works for others might not work for you, and that\'s okay. The key is to experiment, find what feels good and sustainable for your lifestyle, and make it a regular part of your routine.',

        sources: [
            'American Psychological Association. (2023). The Importance of Self-Care.',
            'National Alliance on Mental Illness. (2023). Self-Care Strategies.',
            'World Health Organization. (2023). Mental Health and Well-being.'
        ],

        relatedArticles: ['building-healthy-boundaries', 'mindfulness-daily-life'],
        isPopular: true,
        isFeatured: true
    },

    {
        id: 'building-healthy-boundaries',
        title: 'Building Healthy Boundaries: A Guide to Protecting Your Well-being',
        subtitle: 'Learn to set and maintain boundaries that support your mental health',
        description: 'Discover how to establish healthy boundaries in relationships, work, and personal life to protect your well-being.',
        type: ArticleType.GUIDE,
        category: [ArticleCategory.SELF_CARE, ArticleCategory.RELATIONSHIPS],
        difficulty: ArticleDifficulty.INTERMEDIATE,
        readingTime: '10 min read',
        author: 'Dr. Jennifer Adams, Relationship Therapist',
        publishedDate: new Date('2024-03-15'),
        tags: ['boundaries', 'relationships', 'self-care', 'communication', 'well-being'],

        introduction: 'Healthy boundaries are essential for maintaining good mental health and positive relationships. They help you protect your energy, time, and emotional well-being while still maintaining meaningful connections with others.',

        sections: [
            {
                heading: 'What Are Healthy Boundaries?',
                content: 'Boundaries are guidelines that define how you want to be treated and what you\'re comfortable with in relationships. They\'re not walls that keep people out, but rather guidelines that help create healthy interactions.',
                type: 'text'
            },
            {
                heading: 'Types of Boundaries',
                content: 'There are several types of boundaries to consider:',
                type: 'text'
            },
            {
                heading: 'Physical Boundaries',
                content: 'Related to your body, personal space, and physical comfort. This includes who can touch you, how, and when.',
                type: 'text'
            },
            {
                heading: 'Emotional Boundaries',
                content: 'Protecting your emotional well-being by limiting how much you take on others\' emotions and problems.',
                type: 'text'
            },
            {
                heading: 'Time Boundaries',
                content: 'Managing how you spend your time and protecting time for yourself and your priorities.',
                type: 'text'
            },
            {
                heading: 'Digital Boundaries',
                content: 'Setting limits on technology use, social media, and digital communication.',
                type: 'text'
            },
            {
                heading: 'Signs You Need Better Boundaries',
                content: 'You might need to work on boundaries if you:',
                type: 'list',
                items: [
                    'Feel overwhelmed by others\' demands',
                    'Have difficulty saying no',
                    'Feel resentful in relationships',
                    'Take on others\' problems as your own',
                    'Feel exhausted after social interactions',
                    'Compromise your values to please others',
                    'Feel guilty when you prioritize yourself'
                ]
            },
            {
                heading: 'How to Set Healthy Boundaries',
                content: 'Follow these steps to establish better boundaries:',
                type: 'text'
            },
            {
                heading: '1. Identify Your Limits',
                content: 'Reflect on what makes you uncomfortable, stressed, or resentful. These feelings often indicate where boundaries are needed.',
                type: 'tip'
            },
            {
                heading: '2. Start Small',
                content: 'Begin with less challenging situations and people who are more likely to respect your boundaries.',
                type: 'tip'
            },
            {
                heading: '3. Be Clear and Direct',
                content: 'Use "I" statements to communicate your boundaries clearly: "I need some time to myself this evening."',
                type: 'tip'
            },
            {
                heading: '4. Be Consistent',
                content: 'Maintain your boundaries consistently. Mixed messages make it harder for others to respect your limits.',
                type: 'tip'
            },
            {
                heading: '5. Prepare for Pushback',
                content: 'Some people may resist your new boundaries. Stay firm and remember that their reaction is not your responsibility.',
                type: 'warning'
            }
        ],

        keyTakeaways: [
            'Boundaries are essential for healthy relationships and well-being',
            'Different types of boundaries protect different aspects of your life',
            'Setting boundaries is a skill that improves with practice',
            'It\'s normal to feel guilty at first when setting boundaries',
            'Healthy boundaries benefit both you and your relationships'
        ],

        conclusion: 'Setting healthy boundaries is an act of self-respect and self-care. It may feel uncomfortable at first, but with practice, it becomes easier and more natural. Remember, you have the right to protect your well-being.',

        relatedArticles: ['self-care-basics-guide', 'communication-skills-relationships']
    }
];