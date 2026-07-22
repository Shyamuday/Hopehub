import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../../core/constants/api-paths.constants';

export type WorklistView = 'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'FOLLOW_UP_DUE';
export type FollowUpUrgency = 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';

export type WorklistItem = {
  id: string;
  status: string;
  createdAt: string;
  followUpDate: string | null;
  followUpUrgency: FollowUpUrgency | null;
  sections: Array<'ASSIGNED' | 'IN_PROGRESS' | 'FOLLOW_UP_DUE'>;
  patient?: { id: string; name: string; mobile?: string | null; patientCode?: string | null };
  disease?: { name?: string };
};

export type WorklistResponse = {
  view: WorklistView;
  counts: { assigned: number; inProgress: number; followUpDue: number };
  sections: {
    assigned: WorklistItem[];
    inProgress: WorklistItem[];
    followUpDue: WorklistItem[];
  };
};

@Service()
export class WorklistApiService {
  private readonly apiBase = environment.apiUrl;

  private readonly http = inject(HttpClient);

  private lastSnapshot: WorklistResponse | null = null;
  private lastQueryKey = '';

  peekSnapshot(view: WorklistView = 'ALL', q = '') {
    return this.lastQueryKey === this.queryKey(view, q) ? this.lastSnapshot : null;
  }

  loadWorklist(view: WorklistView = 'ALL', q = '') {
    let params = new HttpParams().set('view', view);
    if (q.trim()) {
      params = params.set('q', q.trim());
    }

    return firstValueFrom(
      this.http.get<WorklistResponse>(`${this.apiBase}${API_PATHS.PROVIDER.WORKLIST}`, { params }),
    ).then((response) => {
      this.lastSnapshot = response;
      this.lastQueryKey = this.queryKey(view, q);
      return response;
    });
  }

  private queryKey(view: WorklistView, q: string) {
    return `${view}:${q.trim()}`;
  }
}
