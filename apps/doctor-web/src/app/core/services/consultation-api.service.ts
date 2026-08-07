import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../constants/api-paths.constants';
import type {
  ConsultationAssessmentSummary,
  ConsultationCallSession,
  ConsultationMessage,
  ConsultationSessionNote,
  ConsultationSessionOutcome,
  DoctorConsultation,
} from '../types/consultation.types';

type CloseConsultationPayload = {
  outcome?: 'COMPLETED' | 'USER_MISSED' | 'PROVIDER_NO_SHOW' | 'RESCHEDULE_NEEDED' | string;
  privateNote?: string;
  userSummary?: string;
  recommendedNextStep?: string;
  restorePackageSession?: boolean;
  holdProviderPayout?: boolean;
};

@Service()
export class ConsultationApiService {
  private readonly apiBase = environment.apiUrl;
  private readonly http = inject(HttpClient);

  loadConsultation(consultationId: string) {
    return firstValueFrom(
      this.http.get<{ consultation: DoctorConsultation }>(
        `${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}`,
      ),
    ).then((response) => response.consultation);
  }

  sendMessage(consultationId: string, body: string) {
    return firstValueFrom(
      this.http.post<{ message: ConsultationMessage }>(
        `${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}/messages`,
        {
          body,
        },
      ),
    ).then((response) => response.message);
  }

  loadSessionNotes(consultationId: string) {
    return firstValueFrom(
      this.http.get<{ notes: ConsultationSessionNote[] }>(
        `${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}/session-notes`,
      ),
    ).then((response) => response.notes);
  }

  loadCallSessions(consultationId: string) {
    return firstValueFrom(
      this.http.get<{ callSessions: ConsultationCallSession[] }>(
        `${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}/call-sessions`,
      ),
    ).then((response) => response.callSessions);
  }

  addSessionNote(consultationId: string, note: string) {
    return firstValueFrom(
      this.http.post<{ note: ConsultationSessionNote }>(
        `${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}/session-notes`,
        { note },
      ),
    ).then((response) => response.note);
  }

  loadAssessmentSummary(consultationId: string) {
    return firstValueFrom(
      this.http.get<ConsultationAssessmentSummary>(
        `${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}/assessment-summary`,
      ),
    );
  }

  closeConsultation(consultationId: string, payload?: CloseConsultationPayload) {
    if (payload?.outcome) {
      return firstValueFrom(
        this.http.post<{
          consultation: DoctorConsultation;
          sessionOutcome?: ConsultationSessionOutcome | null;
        }>(`${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}/outcome`, payload),
      );
    }

    return firstValueFrom(
      this.http.post<{
        consultation: DoctorConsultation;
        sessionOutcome?: ConsultationSessionOutcome | null;
      }>(`${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}/complete`, {}),
    );
  }
}
