import {
  Article,
  ArticleType,
  ArticleCategory,
  ArticleDifficulty,
} from '../../models/article.model';

export const DEPRESSION_ARTICLES: Article[] = [
  {
    id: 'understanding-depression-basics',
    title: 'Understanding Depression: More Than Just Feeling Sad',
    subtitle: 'A comprehensive guide to recognizing and understanding depression',
    description:
      'Learn about the different types of depression, symptoms, and how it affects daily life.',
    type: ArticleType.EDUCATIONAL,
    category: [ArticleCategory.DEPRESSION, ArticleCategory.GENERAL_WELLBEING],
    difficulty: ArticleDifficulty.BEGINNER,
    readingTime: '8 min read',
    author: 'Hope Hub Editorial Team',
    publishedDate: new Date('2024-01-15'),
    lastUpdated: new Date('2024-12-01'),
    tags: ['depression', 'mental-health', 'symptoms', 'awareness', 'basics'],

    introduction:
      'Depression is one of the most common mental health conditions, affecting millions of people worldwide. Yet, it\'s often misunderstood as simply "feeling sad" or "being down." This comprehensive guide will help you understand what depression really is, its various forms, and how it impacts daily life.',

    sections: [
      {
        heading: 'What Is Depression?',
        content:
          "Depression is a serious mental health condition that affects how you feel, think, and handle daily activities. It's characterized by persistent feelings of sadness, hopelessness, and a lack of interest or pleasure in activities you once enjoyed.",
        type: 'text',
      },
      {
        heading: 'Common Symptoms of Depression',
        content:
          'Depression symptoms can vary from person to person, but here are the most common signs:',
        type: 'list',
        items: [
          'Persistent sad, anxious, or empty mood',
          'Loss of interest or pleasure in hobbies and activities',
          'Significant weight loss or gain',
          'Sleeping too much or inability to sleep',
          'Fatigue or loss of energy',
          'Feelings of worthlessness or excessive guilt',
          'Difficulty concentrating or making decisions',
          'Thoughts of death or suicide',
        ],
      },
      {
        heading: 'Types of Depression',
        content: "Depression isn't a one-size-fits-all condition. There are several types:",
        type: 'text',
      },
      {
        heading: 'Major Depressive Disorder',
        content:
          'The most common form, characterized by severe symptoms that interfere with daily life for at least two weeks.',
        type: 'text',
      },
      {
        heading: 'Persistent Depressive Disorder',
        content:
          'A chronic form of depression lasting for at least two years, with symptoms that may be less severe but longer-lasting.',
        type: 'text',
      },
      {
        heading: 'Seasonal Affective Disorder (SAD)',
        content:
          "Depression that occurs during specific seasons, typically fall and winter when there's less natural sunlight.",
        type: 'text',
      },
      {
        heading: 'Important Note',
        content:
          "If you're experiencing thoughts of self-harm or suicide, please reach out for help immediately. Contact a mental health professional, call a crisis hotline, or go to your nearest emergency room.",
        type: 'warning',
      },
      {
        heading: 'How Depression Affects Daily Life',
        content:
          'Depression can impact every aspect of your life, from work and relationships to physical health and self-care. Understanding these effects can help you recognize when you or someone you care about might need support.',
        type: 'text',
      },
      {
        heading: 'The Good News',
        content:
          'Depression is highly treatable. With proper support, therapy, and sometimes medication, most people with depression can recover and lead fulfilling lives.',
        type: 'tip',
      },
    ],

    keyTakeaways: [
      'Depression is a serious medical condition, not a personal weakness',
      'Symptoms vary but typically include persistent sadness and loss of interest',
      'There are different types of depression with varying symptoms and duration',
      'Depression affects all aspects of life but is highly treatable',
      'Professional help is available and effective',
    ],

    conclusion:
      'Understanding depression is the first step toward healing. If you recognize these symptoms in yourself or others, remember that help is available. Depression is not a character flaw or something you can simply "snap out of" – it\'s a medical condition that responds well to treatment. Reach out to a mental health professional, trusted friend, or family member for support.',

    sources: [
      'American Psychiatric Association. (2022). Diagnostic and Statistical Manual of Mental Disorders (5th ed.)',
      'National Institute of Mental Health. (2023). Depression Basics.',
      'World Health Organization. (2023). Depression Fact Sheet.',
    ],

    relatedArticles: ['coping-strategies-depression', 'depression-myths-facts'],
    isPopular: true,
    isFeatured: true,

    metaDescription:
      "Learn about depression symptoms, types, and effects on daily life. A comprehensive beginner's guide to understanding depression beyond just feeling sad.",
    keywords: [
      'depression',
      'mental health',
      'symptoms',
      'types of depression',
      'major depressive disorder',
    ],
  },

  {
    id: 'coping-strategies-depression',
    title: '10 Evidence-Based Coping Strategies for Depression',
    subtitle: 'Practical techniques to manage depression symptoms',
    description:
      'Discover proven strategies to help manage depression symptoms and improve your daily well-being.',
    type: ArticleType.SELF_HELP,
    category: [ArticleCategory.DEPRESSION, ArticleCategory.SELF_CARE],
    difficulty: ArticleDifficulty.BEGINNER,
    readingTime: '12 min read',
    author: 'Hope Hub Editorial Team',
    publishedDate: new Date('2024-02-10'),
    tags: ['depression', 'coping-strategies', 'self-help', 'mental-health', 'recovery'],

    introduction:
      'Living with depression can feel overwhelming, but there are evidence-based strategies that can help you manage symptoms and improve your quality of life. These techniques, backed by research and clinical practice, can be powerful tools in your recovery journey.',

    sections: [
      {
        heading: '1. Establish a Daily Routine',
        content:
          'Depression can make days feel chaotic and unstructured. Creating a simple, consistent routine can provide stability and a sense of accomplishment.',
        type: 'tip',
      },
      {
        heading: 'How to Start:',
        content: 'Begin with basic activities and gradually add more:',
        type: 'list',
        items: [
          'Set a consistent wake-up time',
          'Include one self-care activity (shower, brush teeth)',
          'Plan one small task or goal for the day',
          'Schedule meals at regular times',
          'Set a bedtime routine',
        ],
      },
      {
        heading: '2. Practice Mindfulness and Meditation',
        content:
          'Mindfulness helps you stay present and can reduce negative thought patterns associated with depression.',
        type: 'text',
      },
      {
        heading: 'Simple Mindfulness Exercise:',
        content: 'Try the 5-4-3-2-1 grounding technique:',
        type: 'list',
        items: [
          '5 things you can see',
          '4 things you can touch',
          '3 things you can hear',
          '2 things you can smell',
          '1 thing you can taste',
        ],
      },
      {
        heading: '3. Stay Physically Active',
        content:
          'Exercise is as effective as medication for some people with depression. It releases endorphins and improves mood naturally.',
        type: 'text',
      },
      {
        heading: '4. Connect with Others',
        content:
          'Depression often makes us want to isolate, but social connection is crucial for recovery. Start small – even a text message to a friend counts.',
        type: 'text',
      },
      {
        heading: '5. Challenge Negative Thoughts',
        content:
          'Depression often involves negative thinking patterns. Learning to identify and challenge these thoughts can be very helpful.',
        type: 'text',
      },
      {
        heading: 'Thought Challenging Questions:',
        content: 'Ask yourself:',
        type: 'list',
        items: [
          'Is this thought realistic?',
          'What evidence supports or contradicts this thought?',
          'What would I tell a friend having this thought?',
          'Is there a more balanced way to look at this situation?',
        ],
      },
      {
        heading: '6. Prioritize Sleep Hygiene',
        content:
          'Depression and sleep problems often go hand in hand. Good sleep hygiene can significantly improve mood and energy levels.',
        type: 'text',
      },
      {
        heading: '7. Engage in Pleasant Activities',
        content:
          "Even when you don't feel like it, engaging in activities you used to enjoy can help lift your mood over time.",
        type: 'text',
      },
      {
        heading: '8. Practice Gratitude',
        content:
          "While it may feel forced at first, regularly acknowledging things you're grateful for can gradually shift your perspective.",
        type: 'text',
      },
      {
        heading: '9. Limit Alcohol and Avoid Drugs',
        content:
          "Substances can worsen depression symptoms and interfere with treatment. If you're struggling with substance use, seek professional help.",
        type: 'warning',
      },
      {
        heading: '10. Seek Professional Help',
        content:
          "These strategies are helpful, but they're not a replacement for professional treatment. Therapy and medication can be life-changing for many people with depression.",
        type: 'tip',
      },
    ],

    keyTakeaways: [
      'Small, consistent actions can make a big difference in managing depression',
      'Routine and structure provide stability during difficult times',
      'Physical activity and social connection are powerful mood boosters',
      'Challenging negative thoughts takes practice but becomes easier over time',
      'Professional help is often necessary and highly effective',
    ],

    conclusion:
      'Remember, recovery from depression is a journey, not a destination. These strategies work best when used consistently and in combination with professional support. Be patient with yourself – healing takes time, and every small step forward is progress worth celebrating.',

    sources: [
      'Beck, A. T. (2021). Cognitive Therapy of Depression.',
      'Cuijpers, P. et al. (2023). Exercise therapy for depression. Cochrane Reviews.',
      'Mindfulness-Based Cognitive Therapy Collaborative. (2023). MBCT Research Updates.',
    ],

    relatedArticles: ['understanding-depression-basics', 'building-support-network'],
    isPopular: true,
  },

  {
    id: 'depression-myths-facts',
    title: 'Depression Myths vs. Facts: Separating Truth from Fiction',
    subtitle: 'Debunking common misconceptions about depression',
    description:
      'Learn the truth about depression by exploring and debunking the most common myths and misconceptions.',
    type: ArticleType.EDUCATIONAL,
    category: [ArticleCategory.DEPRESSION, ArticleCategory.GENERAL_WELLBEING],
    difficulty: ArticleDifficulty.BEGINNER,
    readingTime: '6 min read',
    author: 'Dr. Lisa Rodriguez, Psychiatrist',
    publishedDate: new Date('2024-03-05'),
    tags: ['depression', 'myths', 'facts', 'stigma', 'awareness'],

    introduction:
      "Despite increased awareness about mental health, many myths about depression persist. These misconceptions can prevent people from seeking help and contribute to stigma. Let's separate fact from fiction.",

    sections: [
      {
        heading: 'Myth 1: Depression is just sadness or weakness',
        content:
          'FACT: Depression is a serious medical condition involving changes in brain chemistry, structure, and function. It\'s not a character flaw or something you can simply "get over."',
        type: 'text',
      },
      {
        heading: 'Myth 2: Antidepressants are addictive',
        content:
          'FACT: Antidepressants are not addictive. While some people may experience withdrawal symptoms when stopping, this is different from addiction.',
        type: 'text',
      },
      {
        heading: 'Myth 3: Therapy is just talking about your problems',
        content:
          "FACT: Modern therapy uses evidence-based techniques to change thought patterns, behaviors, and coping strategies. It's an active, skill-building process.",
        type: 'text',
      },
      {
        heading: 'Myth 4: Depression only affects women',
        content:
          'FACT: While women are diagnosed with depression more often, men also experience depression. Men may show different symptoms like anger, irritability, or substance use.',
        type: 'text',
      },
      {
        heading: 'Myth 5: You need a reason to be depressed',
        content:
          'FACT: Depression can occur without any obvious trigger. Brain chemistry, genetics, and other factors can cause depression even when life seems fine.',
        type: 'text',
      },
      {
        heading: 'The Importance of Accurate Information',
        content:
          'Understanding the facts about depression helps reduce stigma and encourages people to seek the help they need and deserve.',
        type: 'tip',
      },
    ],

    keyTakeaways: [
      'Depression is a medical condition, not a personal weakness',
      'Treatment options are safe and effective',
      'Depression affects people of all genders and backgrounds',
      "You don't need a specific reason to experience depression",
      'Accurate information helps reduce stigma and promotes help-seeking',
    ],

    conclusion:
      'By understanding the facts about depression, we can create a more supportive environment for those who are struggling. If you or someone you know is dealing with depression, remember that help is available and recovery is possible.',

    relatedArticles: ['understanding-depression-basics', 'seeking-help-depression'],
  },
];
