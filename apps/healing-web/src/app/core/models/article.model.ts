export enum ArticleType {
    EDUCATIONAL = 'Educational',
    SELF_HELP = 'Self-Help',
    RESEARCH = 'Research',
    PERSONAL_STORY = 'Personal Story',
    GUIDE = 'Guide',
    NEWS = 'News'
}

export enum ArticleCategory {
    DEPRESSION = 'Depression',
    ANXIETY = 'Anxiety',
    STRESS = 'Stress',
    RELATIONSHIPS = 'Relationships',
    BREAKUP = 'Breakup Recovery',
    WORK_LIFE_BALANCE = 'Work-Life Balance',
    SELF_CARE = 'Self-Care',
    TRAUMA = 'Trauma',
    ADDICTION = 'Addiction',
    SLEEP = 'Sleep',
    NUTRITION = 'Nutrition',
    GENERAL_WELLBEING = 'General Well-being'
}

export enum ArticleDifficulty {
    BEGINNER = 'Beginner',
    INTERMEDIATE = 'Intermediate',
    ADVANCED = 'Advanced'
}

export interface ArticleSection {
    heading: string;
    content: string;
    type?: 'text' | 'list' | 'quote' | 'tip' | 'warning';
    items?: string[]; // For list type
}

export interface Article {
    id: string;
    title: string;
    subtitle?: string;
    description: string;
    type: ArticleType;
    category: ArticleCategory[];
    difficulty: ArticleDifficulty;
    readingTime: string; // e.g., "5 min read"
    author: string;
    publishedDate: Date;
    lastUpdated?: Date;
    featuredImage?: string;
    tags: string[];

    // Content
    introduction: string;
    sections: ArticleSection[];
    keyTakeaways: string[];
    conclusion: string;

    // Metadata
    sources?: string[];
    relatedArticles?: string[]; // Article IDs
    isPopular?: boolean;
    isFeatured?: boolean;

    // SEO
    metaDescription?: string;
    keywords?: string[];
}

export interface ArticleRecommendation {
    assessmentType: string;
    scoreRange: { min: number; max: number };
    recommendedArticles: string[]; // Article IDs
    priority: number; // 1 = highest priority
}

export interface ArticleFilter {
    type?: ArticleType;
    category?: ArticleCategory;
    difficulty?: ArticleDifficulty;
    tags?: string[];
    searchQuery?: string;
}

export interface ReadingProgress {
    articleId: string;
    userId?: string;
    progress: number; // 0-100
    timeSpent: number; // in seconds
    completed: boolean;
    bookmarked: boolean;
    lastReadAt: Date;
}