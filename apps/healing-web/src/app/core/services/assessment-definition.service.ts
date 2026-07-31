import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssessmentConfig } from '../models/assessment.model';
import { ASSESSMENT_CONFIGS, getAssessmentConfig } from '../data/assessment-configs';

type AssessmentDefinitionsResponse = {
  assessments: AssessmentConfig[];
};

type AssessmentDefinitionResponse = {
  assessment: AssessmentConfig;
};

@Injectable({ providedIn: 'root' })
export class AssessmentDefinitionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  list(category?: string): Observable<AssessmentConfig[]> {
    let params = new HttpParams().set('pageSize', '200');
    if (category) {
      params = params.set('category', category);
    }

    return this.http
      .get<AssessmentDefinitionsResponse>(`${this.apiUrl}/assessment-definitions`, { params })
      .pipe(
        map((response) =>
          response.assessments?.length ? response.assessments : ASSESSMENT_CONFIGS,
        ),
        catchError(() => of(ASSESSMENT_CONFIGS)),
      );
  }

  get(id: string): Observable<AssessmentConfig | null> {
    return this.http
      .get<AssessmentDefinitionResponse>(
        `${this.apiUrl}/assessment-definitions/${encodeURIComponent(id)}`,
      )
      .pipe(
        map((response) => response.assessment ?? getAssessmentConfig(id) ?? null),
        catchError(() => of(getAssessmentConfig(id) ?? null)),
      );
  }
}
