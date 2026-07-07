import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import type { ClinicalMediaItem } from './clinical-media.types';
import type {
  CaseAnalysis,
  ConsultationSummary,
  MateriaMedicaResponse,
  PatientCaseHistory,
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

  loadOrCreatePracticeSession() {
    return firstValueFrom(
      this.http.get<{ analysis: CaseAnalysis }>(`${this.apiBase}${API_PATHS.DOCTOR.REPERTORY_PRACTICE_SESSION}`)
    ).then((response) => response.analysis);
  }

  createPracticeSession(payload?: { notes?: string; sourceId?: string }) {
    return firstValueFrom(
      this.http.post<{ analysis: CaseAnalysis }>(`${this.apiBase}${API_PATHS.DOCTOR.REPERTORY_PRACTICE_SESSION}`, payload ?? {})
    ).then((response) => response.analysis);
  }

  loadConsultationAnalyses(consultationId: string) {
    return firstValueFrom(
      this.http.get<{ consultation: ConsultationSummary; analyses: CaseAnalysis[] }>(
        `${this.apiBase}${API_PATHS.DOCTOR.CONSULTATION_CASE_ANALYSES(consultationId)}`
      )
    );
  }

  createAnalysis(consultationId: string, payload: { notes?: string; sourceId?: string; methodOptionId?: string; rubrics?: Array<{ rubricId: string; weight: number }> }) {
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
      caseSheet?: Record<string, string>;
      approachData?: Record<string, unknown>;
      sourceId?: string;
      methodOptionId?: string | null;
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

  loadMethodOptions() {
    return firstValueFrom(
      this.http.get<{ options: Array<{ id: string; label: string }> }>(
        `${this.apiBase}${API_PATHS.DOCTOR.PRESCRIPTION_OPTIONS}`,
        { params: { type: 'METHOD' } }
      )
    ).then((response) => response.options);
  }

  loadPatientCaseHistory(patientId: string) {
    return firstValueFrom(
      this.http.get<PatientCaseHistory>(
        `${this.apiBase}${API_PATHS.DOCTOR.PATIENT_CASE_HISTORY(patientId)}`
      )
    );
  }

  listClinicalMedia(analysisId: string) {
    return firstValueFrom(
      this.http.get<{ media: ClinicalMediaItem[] }>(
        `${this.apiBase}${API_PATHS.DOCTOR.CASE_ANALYSIS_CLINICAL_MEDIA(analysisId)}`
      )
    ).then((response) => response.media);
  }

  uploadClinicalMedia(
    analysisId: string,
    payload: {
      mediaType: string;
      bodyRegion?: string;
      observations?: string;
      patientConsent: boolean;
      diseaseId?: string;
      conditionLabel?: string;
      mimeType: string;
      fileName?: string;
      dataBase64: string;
    }
  ) {
    return firstValueFrom(
      this.http.post<{ media: ClinicalMediaItem }>(
        `${this.apiBase}${API_PATHS.DOCTOR.CASE_ANALYSIS_CLINICAL_MEDIA(analysisId)}`,
        payload
      )
    ).then((response) => response.media);
  }

  updateClinicalMedia(
    analysisId: string,
    mediaId: string,
    payload: {
      bodyRegion?: string;
      observations?: string;
      patientConsent?: boolean;
      diseaseId?: string | null;
      conditionLabel?: string | null;
    }
  ) {
    return firstValueFrom(
      this.http.patch<{ media: ClinicalMediaItem }>(
        `${this.apiBase}${API_PATHS.DOCTOR.CASE_ANALYSIS_CLINICAL_MEDIA_ITEM(analysisId, mediaId)}`,
        payload
      )
    ).then((response) => response.media);
  }

  deleteClinicalMedia(analysisId: string, mediaId: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(
        `${this.apiBase}${API_PATHS.DOCTOR.CASE_ANALYSIS_CLINICAL_MEDIA_ITEM(analysisId, mediaId)}`
      )
    );
  }

  loadClinicalMediaFile(fileUrl: string) {
    return firstValueFrom(
      this.http.get(`${this.apiBase}${fileUrl}`, {
        responseType: 'blob'
      })
    );
  }

  loadClinicalMediaMeta() {
    return firstValueFrom(
      this.http.get<{
        mediaTypes: Array<{ value: string; label: string }>;
        bodyRegions: Record<string, string[]>;
        diseases: Array<{ id: string; name: string; publicCategory: string | null }>;
      }>(`${this.apiBase}${API_PATHS.DOCTOR.CLINICAL_MEDIA_META}`)
    );
  }

  listPatientClinicalMedia(patientId: string) {
    return firstValueFrom(
      this.http.get<{ media: ClinicalMediaItem[] }>(`${this.apiBase}${API_PATHS.DOCTOR.PATIENT_CLINICAL_MEDIA(patientId)}`)
    ).then((response) => response.media);
  }

  uploadPatientClinicalMedia(
    patientId: string,
    payload: {
      mediaType: string;
      bodyRegion?: string;
      observations?: string;
      patientConsent: boolean;
      diseaseId?: string;
      conditionLabel?: string;
      mimeType: string;
      fileName?: string;
      dataBase64: string;
    }
  ) {
    return firstValueFrom(
      this.http.post<{ media: ClinicalMediaItem }>(
        `${this.apiBase}${API_PATHS.DOCTOR.PATIENT_CLINICAL_MEDIA(patientId)}`,
        payload
      )
    ).then((response) => response.media);
  }

  deletePatientClinicalMedia(patientId: string, mediaId: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(
        `${this.apiBase}${API_PATHS.DOCTOR.PATIENT_CLINICAL_MEDIA_ITEM(patientId, mediaId)}`
      )
    );
  }

  suggestClinicalMediaPhrases(payload: { mediaType: string; observations?: string; bodyRegion?: string }) {
    return firstValueFrom(
      this.http.post<{ phrases: string[] }>(`${this.apiBase}${API_PATHS.DOCTOR.CLINICAL_MEDIA_SUGGEST_PHRASES}`, payload)
    ).then((response) => response.phrases);
  }
}
