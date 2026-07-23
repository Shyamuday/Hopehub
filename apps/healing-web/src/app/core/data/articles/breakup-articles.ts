import {
  Article,
  ArticleType,
  ArticleCategory,
  ArticleDifficulty,
} from '../../models/article.model';

export const BREAKUP_ARTICLES: Article[] = [
  {
    id: 'navigating-breakup-recovery',
    title: 'Navigating Breakup Recovery: A Complete Guide',
    subtitle: 'Understanding the healing process and practical steps to move forward',
    description:
      'A comprehensive guide to understanding breakup recovery, including the stages of grief, common challenges, and evidence-based strategies for healing and growth.',
    type: ArticleType.GUIDE,
    category: [ArticleCategory.BREAKUP, ArticleCategory.RELATIONSHIPS, ArticleCategory.SELF_CARE],
    difficulty: ArticleDifficulty.INTERMEDIATE,
    readingTime: '12 min read',
    author: 'Hope Hub Editorial Team',
    publishedDate: new Date('2024-01-15'),
    tags: ['breakup', 'recovery', 'healing', 'grief', 'relationships', 'self-care'],
    introduction:
      "Breakups are among life's most challenging experiences. The end of a significant relationship can trigger intense emotions, disrupt daily life, and challenge our sense of identity. However, with understanding, self-compassion, and the right strategies, recovery is not only possible but can lead to profound personal growth. This guide provides a roadmap for navigating the complex journey of breakup recovery.",
    sections: [
      {
        heading: 'Understanding the Breakup Recovery Process',
        content:
          "Breakup recovery is not linear. It's a journey with ups and downs, progress and setbacks. Understanding this process can help you be more patient and compassionate with yourself.",
        type: 'text',
      },
      {
        heading: 'The Stages of Breakup Recovery',
        content: "While everyone's experience is unique, many people go through similar stages:",
        type: 'list',
        items: [
          'Shock and Denial: Initial disbelief that the relationship is over',
          'Pain and Anger: Intense emotional pain, anger, or resentment',
          'Bargaining: Thoughts of "what if" and attempts to fix things',
          'Depression: Deep sadness, loneliness, and withdrawal',
          'Acceptance: Coming to terms with the end and beginning to move forward',
          'Growth: Finding meaning, learning, and rebuilding',
        ],
      },
      {
        heading: 'Common Challenges During Recovery',
        content: 'Understanding common challenges can help you prepare and respond effectively:',
        type: 'list',
        items: [
          'Rumination: Replaying memories and "what went wrong"',
          "Social Media Stalking: Checking your ex's profiles repeatedly",
          'Self-Blame: Taking excessive responsibility for the breakup',
          "Identity Loss: Feeling like you've lost part of yourself",
          'Social Isolation: Withdrawing from friends and activities',
          "Comparison: Comparing yourself to others or your ex's new life",
        ],
      },
      {
        heading: 'Evidence-Based Recovery Strategies',
        content: 'Research shows several effective strategies for breakup recovery:',
        type: 'text',
      },
      {
        heading: '1. Establish No-Contact Boundaries',
        content:
          'Limiting or eliminating contact with your ex-partner is crucial for healing. This includes:',
        type: 'list',
        items: [
          'Unfollowing or muting on social media',
          'Removing or storing away reminders',
          'Avoiding places you frequented together (temporarily)',
          'Not checking their profiles or asking mutual friends about them',
          'Setting clear boundaries if contact is necessary (e.g., shared children)',
        ],
      },
      {
        heading: '2. Process Your Emotions',
        content:
          'Allow yourself to feel your emotions without judgment. Suppressing feelings can prolong the healing process.',
        type: 'tip',
      },
      {
        heading: '3. Rebuild Your Identity',
        content:
          'Rediscover who you are outside of the relationship. Engage in activities that define you as an individual.',
        type: 'text',
      },
      {
        heading: '4. Strengthen Your Support Network',
        content:
          'Reconnect with friends and family. Consider joining support groups or seeking professional counseling.',
        type: 'text',
      },
      {
        heading: '5. Practice Self-Compassion',
        content:
          'Be kind to yourself. Treat yourself as you would treat a good friend going through the same experience.',
        type: 'tip',
      },
      {
        heading: 'When to Seek Professional Help',
        content: 'Consider seeking professional support if you experience:',
        type: 'list',
        items: [
          'Persistent depression or anxiety lasting more than a few weeks',
          'Thoughts of self-harm or suicide',
          'Inability to function in daily life',
          'Excessive substance use',
          'Severe social isolation',
          'Inability to move forward after several months',
        ],
      },
      {
        heading: 'The Path Forward',
        content:
          'Recovery takes time, but with patience, self-compassion, and the right support, you will heal and grow. Remember that healing is not about forgetting the relationship, but about integrating the experience into your life story and moving forward with wisdom and strength.',
        type: 'text',
      },
    ],
    keyTakeaways: [
      'Breakup recovery is a process that takes time and varies for each person',
      'Establishing boundaries and limiting contact is essential for healing',
      'Processing emotions and practicing self-compassion are key to recovery',
      'Rebuilding your identity and support network helps you move forward',
      'Professional help is available and beneficial when needed',
    ],
    conclusion:
      "Breakup recovery is a journey of healing, growth, and rediscovery. While the pain is real and valid, it's also temporary. With the right strategies, support, and self-compassion, you can not only recover but emerge stronger, wiser, and more resilient. Remember: you are not alone, and healing is possible.",
    sources: [
      'Fisher, H. E. (2006). Broken heart: The nature and future of romantic love. Columbia University Press.',
      'Sbarra, D. A., & Emery, R. E. (2005). The emotional sequelae of nonmarital relationship dissolution. Personal Relationships, 12(2), 213-232.',
      'Winch, G. (2013). How to fix a broken heart. TED Books.',
      'Kübler-Ross, E., & Kessler, D. (2005). On grief and grieving: Finding the meaning of grief through the five stages of loss. Simon & Schuster.',
    ],
  },
  {
    id: 'rebuilding-life-after-breakup',
    title: 'Rebuilding Your Life After a Relationship Ends',
    subtitle: 'Practical steps to create a fulfilling life post-breakup',
    description:
      'Learn how to rebuild your life after a breakup, including rediscovering your identity, setting new goals, and creating a life that reflects your values and aspirations.',
    type: ArticleType.SELF_HELP,
    category: [ArticleCategory.BREAKUP, ArticleCategory.SELF_CARE],
    difficulty: ArticleDifficulty.INTERMEDIATE,
    readingTime: '10 min read',
    author: 'Dr. Michael Thompson, Relationship Counselor',
    publishedDate: new Date('2024-02-01'),
    tags: ['breakup', 'rebuilding', 'identity', 'growth', 'self-discovery', 'life-goals'],
    introduction:
      "After a breakup, life can feel empty and directionless. The future you envisioned with your partner is gone, and you may feel lost about who you are and where you're going. However, this period of transition also presents an opportunity to rebuild your life in a way that truly reflects who you are and what you want. This article provides practical steps for rebuilding your life after a relationship ends.",
    sections: [
      {
        heading: 'Rediscovering Your Identity',
        content:
          'One of the most important steps in rebuilding is rediscovering who you are as an individual. Relationships can sometimes cause us to lose sight of our own identity.',
        type: 'text',
      },
      {
        heading: 'Questions to Ask Yourself',
        content: 'Take time to reflect on these questions:',
        type: 'list',
        items: [
          'What are my core values and beliefs?',
          'What activities did I enjoy before the relationship?',
          'What are my personal goals and dreams?',
          'What makes me feel most like myself?',
          'What would I do if I had no limitations?',
        ],
      },
      {
        heading: 'Setting New Goals',
        content:
          'Creating new goals gives you direction and purpose. Start with small, achievable goals and gradually work toward larger aspirations.',
        type: 'text',
      },
      {
        heading: 'Rebuilding Your Social Circle',
        content:
          'Reconnect with old friends and make new connections. Join clubs, classes, or groups that align with your interests.',
        type: 'tip',
      },
      {
        heading: 'Creating New Routines',
        content:
          'Establish new daily and weekly routines that support your well-being and reflect your current life situation.',
        type: 'text',
      },
      {
        heading: 'Embracing New Opportunities',
        content:
          'A breakup can be an opportunity to try new things, take risks, and step outside your comfort zone. What have you always wanted to do but never did?',
        type: 'tip',
      },
    ],
    keyTakeaways: [
      'Rebuilding your life is an opportunity for growth and self-discovery',
      'Rediscovering your identity is essential for moving forward',
      'Setting new goals provides direction and purpose',
      'Rebuilding your social circle supports healing and growth',
      'Embracing new opportunities can lead to unexpected fulfillment',
    ],
    conclusion:
      "Rebuilding your life after a breakup is a journey of self-discovery and growth. While it may feel overwhelming at first, taking small steps each day will lead you to a life that is authentically yours. Remember: the end of a relationship is not the end of your story—it's the beginning of a new chapter.",
    sources: [
      'Neff, K. (2011). Self-Compassion: The Proven Power of Being Kind to Yourself. William Morrow Paperbacks.',
      'Brown, B. (2012). Daring Greatly: How the Courage to Be Vulnerable Transforms the Way We Live, Love, Parent, and Lead. Gotham Books.',
    ],
  },
  {
    id: 'understanding-grief-after-breakup',
    title: 'Understanding Grief After a Breakup',
    subtitle: 'Why breakups hurt and how to navigate the grieving process',
    description:
      'Explore the science behind breakup grief, understand why it hurts so much, and learn healthy ways to process and move through the grieving process.',
    type: ArticleType.EDUCATIONAL,
    category: [ArticleCategory.BREAKUP, ArticleCategory.RELATIONSHIPS],
    difficulty: ArticleDifficulty.BEGINNER,
    readingTime: '8 min read',
    author: 'Dr. Lisa Park, Clinical Psychologist',
    publishedDate: new Date('2024-01-20'),
    tags: ['breakup', 'grief', 'emotions', 'healing', 'psychology', 'relationships'],
    introduction:
      'Breakups can feel devastating, and the grief that follows is very real. Understanding why breakups hurt so much and how the grieving process works can help you navigate this difficult time with more compassion and clarity. This article explores the science of breakup grief and provides guidance for healthy processing.',
    sections: [
      {
        heading: 'Why Breakups Hurt So Much',
        content:
          'Research shows that the brain processes romantic rejection similarly to physical pain. The same neural pathways that respond to physical injury are activated during emotional pain.',
        type: 'text',
      },
      {
        heading: 'The Science of Breakup Pain',
        content: 'Several factors contribute to the intensity of breakup pain:',
        type: 'list',
        items: [
          'Attachment bonds: Your brain formed strong neural connections with your partner',
          'Loss of identity: You may have built your sense of self around the relationship',
          "Future loss: You're grieving not just the past, but the future you envisioned",
          'Social rejection: Breakups can trigger primal fears of abandonment',
          'Habit disruption: Daily routines and habits are suddenly gone',
        ],
      },
      {
        heading: 'The Grieving Process',
        content:
          'Grief after a breakup follows a similar pattern to other types of loss, though the timeline varies for each person.',
        type: 'text',
      },
      {
        heading: 'Healthy Grieving Strategies',
        content: 'Allow yourself to grieve in healthy ways:',
        type: 'list',
        items: [
          'Express your emotions through writing, art, or talking',
          'Create rituals to honor the relationship and its end',
          'Allow yourself to feel the full range of emotions',
          'Seek support from friends, family, or professionals',
          'Be patient with yourself—grief takes time',
        ],
      },
      {
        heading: 'When Grief Becomes Problematic',
        content: 'While grief is normal, seek help if you experience:',
        type: 'warning',
      },
      {
        heading: 'Signs to Watch For',
        content:
          "Prolonged grief that doesn't improve, inability to function, or thoughts of self-harm require professional support.",
        type: 'text',
      },
    ],
    keyTakeaways: [
      'Breakup grief is real and valid—your pain is legitimate',
      'The brain processes emotional pain similarly to physical pain',
      'Grieving is a necessary part of the healing process',
      'Healthy grieving involves expressing emotions and seeking support',
      'Professional help is available if grief becomes overwhelming',
    ],
    conclusion:
      "Understanding the science and psychology of breakup grief can help you be more compassionate with yourself during this difficult time. Remember that grief is not a sign of weakness—it's a sign that you loved and that you're human. With time, support, and healthy processing, the pain will lessen, and you will heal.",
    sources: [
      'Kross, E., Berman, M. G., Mischel, W., Smith, E. E., & Wager, T. D. (2011). Social rejection shares somatosensory representations with physical pain. Proceedings of the National Academy of Sciences, 108(15), 6270-6275.',
      'Fisher, H. E., Brown, L. L., Aron, A., Strong, G., & Mashek, D. (2010). Reward, addiction, and emotion regulation systems associated with rejection in love. Journal of Neurophysiology, 104(1), 51-60.',
    ],
  },
];
