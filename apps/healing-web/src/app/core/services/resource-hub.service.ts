import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ResourceConcern = {
  id: string;
  key: string;
  slug: string;
  label: string;
  shortLabel: string;
  description: string;
  assessmentId: string;
  assessmentLabel: string;
  supportPath: 'PROFESSIONAL_CARE' | 'COACH_MENTOR' | 'EMOTIONAL_LISTENER';
  showOnHome: boolean;
  showInResourceHub: boolean;
  showInSupportGuide: boolean;
  sortOrder: number;
};

export type ResourceSection = {
  key: string;
  label: string;
  description: string;
  path: string;
};

export type ConcernResource = {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string;
  excerpt?: string;
  durationLabel?: string | null;
  durationMinutes?: number | null;
  timeToImplement?: string;
  type?: string;
  category?: string;
  readTime?: string | null;
};

export type ConcernPageData = {
  concern: ResourceConcern;
  assessment: {
    id: string;
    title: string;
    description: string;
    category: string;
    accessMode: string;
  } | null;
  practices: ConcernResource[];
  lifestyleTips: ConcernResource[];
  articles: ConcernResource[];
  routes: Record<
    'assessment' | 'practices' | 'lifestyleTips' | 'articles' | 'talk' | 'careTeam' | 'booking',
    string
  >;
};

@Injectable({ providedIn: 'root' })
export class ResourceHubService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getHub(): Observable<{ concerns: ResourceConcern[]; sections: ResourceSection[] }> {
    return this.http.get<{ concerns: ResourceConcern[]; sections: ResourceSection[] }>(
      `${this.apiUrl}/hope-hub/resource-hub`,
    );
  }

  getConcern(slug: string): Observable<ConcernPageData> {
    return this.http.get<ConcernPageData>(
      `${this.apiUrl}/hope-hub/concerns/${encodeURIComponent(slug)}`,
    );
  }
}
