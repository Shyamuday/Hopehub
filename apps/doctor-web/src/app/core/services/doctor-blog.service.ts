import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../constants/api-paths.constants';

export type DoctorBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string | null;
  category: string;
  readTime?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class DoctorBlogService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  listPosts() {
    return firstValueFrom(
      this.http.get<{ posts: DoctorBlogPost[]; categories: string[] }>(
        `${this.apiBase}${API_PATHS.PROVIDER.BLOG}`,
      ),
    );
  }

  createPost(payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.post<{ post: DoctorBlogPost; message: string }>(
        `${this.apiBase}${API_PATHS.PROVIDER.BLOG}`,
        payload,
      ),
    );
  }

  updatePost(id: string, payload: Record<string, unknown>) {
    return firstValueFrom(
      this.http.patch<{ post: DoctorBlogPost; message: string }>(
        `${this.apiBase}${API_PATHS.PROVIDER.BLOG_BY_ID(id)}`,
        payload,
      ),
    );
  }

  deletePost(id: string) {
    return firstValueFrom(
      this.http.delete<{ message: string }>(`${this.apiBase}${API_PATHS.PROVIDER.BLOG_BY_ID(id)}`),
    );
  }
}
