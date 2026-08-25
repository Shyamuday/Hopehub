import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { AdminApi } from '../../../core/services/admin-api';
import { AdminCanDirective } from '../../../core/directives/admin-can.directive';
import { ADMIN_PERMISSIONS } from '../../../core/admin-permissions';

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string | null;
  category: string;
  concernSlugs: string[];
  readTime?: string | null;
  authorName?: string | null;
  authorRole?: string | null;
  viewCount: number;
  sortOrder: number;
  isFeatured: boolean;
  isHidden: boolean;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
  _count?: { comments: number };
};

type BlogComment = {
  id: string;
  authorName: string;
  body: string;
  isApproved: boolean;
  createdAt: string;
  post: { id: string; slug: string; title: string };
};

type BlogStats = {
  total: number;
  published: number;
  drafts: number;
  hidden: number;
  featured: number;
  pendingComments: number;
  totalViews: number;
};

function emptyModel() {
  return {
    slug: '',
    title: '',
    excerpt: '',
    content: '',
    category: '',
    concernSlugsText: '',
    readTime: '',
    authorName: '',
    authorRole: '',
    sortOrder: 0,
    isPublished: false,
    isHidden: false,
    isFeatured: false,
  };
}

@Component({
  selector: 'app-blog-page',
  imports: [CommonModule, FormField, AdminCanDirective],
  templateUrl: './blog-page.html',
  styleUrl: './blog-page.scss',
})
export class BlogPage {
  readonly managePermissions = [
    ADMIN_PERMISSIONS.CATALOG_WRITE,
    ADMIN_PERMISSIONS.HR_WRITE,
  ] as const;
  readonly posts = signal<BlogPost[]>([]);
  readonly categories = signal<string[]>([]);
  readonly stats = signal<BlogStats | null>(null);
  readonly comments = signal<BlogComment[]>([]);
  readonly commentFilter = signal<'pending' | 'approved' | 'all'>('pending');
  readonly loading = signal(false);
  readonly mutating = signal(false);
  readonly error = signal('');
  readonly message = signal('');

  readonly createModel = signal(emptyModel());
  readonly createForm = form(this.createModel);
  editingId = signal<string | null>(null);
  readonly editModel = signal(emptyModel());
  readonly editForm = form(this.editModel);

  expandedId = signal<string | null>(null);

  constructor(private readonly api: AdminApi) {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [postsRes, statsRes, commentsRes] = await Promise.all([
        this.api.listBlogPosts(),
        this.api.getBlogStats(),
        this.api.listBlogComments(this.commentFilter()),
      ]);
      this.posts.set(postsRes.posts);
      this.categories.set(postsRes.categories ?? []);
      this.stats.set(statsRes.stats as BlogStats);
      this.comments.set(commentsRes.comments);
    } catch {
      this.error.set('Could not load blog data.');
    } finally {
      this.loading.set(false);
    }
  }

  async reloadComments() {
    try {
      const res = await this.api.listBlogComments(this.commentFilter());
      this.comments.set(res.comments);
    } catch {
      this.error.set('Could not load comments.');
    }
  }

  async setCommentFilter(filter: 'pending' | 'approved' | 'all') {
    this.commentFilter.set(filter);
    await this.reloadComments();
  }

  autoSlug() {
    const title = this.createModel().title;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    this.createModel.update((m) => ({ ...m, slug }));
  }

  async create() {
    const m = this.createModel();
    this.mutating.set(true);
    this.message.set('');
    try {
      await this.api.createBlogPost({
        ...m,
        concernSlugs: this.parseList(m.concernSlugsText),
        content: m.content || null,
        readTime: m.readTime || null,
        authorName: m.authorName || null,
        authorRole: m.authorRole || null,
        sortOrder: Number(m.sortOrder) || 0,
      });
      this.message.set('Post created.');
      this.createModel.set(emptyModel());
      await this.load();
    } catch {
      this.error.set('Could not create post. Check that the slug is unique.');
    } finally {
      this.mutating.set(false);
    }
  }

  startEdit(p: BlogPost) {
    this.editingId.set(p.id);
    this.editModel.set({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content || '',
      category: p.category,
      concernSlugsText: (p.concernSlugs ?? []).join(', '),
      readTime: p.readTime || '',
      authorName: p.authorName || '',
      authorRole: p.authorRole || '',
      sortOrder: p.sortOrder,
      isPublished: p.isPublished,
      isHidden: p.isHidden,
      isFeatured: p.isFeatured,
    });
  }
  cancelEdit() {
    this.editingId.set(null);
  }

  async saveEdit() {
    const id = this.editingId();
    if (!id) return;
    const m = this.editModel();
    this.mutating.set(true);
    this.message.set('');
    try {
      await this.api.updateBlogPost(id, {
        ...m,
        concernSlugs: this.parseList(m.concernSlugsText),
        content: m.content || null,
        readTime: m.readTime || null,
        authorName: m.authorName || null,
        authorRole: m.authorRole || null,
        sortOrder: Number(m.sortOrder) || 0,
      });
      this.message.set('Post updated.');
      this.editingId.set(null);
      await this.load();
    } catch {
      this.error.set('Could not update post.');
    } finally {
      this.mutating.set(false);
    }
  }

  async quickToggle(p: BlogPost, field: 'isPublished' | 'isHidden' | 'isFeatured') {
    this.mutating.set(true);
    try {
      await this.api.updateBlogPost(p.id, { [field]: !p[field] });
      this.message.set('Updated.');
      await this.load();
    } catch {
      this.error.set('Could not update.');
    } finally {
      this.mutating.set(false);
    }
  }

  async remove(id: string) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    this.mutating.set(true);
    try {
      await this.api.deleteBlogPost(id);
      this.message.set('Deleted.');
      await this.load();
    } catch {
      this.error.set('Could not delete.');
    } finally {
      this.mutating.set(false);
    }
  }

  async approveComment(id: string) {
    this.mutating.set(true);
    try {
      await this.api.moderateBlogComment(id, true);
      this.message.set('Comment approved.');
      await this.load();
    } catch {
      this.error.set('Could not approve comment.');
    } finally {
      this.mutating.set(false);
    }
  }

  async hideComment(id: string) {
    this.mutating.set(true);
    try {
      await this.api.moderateBlogComment(id, false);
      this.message.set('Comment hidden.');
      await this.load();
    } catch {
      this.error.set('Could not hide comment.');
    } finally {
      this.mutating.set(false);
    }
  }

  async deleteComment(id: string) {
    if (!confirm('Delete this comment permanently?')) return;
    this.mutating.set(true);
    try {
      await this.api.deleteBlogComment(id);
      this.message.set('Comment deleted.');
      await this.load();
    } catch {
      this.error.set('Could not delete comment.');
    } finally {
      this.mutating.set(false);
    }
  }

  toggleExpand(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  statusLabel(p: BlogPost): string {
    if (p.isHidden) return 'Hidden';
    if (p.isPublished) return 'Published';
    return 'Draft';
  }

  private parseList(value: string): string[] {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
