import { Component, OnInit, Inject, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SEOService } from '../../../core/services';
import {
  Article,
  ArticleType,
  ArticleCategory,
  ArticleDifficulty
} from '../../../core/models/article.model';
import {
  ALL_ARTICLES,
  ARTICLES_BY_CATEGORY,
  ARTICLES_BY_TYPE,
  getArticlesByIds,
  getArticlesByCategory,
  searchArticles,
  getRelatedArticles,
  getFeaturedArticles,
  getPopularArticles
} from '../../../core/data/article-configs';
import { getArticleRecommendations } from '../../../core/data/article-recommendations';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [FormsModule, RouterModule, DatePipe],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.scss'
})
export class ArticlesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private seoService = inject(SEOService);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Signal-based state
  allArticles = signal<Article[]>(ALL_ARTICLES);
  filteredArticles = signal<Article[]>(ALL_ARTICLES);
  recommendedArticles = signal<Article[]>([]);
  featuredArticles = signal<Article[]>([]);
  relatedArticles = signal<Article[]>([]);

  categories = signal<ArticleCategory[]>(Object.values(ArticleCategory));
  types = signal<ArticleType[]>(Object.values(ArticleType));

  selectedArticle = signal<Article | null>(null);
  currentFilter = signal<string>('all');
  searchQuery = signal<string>('');

  assessmentInfo = signal<{
    type: string;
    score: number;
    level: string;
  } | null>(null);

  constructor() {
    // Check for recommended articles from assessment results
    this.route.queryParams
      .pipe(takeUntilDestroyed())
      .subscribe((params: { [key: string]: any }) => {
        if (params['recommended']) {
          const recommendedIds = params['recommended'].split(',');
          this.recommendedArticles.set(getArticlesByIds(recommendedIds));

          if (params['assessment'] && params['score'] && params['level']) {
            this.assessmentInfo.set({
              type: params['assessment'],
              score: parseInt(params['score']),
              level: params['level']
            });
          }
        }

        // Check for category filter
        if (params['category']) {
          const category = params['category'] as ArticleCategory;
          if (this.categories().includes(category)) {
            this.setFilter('category', category);
          }
        }

        // Check for specific article
        if (params['article']) {
          const article = this.allArticles().find(a => a.id === params['article']);
          if (article) {
            this.selectArticle(article);
          }
        }
      });
  }

  ngOnInit() {
    this.filteredArticles.set(this.allArticles());
    this.featuredArticles.set(getFeaturedArticles());
  }

  setFilter(type: string, value?: string) {
    if (type === 'all') {
      this.currentFilter.set('all');
      this.filteredArticles.set(this.allArticles());
    } else if (type === 'category' && value) {
      this.currentFilter.set(`category:${value}`);
      this.filteredArticles.set(getArticlesByCategory(value as ArticleCategory));
    } else if (type === 'type' && value) {
      this.currentFilter.set(`type:${value}`);
      this.filteredArticles.set(this.allArticles().filter(article => article.type === value));
    }

    // Apply search if active
    if (this.searchQuery()) {
      this.onSearch();
    }
  }

  onSearch() {
    const query = this.searchQuery();
    if (!query.trim()) {
      // Reset to current filter
      const filter = this.currentFilter();
      if (filter === 'all') {
        this.filteredArticles.set(this.allArticles());
      } else if (filter.startsWith('category:')) {
        const category = filter.split(':')[1] as ArticleCategory;
        this.filteredArticles.set(getArticlesByCategory(category));
      } else if (filter.startsWith('type:')) {
        const type = filter.split(':')[1];
        this.filteredArticles.set(this.allArticles().filter(article => article.type === type));
      }
    } else {
      // Search within current filter
      const searchResults = searchArticles(query);
      const filter = this.currentFilter();

      if (filter === 'all') {
        this.filteredArticles.set(searchResults);
      } else if (filter.startsWith('category:')) {
        const category = filter.split(':')[1] as ArticleCategory;
        this.filteredArticles.set(searchResults.filter(article => article.category.includes(category)));
      } else if (filter.startsWith('type:')) {
        const type = filter.split(':')[1];
        this.filteredArticles.set(searchResults.filter(article => article.type === type));
      }
    }
  }

  selectArticle(article: Article) {
    this.selectedArticle.set(article);
    this.relatedArticles.set(getRelatedArticles(article.id));

    // Update SEO for article page
    this.seoService.updateSEO({
      title: `${article.title} - Healing Hub`,
      description: article.description || article.introduction,
      keywords: article.keywords || article.tags,
      type: 'article',
      author: article.author,
      publishedTime: article.publishedDate.toISOString(),
      modifiedTime: article.publishedDate.toISOString(),
      section: article.category[0],
      tags: article.tags
    });

    // Add article structured data
    this.seoService.addArticleStructuredData({
      headline: article.title,
      description: article.description || article.introduction,
      image: article.featuredImage,
      author: article.author,
      datePublished: article.publishedDate.toISOString(),
      dateModified: article.publishedDate.toISOString(),
      articleSection: article.category[0]
    });

    // Scroll to top
    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goBack() {
    this.selectedArticle.set(null);
    this.relatedArticles.set([]);
  }

  getCategoryCount(category: ArticleCategory): number {
    return ARTICLES_BY_CATEGORY[category]?.length || 0;
  }
}
