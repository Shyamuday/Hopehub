import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppFooterComponent } from '../../app-footer.component';
import { AppHeaderComponent } from '../../app-header.component';
import { WhatsappLinkService } from '../../core/services/whatsapp-link.service';
import { BLOG_PAGE_CONTENT } from '../../core/constants/public-site-content.constants';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import { ClinicApiClient } from '../../clinic-api/clinic-api.client';

interface BlogPost {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  readTime?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  viewCount?: number;
  isFeatured?: boolean;
  publishedAt?: string | null;
  createdAt: string;
}

type BlogSort = 'recent' | 'popular' | 'featured';

@Component({
  selector: 'app-blog',
  imports: [AppHeaderComponent, AppFooterComponent, RouterLink],
  templateUrl: './blog.component.html',
})
export class BlogComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
  readonly copy = BLOG_PAGE_CONTENT;
  readonly allPosts = signal<BlogPost[]>([]);
  readonly featuredPosts = signal<BlogPost[]>([]);
  readonly mostViewed = signal<BlogPost[]>([]);
  readonly categories = signal<string[]>(['All']);
  readonly loading = signal(true);
  readonly selectedCategory = signal('All');
  readonly sort = signal<BlogSort>('recent');
  private readonly client = inject(ClinicApiClient);

  constructor() {
    void this.load();
  }

  private async load() {
    try {
      const [listRes, popularRes, featuredRes] = await Promise.all([
        this.client.get<{ posts: BlogPost[]; categories: string[] }>(
          `${API_PATHS.BLOG}?sort=${this.sort()}`,
        ),
        this.client.get<{ posts: BlogPost[] }>(`${API_PATHS.BLOG_MOST_VIEWED}?limit=5`),
        this.client.get<{ posts: BlogPost[] }>(`${API_PATHS.BLOG}?sort=featured&featured=true`),
      ]);
      this.allPosts.set(listRes.posts ?? []);
      this.categories.set(['All', ...(listRes.categories ?? [])]);
      this.mostViewed.set(popularRes.posts ?? []);
      this.featuredPosts.set(featuredRes.posts ?? []);
    } catch {
      /* empty state */
    } finally {
      this.loading.set(false);
    }
  }

  async changeSort(next: BlogSort) {
    if (this.sort() === next) return;
    this.sort.set(next);
    this.loading.set(true);
    try {
      const res = await this.client.get<{ posts: BlogPost[] }>(`${API_PATHS.BLOG}?sort=${next}`);
      this.allPosts.set(res.posts ?? []);
    } catch {
      /* keep previous */
    } finally {
      this.loading.set(false);
    }
  }

  filteredPosts(): BlogPost[] {
    const cat = this.selectedCategory();
    return cat === 'All' ? this.allPosts() : this.allPosts().filter((p) => p.category === cat);
  }

  selectCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  postDate(post: BlogPost): string {
    const d = post.publishedAt ?? post.createdAt;
    return d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '';
  }

  authorLabel(post: BlogPost): string {
    if (!post.authorName) return '';
    return post.authorRole ? `${post.authorName} · ${post.authorRole}` : post.authorName;
  }
}
