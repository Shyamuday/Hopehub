import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';

type PublicArticle = {
  slug: string;
  title: string;
  excerpt: string;
  content?: string | null;
  category: string;
  concernSlugs: string[];
  readTime?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  publishedAt?: string | null;
};

@Component({
  selector: 'app-resource-article',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="article-shell">
      @if (loading()) {
        <div class="state">Loading article…</div>
      } @else if (article(); as item) {
        <nav aria-label="Breadcrumb">
          <a routerLink="/resources">Resources</a><span>/</span
          ><a routerLink="/articles">Articles</a>
        </nav>
        <article>
          <header>
            <p class="eyebrow">{{ item.category }}</p>
            <h1>{{ item.title }}</h1>
            <p class="excerpt">{{ item.excerpt }}</p>
            <div class="meta">
              <span>{{ item.authorName || 'Hope Hub Editorial Team' }}</span>
              @if (item.authorRole) {
                <span>{{ item.authorRole }}</span>
              }
              @if (item.readTime) {
                <span>{{ item.readTime }}</span>
              }
            </div>
          </header>
          <div class="content">{{ item.content || item.excerpt }}</div>
        </article>
        <aside>
          <strong>Educational information only</strong>
          <p>This article does not diagnose or replace professional or emergency care.</p>
        </aside>
      } @else {
        <div class="state state--error">{{ error() }}</div>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        background: #f8fafc;
        color: #172033;
      }
      .article-shell {
        width: min(820px, calc(100% - 2rem));
        margin: 0 auto;
        padding: 2rem 0 4rem;
      }
      nav {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        color: #64748b;
        font-size: 0.86rem;
      }
      nav a {
        color: #087f6b;
        font-weight: 750;
        text-decoration: none;
      }
      article {
        padding: clamp(1.4rem, 5vw, 3.5rem);
        border: 1px solid #dce5ea;
        border-radius: 1.6rem;
        background: #fff;
        box-shadow: 0 16px 42px rgba(15, 23, 42, 0.06);
      }
      .eyebrow {
        margin: 0 0 0.5rem;
        color: #087f6b;
        font-size: 0.76rem;
        font-weight: 850;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        color: #10233d;
        font-size: clamp(2rem, 5vw, 3.3rem);
        line-height: 1.12;
      }
      .excerpt {
        color: #536274;
        font-size: 1.1rem;
        line-height: 1.7;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem 1rem;
        color: #64748b;
        font-size: 0.82rem;
      }
      .content {
        margin-top: 2rem;
        padding-top: 2rem;
        border-top: 1px solid #e2e8f0;
        color: #334155;
        font-size: 1rem;
        line-height: 1.85;
        white-space: pre-wrap;
      }
      aside,
      .state {
        margin-top: 1rem;
        padding: 1rem 1.15rem;
        border: 1px solid #fed7aa;
        border-radius: 1rem;
        background: #fff7ed;
        color: #7c4a22;
      }
      aside p {
        margin: 0.3rem 0 0;
      }
      .state--error {
        border-color: #fecaca;
        background: #fff;
        color: #991b1b;
      }
      @media (max-width: 600px) {
        .article-shell {
          width: min(100% - 1rem, 820px);
          padding-top: 1rem;
        }
        article {
          border-radius: 1.1rem;
        }
      }
    `,
  ],
})
export class ResourceArticleComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly article = signal<PublicArticle | null>(null);
  readonly loading = signal(true);
  readonly error = signal('Article not found.');

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) return;
      this.http
        .get<{ post: PublicArticle }>(`${environment.apiUrl}/blog/${encodeURIComponent(slug)}`)
        .subscribe({
          next: (response) => {
            this.article.set(response.post);
            this.loading.set(false);
          },
          error: (error) => {
            if (error?.status === 404) void this.router.navigate(['/404'], { replaceUrl: true });
            else {
              this.error.set('This article could not be loaded. Please try again.');
              this.loading.set(false);
            }
          },
        });
    });
  }
}
