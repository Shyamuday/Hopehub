import { Article, ArticleCategory, ArticleType } from '../models/article.model';
import { DEPRESSION_ARTICLES } from './articles/depression-articles';
import { ANXIETY_ARTICLES } from './articles/anxiety-articles';
import { STRESS_ARTICLES } from './articles/stress-articles';
import { SELF_CARE_ARTICLES } from './articles/self-care-articles';
import { BREAKUP_ARTICLES } from './articles/breakup-articles';

// Combine all articles
export const ALL_ARTICLES: Article[] = [
    ...DEPRESSION_ARTICLES,
    ...ANXIETY_ARTICLES,
    ...STRESS_ARTICLES,
    ...SELF_CARE_ARTICLES,
    ...BREAKUP_ARTICLES
];

// Group articles by category for easy filtering
export const ARTICLES_BY_CATEGORY = {
    [ArticleCategory.DEPRESSION]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.DEPRESSION)
    ),
    [ArticleCategory.ANXIETY]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.ANXIETY)
    ),
    [ArticleCategory.STRESS]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.STRESS)
    ),
    [ArticleCategory.RELATIONSHIPS]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.RELATIONSHIPS)
    ),
    [ArticleCategory.WORK_LIFE_BALANCE]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.WORK_LIFE_BALANCE)
    ),
    [ArticleCategory.SELF_CARE]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.SELF_CARE)
    ),
    [ArticleCategory.TRAUMA]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.TRAUMA)
    ),
    [ArticleCategory.ADDICTION]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.ADDICTION)
    ),
    [ArticleCategory.SLEEP]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.SLEEP)
    ),
    [ArticleCategory.NUTRITION]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.NUTRITION)
    ),
    [ArticleCategory.GENERAL_WELLBEING]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.GENERAL_WELLBEING)
    ),
    [ArticleCategory.BREAKUP]: ALL_ARTICLES.filter(article =>
        article.category.includes(ArticleCategory.BREAKUP)
    )
};

// Group articles by type
export const ARTICLES_BY_TYPE = {
    [ArticleType.EDUCATIONAL]: ALL_ARTICLES.filter(article => article.type === ArticleType.EDUCATIONAL),
    [ArticleType.SELF_HELP]: ALL_ARTICLES.filter(article => article.type === ArticleType.SELF_HELP),
    [ArticleType.RESEARCH]: ALL_ARTICLES.filter(article => article.type === ArticleType.RESEARCH),
    [ArticleType.PERSONAL_STORY]: ALL_ARTICLES.filter(article => article.type === ArticleType.PERSONAL_STORY),
    [ArticleType.GUIDE]: ALL_ARTICLES.filter(article => article.type === ArticleType.GUIDE),
    [ArticleType.NEWS]: ALL_ARTICLES.filter(article => article.type === ArticleType.NEWS)
};

// Helper functions
export function getArticleById(id: string): Article | undefined {
    return ALL_ARTICLES.find(article => article.id === id);
}

export function getArticlesByIds(ids: string[]): Article[] {
    return ids.map(id => getArticleById(id)).filter(article => article !== undefined) as Article[];
}

export function getArticlesByCategory(category: ArticleCategory): Article[] {
    return ARTICLES_BY_CATEGORY[category] || [];
}

export function getArticlesByType(type: ArticleType): Article[] {
    return ARTICLES_BY_TYPE[type] || [];
}

export function searchArticles(query: string): Article[] {
    const searchTerm = query.toLowerCase();
    return ALL_ARTICLES.filter(article =>
        article.title.toLowerCase().includes(searchTerm) ||
        article.description.toLowerCase().includes(searchTerm) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
        article.introduction.toLowerCase().includes(searchTerm) ||
        article.keyTakeaways.some(takeaway => takeaway.toLowerCase().includes(searchTerm))
    );
}

export function getRelatedArticles(articleId: string): Article[] {
    const article = getArticleById(articleId);
    if (!article || !article.relatedArticles) return [];

    return getArticlesByIds(article.relatedArticles);
}

export function getFeaturedArticles(): Article[] {
    return ALL_ARTICLES.filter(article => article.isFeatured);
}

export function getPopularArticles(): Article[] {
    return ALL_ARTICLES.filter(article => article.isPopular);
}

export function getRecentArticles(limit: number = 5): Article[] {
    return ALL_ARTICLES
        .sort((a, b) => b.publishedDate.getTime() - a.publishedDate.getTime())
        .slice(0, limit);
}

// Statistics and metadata
export const ARTICLE_STATS = {
    totalArticles: ALL_ARTICLES.length,
    articlesByCategory: Object.entries(ARTICLES_BY_CATEGORY).map(([category, articles]) => ({
        category,
        count: articles.length
    })),
    articlesByType: Object.entries(ARTICLES_BY_TYPE).map(([type, articles]) => ({
        type,
        count: articles.length
    })),
    featuredCount: getFeaturedArticles().length,
    popularCount: getPopularArticles().length
};