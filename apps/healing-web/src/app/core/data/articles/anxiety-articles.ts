import { Article, ArticleType, ArticleCategory, ArticleDifficulty } from '../../models/article.model';

export const ANXIETY_ARTICLES: Article[] = [
    {
        id: 'understanding-anxiety-disorders',
        title: 'Understanding Anxiety Disorders: Types, Symptoms, and Treatment',
        subtitle: 'A comprehensive guide to anxiety disorders and their management',
        description: 'Learn about different types of anxiety disorders, their symptoms, and effective treatment approaches.',
        type: ArticleType.EDUCATIONAL,
        category: [ArticleCategory.ANXIETY, ArticleCategory.GENERAL_WELLBEING],
        difficulty: ArticleDifficulty.BEGINNER,
        readingTime: '10 min read',
        author: 'Dr. Amanda Foster, Clinical Psychologist',
        publishedDate: new Date('2024-01-20'),
        lastUpdated: new Date('2024-11-15'),
        tags: ['anxiety', 'anxiety-disorders', 'mental-health', 'symptoms', 'treatment'],

        introduction: 'Anxiety is a normal human emotion, but when it becomes excessive and interferes with daily life, it may be an anxiety disorder. Understanding the different types of anxiety disorders and their symptoms is the first step toward getting help.',

        sections: [
            {
                heading: 'What Are Anxiety Disorders?',
                content: 'Anxiety disorders are a group of mental health conditions characterized by excessive fear, worry, and related behavioral disturbances. They are the most common mental health disorders, affecting millions of people worldwide.',
                type: 'text'
            },
            {
                heading: 'Common Types of Anxiety Disorders',
                content: 'There are several types of anxiety disorders, each with unique characteristics:',
                type: 'text'
            },
            {
                heading: 'Generalized Anxiety Disorder (GAD)',
                content: 'Characterized by persistent, excessive worry about various aspects of life, even when there\'s little reason to worry.',
                type: 'text'
            },
            {
                heading: 'Panic Disorder',
                content: 'Involves recurrent panic attacks - sudden episodes of intense fear accompanied by physical symptoms like rapid heartbeat, sweating, and shortness of breath.',
                type: 'text'
            },
            {
                heading: 'Social Anxiety Disorder',
                content: 'Intense fear of social situations due to concerns about being judged, embarrassed, or humiliated by others.',
                type: 'text'
            },
            {
                heading: 'Specific Phobias',
                content: 'Intense, irrational fear of specific objects or situations, such as heights, flying, or spiders.',
                type: 'text'
            },
            {
                heading: 'Common Symptoms of Anxiety',
                content: 'Anxiety can manifest in various ways:',
                type: 'list',
                items: [
                    'Excessive worry or fear',
                    'Restlessness or feeling on edge',
                    'Difficulty concentrating',
                    'Irritability',
                    'Muscle tension',
                    'Sleep problems',
                    'Rapid heartbeat',
                    'Sweating or trembling',
                    'Shortness of breath',
                    'Avoidance of certain situations'
                ]
            },
            {
                heading: 'When to Seek Help',
                content: 'Consider seeking professional help if anxiety is interfering with your work, relationships, or daily activities, or if you\'re avoiding situations due to anxiety.',
                type: 'tip'
            },
            {
                heading: 'Treatment Options',
                content: 'Anxiety disorders are highly treatable. Common treatments include cognitive-behavioral therapy (CBT), exposure therapy, medication, and lifestyle changes.',
                type: 'text'
            }
        ],

        keyTakeaways: [
            'Anxiety disorders are common and treatable mental health conditions',
            'There are several types of anxiety disorders with different symptoms',
            'Physical symptoms are common and normal parts of anxiety',
            'Professional help is available and effective',
            'Early intervention leads to better outcomes'
        ],

        conclusion: 'If you\'re struggling with anxiety, remember that you\'re not alone and help is available. Anxiety disorders are among the most treatable mental health conditions, and with proper support, you can learn to manage your symptoms and live a fulfilling life.',

        sources: [
            'American Psychiatric Association. (2022). Diagnostic and Statistical Manual of Mental Disorders (5th ed.)',
            'Anxiety and Depression Association of America. (2023). Facts & Statistics.',
            'National Institute of Mental Health. (2023). Anxiety Disorders.'
        ],

        relatedArticles: ['managing-panic-attacks', 'social-anxiety-tips'],
        isPopular: true,
        isFeatured: true
    },

    {
        id: 'managing-panic-attacks',
        title: 'How to Manage Panic Attacks: Immediate and Long-term Strategies',
        subtitle: 'Practical techniques for dealing with panic attacks',
        description: 'Learn effective strategies to manage panic attacks in the moment and prevent them from controlling your life.',
        type: ArticleType.SELF_HELP,
        category: [ArticleCategory.ANXIETY],
        difficulty: ArticleDifficulty.INTERMEDIATE,
        readingTime: '8 min read',
        author: 'Dr. James Wilson, Anxiety Specialist',
        publishedDate: new Date('2024-02-15'),
        tags: ['panic-attacks', 'anxiety', 'coping-strategies', 'breathing', 'grounding'],

        introduction: 'Panic attacks can be terrifying experiences, but understanding what they are and having strategies to manage them can significantly reduce their impact on your life.',

        sections: [
            {
                heading: 'What Is a Panic Attack?',
                content: 'A panic attack is a sudden episode of intense fear that triggers severe physical reactions when there\'s no real danger or apparent cause.',
                type: 'text'
            },
            {
                heading: 'Common Panic Attack Symptoms',
                content: 'Panic attacks can include:',
                type: 'list',
                items: [
                    'Rapid, pounding heart rate',
                    'Sweating',
                    'Trembling or shaking',
                    'Shortness of breath',
                    'Feelings of choking',
                    'Chest pain',
                    'Nausea',
                    'Dizziness',
                    'Fear of losing control or dying',
                    'Numbness or tingling'
                ]
            },
            {
                heading: 'Immediate Strategies During a Panic Attack',
                content: 'When you feel a panic attack starting, try these techniques:',
                type: 'text'
            },
            {
                heading: '1. Deep Breathing Exercise',
                content: 'Practice the 4-7-8 breathing technique:',
                type: 'list',
                items: [
                    'Inhale through your nose for 4 counts',
                    'Hold your breath for 7 counts',
                    'Exhale through your mouth for 8 counts',
                    'Repeat 3-4 times'
                ]
            },
            {
                heading: '2. Grounding Techniques',
                content: 'Use the 5-4-3-2-1 method to stay present:',
                type: 'list',
                items: [
                    '5 things you can see',
                    '4 things you can touch',
                    '3 things you can hear',
                    '2 things you can smell',
                    '1 thing you can taste'
                ]
            },
            {
                heading: '3. Remind Yourself',
                content: 'Tell yourself: "This is a panic attack. It will pass. I am safe. This feeling is temporary."',
                type: 'tip'
            },
            {
                heading: 'Long-term Prevention Strategies',
                content: 'To reduce the frequency and intensity of panic attacks:',
                type: 'text'
            },
            {
                heading: 'Regular Exercise',
                content: 'Physical activity helps reduce overall anxiety levels and can prevent panic attacks.',
                type: 'text'
            },
            {
                heading: 'Avoid Triggers',
                content: 'Identify and limit caffeine, alcohol, and other substances that might trigger attacks.',
                type: 'text'
            },
            {
                heading: 'Practice Relaxation',
                content: 'Regular meditation, yoga, or progressive muscle relaxation can help manage overall anxiety.',
                type: 'text'
            },
            {
                heading: 'When to Seek Professional Help',
                content: 'If panic attacks are frequent, severe, or interfering with your life, professional treatment can be very effective.',
                type: 'warning'
            }
        ],

        keyTakeaways: [
            'Panic attacks are intense but temporary and not dangerous',
            'Breathing and grounding techniques can help during an attack',
            'Regular self-care can prevent future attacks',
            'Professional treatment is highly effective for panic disorder',
            'You can learn to manage and overcome panic attacks'
        ],

        conclusion: 'Remember, panic attacks feel overwhelming but they are manageable. With the right strategies and support, you can reduce their frequency and impact on your life.',

        relatedArticles: ['understanding-anxiety-disorders', 'breathing-exercises-anxiety']
    },

    {
        id: 'social-anxiety-tips',
        title: 'Overcoming Social Anxiety: Practical Tips for Social Situations',
        subtitle: 'Build confidence and manage social anxiety effectively',
        description: 'Learn practical strategies to manage social anxiety and feel more comfortable in social situations.',
        type: ArticleType.SELF_HELP,
        category: [ArticleCategory.ANXIETY, ArticleCategory.RELATIONSHIPS],
        difficulty: ArticleDifficulty.BEGINNER,
        readingTime: '7 min read',
        author: 'Dr. Rachel Green, Social Psychology Expert',
        publishedDate: new Date('2024-03-10'),
        tags: ['social-anxiety', 'confidence', 'social-skills', 'exposure-therapy'],

        introduction: 'Social anxiety can make everyday interactions feel overwhelming, but with the right strategies, you can build confidence and enjoy social connections.',

        sections: [
            {
                heading: 'Understanding Social Anxiety',
                content: 'Social anxiety involves intense fear of being judged, embarrassed, or rejected in social situations. It\'s more than just shyness - it can significantly impact daily life.',
                type: 'text'
            },
            {
                heading: 'Start Small',
                content: 'Begin with low-stakes social interactions like greeting a cashier or making small talk with a neighbor.',
                type: 'tip'
            },
            {
                heading: 'Prepare Conversation Topics',
                content: 'Having a few topics ready can reduce anxiety about awkward silences:',
                type: 'list',
                items: [
                    'Current events or local news',
                    'Hobbies or interests',
                    'Movies, books, or TV shows',
                    'Travel experiences',
                    'Work or school (general topics)'
                ]
            },
            {
                heading: 'Challenge Negative Thoughts',
                content: 'Question anxious thoughts: "What\'s the worst that could really happen?" Often, our fears are much worse than reality.',
                type: 'text'
            },
            {
                heading: 'Focus on Others',
                content: 'Shift attention away from yourself by asking questions and showing genuine interest in others. This reduces self-consciousness.',
                type: 'text'
            },
            {
                heading: 'Practice Self-Compassion',
                content: 'Be kind to yourself when social interactions don\'t go perfectly. Everyone has awkward moments.',
                type: 'text'
            },
            {
                heading: 'Gradual Exposure',
                content: 'Gradually expose yourself to increasingly challenging social situations. Start with what feels manageable and work your way up.',
                type: 'text'
            }
        ],

        keyTakeaways: [
            'Social anxiety is common and treatable',
            'Starting with small interactions builds confidence',
            'Preparation can reduce anxiety about social situations',
            'Focusing on others reduces self-consciousness',
            'Gradual exposure helps overcome avoidance patterns'
        ],

        conclusion: 'Overcoming social anxiety takes time and practice, but it\'s absolutely possible. Be patient with yourself and celebrate small victories along the way.',

        relatedArticles: ['understanding-anxiety-disorders', 'building-confidence']
    }
];