import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import type {
  CaseAnalysis,
  ConsultationSummary,
  MateriaMedicaResponse,
  RepertorySource,
  RubricSearchResult
} from './case-analysis-page.types';

@Service()
export class CaseAnalysisApiService {
  private readonly apiBase = environment.apiUrl;

  private readonly http = inject(HttpClient);

  loadSources() {
    return firstValueFrom(
      this.http.get<{ sources: RepertorySource[] }>(`${this.apiBase}${API_PATHS.DOCTOR.REPERTORY_SOURCES}`)
    ).then((response) => response.sources);
  }

  searchRubrics(q: string, sourceId?: string) {
    return firstValueFrom(
      this.http.get<{ rubrics: RubricSearchResult[] }>(`${this.apiBase}${API_PATHS.DOCTOR.REPERTORY_RUBRICS_SEARCH}`, {
        params: {
          q,
          ...(sourceId ? { sourceId } : {})
        }
      })
    ).then((response) => response.rubrics);
  }

  loadConsultationAnalyses(consultationId: string) {
    return firstValueFrom(
      this.http.get<{ consultation: ConsultationSummary; analyses: CaseAnalysis[] }>(
        `${this.apiBase}${API_PATHS.DOCTOR.CONSULTATION_CASE_ANALYSES(consultationId)}`
      )
    );
  }

  createAnalysis(consultationId: string, payload: { notes?: string; sourceId?: string; rubrics?: Array<{ rubricId: string; weight: number }> }) {
    return firstValueFrom(
      this.http.post<{ analysis: CaseAnalysis }>(
        `${this.apiBase}${API_PATHS.DOCTOR.CONSULTATION_CASE_ANALYSES(consultationId)}`,
        payload
      )
    ).then((response) => response.analysis);
  }

  updateAnalysis(
    analysisId: string,
    payload: {
      notes?: string;
      sourceId?: string;
      rubrics?: Array<{ rubricId: string; weight: number }>;
    }
  ) {
    return firstValueFrom(
      this.http.patch<{ analysis: CaseAnalysis }>(`${this.apiBase}${API_PATHS.DOCTOR.CASE_ANALYSIS(analysisId)}`, payload)
    ).then((response) => response.analysis);
  }

  repertorize(analysisId: string) {
    return firstValueFrom(
      this.http.post<{ analysis: CaseAnalysis }>(`${this.apiBase}${API_PATHS.DOCTOR.CASE_ANALYSIS_REPERTORIZE(analysisId)}`, {})
    ).then((response) => response.analysis);
  }

  selectRemedy(analysisId: string, remedyId: string) {
    return firstValueFrom(
      this.http.patch<{ analysis: CaseAnalysis }>(`${this.apiBase}${API_PATHS.DOCTOR.CASE_ANALYSIS_SELECT_REMEDY(analysisId)}`, {
        remedyId
      })
    ).then((response) => response.analysis);
  }

  loadMateriaMedica(remedyId: string, options?: { analysisId?: string; repertorySourceId?: string }) {
    return firstValueFrom(
      this.http.get<MateriaMedicaResponse>(`${this.apiBase}${API_PATHS.DOCTOR.REPERTORY_REMEDY_MATERIA_MEDICA(remedyId)}`, {
        params: {
          ...(options?.analysisId ? { analysisId: options.analysisId } : {}),
          ...(options?.repertorySourceId ? { repertorySourceId: options.repertorySourceId } : {})
        }
      })
    );
  }
}
