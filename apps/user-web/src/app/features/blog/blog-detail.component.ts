import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { AppFooterComponent } from '../../app-footer.component';
import { AppHeaderComponent } from '../../app-header.component';
import { ClinicApiClient } from '../../clinic-api/clinic-api.client';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import { BLOG_PAGE_CONTENT } from '../../core/constants/public-site-content.constants';
import { SimpleMarkdownPipe } from '../../core/pipes/simple-markdown.pipe';
import { WhatsappLinkService } from '../../core/services/whatsapp-link.service';
import { AuthService } from '../../auth/auth.service';

type BlogPostDetail = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string | null;
  category: string;
  readTime?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  viewCount?: number;
  publishedAt?: string | null;
  createdAt: string;
};

type BlogComment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
};

@Component({
  selector: 'app-blog-detail',
  imports: [
    CommonModule,
    RouterLink,
    AppHeaderComponent,
    AppFooterComponent,
    SimpleMarkdownPipe,
    FormField,
  ],
  templateUrl: './blog-detail.component.html',
})
export class BlogDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly client = inject(ClinicApiClient);
  private readonly whatsappSvc = inject(WhatsappLinkService);
  private readonly auth = inject(AuthService);

  readonly whatsappLink = this.whatsappSvc.url;
  readonly copy = BLOG_PAGE_CONTENT;
  readonly post = signal<BlogPostDetail | null>(null);
  readonly comments = signal<BlogComment[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly commentBusy = signal(false);
  readonly commentMessage = signal('');
  readonly commentError = signal('');
  readonly isLoggedIn = this.auth.isLoggedIn;

  readonly commentModel = signal({ body: '' });
  readonly commentForm = form(this.commentModel);

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.notFound.set(true);
        this.loading.set(false);
        return;
      }
      void this.load(slug);
    });
  }

  private async load(slug: string) {
    this.loading.set(true);
    this.notFound.set(false);
    try {
      const [postRes, commentsRes] = await Promise.all([
        this.client.get<{ post: BlogPostDetail }>(API_PATHS.BLOG_POST(slug)),
        this.client.get<{ comments: BlogComment[] }>(API_PATHS.BLOG_COMMENTS(slug)),
      ]);
      this.post.set(postRes.post);
      this.comments.set(commentsRes.comments ?? []);
    } catch {
      this.post.set(null);
      this.comments.set([]);
      this.notFound.set(true);
    } finally {
      this.loading.set(false);
      window.scrollTo(0, 0);
    }
  }

  async submitComment() {
    const slug = this.post()?.slug;
    const body = this.commentModel().body.trim();
    if (!slug || !body) return;

    this.commentBusy.set(true);
    this.commentMessage.set('');
    this.commentError.set('');
    try {
      const res = await this.client.apiFetch<{ comment: BlogComment; message: string }>(
        API_PATHS.BLOG_COMMENTS(slug),
        { method: 'POST', body: JSON.stringify({ body }) },
      );
      if (res.comment) {
        this.comments.update((list) => [...list, res.comment]);
      }
      this.commentModel.set({ body: '' });
      this.commentMessage.set(res.message);
    } catch (err) {
      this.commentError.set(err instanceof Error ? err.message : 'Could not post comment.');
    } finally {
      this.commentBusy.set(false);
    }
  }

  postDate(post: BlogPostDetail) {
    const raw = post.publishedAt || post.createdAt;
    return new Date(raw).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  authorLabel(post: BlogPostDetail): string {
    if (!post.authorName) return '';
    return post.authorRole ? `${post.authorName} · ${post.authorRole}` : post.authorName;
  }

  commentDate(c: BlogComment) {
    return new Date(c.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
