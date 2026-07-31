import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AssessmentAttemptPayload = {
  assessmentId: string;
  assessmentType?: string;
  category?: string;
  title?: string;
  version?: string;
  answers: number[];
  totalScore?: number;
  maxScore?: number;
  level?: string;
  color?: string;
  description?: string;
  suggestions?: string[];
  safetyFlag?: boolean;
  source?: string;
  entryPage?: string;
  completedAt?: string;
};

export type SavedAssessmentAttempt = AssessmentAttemptPayload & {
  id: string;
  retakeNumber: number;
  previousId?: string | null;
  createdAt: string;
  completedAt: string;
};

@Injectable({ providedIn: 'root' })
export class AssessmentAttemptsService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  saveAttempt(payload: AssessmentAttemptPayload): Observable<{
    attempt: SavedAssessmentAttempt;
    previous: {
      id: string;
      retakeNumber: number;
      totalScore: number;
      level: string;
      completedAt: string;
    } | null;
  }> {
    return this.http.post<{
      attempt: SavedAssessmentAttempt;
      previous: {
        id: string;
        retakeNumber: number;
        totalScore: number;
        level: string;
        completedAt: string;
      } | null;
    }>(`${this.apiUrl}/hope-hub/assessments`, payload);
  }

  scoreAttempt(assessmentId: string, answers: number[]) {
    return this.http.post<{
      result: {
        assessmentId: string;
        assessmentType: string;
        category: string;
        title: string;
        version: string;
        total: number;
        maxScore: number;
        level: string;
        color: string;
        description: string;
        suggestions: string[];
        safetyFlag: boolean;
        answers: number[];
      };
    }>(`${this.apiUrl}/assessment-definitions/${encodeURIComponent(assessmentId)}/score`, {
      answers,
    });
  }

  listAttempts(params: { page?: number; pageSize?: number; assessmentId?: string } = {}) {
    const searchParams = new URLSearchParams({
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
      assessmentId: params.assessmentId ?? '',
    });
    return this.http.get<{
      attempts: SavedAssessmentAttempt[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>(`${this.apiUrl}/hope-hub/assessments?${searchParams.toString()}`);
  }

  latest(assessmentId: string) {
    return this.http.get<{ attempt: SavedAssessmentAttempt | null }>(
      `${this.apiUrl}/hope-hub/assessments/latest?assessmentId=${encodeURIComponent(assessmentId)}`,
    );
  }
}
