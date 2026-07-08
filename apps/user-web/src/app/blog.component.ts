import { Component, inject, signal } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WhatsappLinkService } from './core/services/whatsapp-link.service';
import { BLOG_PAGE_CONTENT } from './core/constants/public-site-content.constants';
import { API_PATHS } from './core/constants/api-paths.constants';
import { ClinicApiClient } from './clinic-api/clinic-api.client';

interface BlogPost {
  id: string;
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  readTime?: string | null;
  publishedAt?: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-blog',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './blog.component.html',
})
export class BlogComponent {
  private readonly whatsappSvc = inject(WhatsappLinkService);
  readonly whatsappLink = this.whatsappSvc.url;
  readonly copy = BLOG_PAGE_CONTENT;
  readonly allPosts = signal<BlogPost[]>([]);
  readonly categories = signal<string[]>(['All']);
  readonly loading = signal(true);
  readonly selectedCategory = signal('All');
  private readonly client = new ClinicApiClient();

  constructor() { void this.load(); }

  private async load() {
    try {
      const res = await this.client.get<{ posts: BlogPost[]; categories: string[] }>(API_PATHS.BLOG);
      this.allPosts.set(res.posts ?? []);
      this.categories.set(['All', ...(res.categories ?? [])]);
    } catch { /* empty state */ }
    finally { this.loading.set(false); }
  }

  filteredPosts(): BlogPost[] {
    const cat = this.selectedCategory();
    return cat === 'All' ? this.allPosts() : this.allPosts().filter((p) => p.category === cat);
  }

  selectCategory(cat: string): void { this.selectedCategory.set(cat); }

  postDate(post: BlogPost): string {
    const d = post.publishedAt ?? post.createdAt;
    return d ? new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '';
  }
}
