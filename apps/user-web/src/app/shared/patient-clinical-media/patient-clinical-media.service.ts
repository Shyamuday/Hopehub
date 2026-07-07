import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../../core/constants/api-paths.constants';

export type ClinicalMediaMeta = {
  mediaTypes: Array<{ value: string; label: string }>;
  bodyRegions: Record<string, string[]>;
  diseases: Array<{ id: string; name: string; publicCategory: string | null }>;
};

export type PatientClinicalMediaItem = {
  id: string;
  patientId: string;
  mediaType: string;
  mediaTypeLabel: string;
  bodyRegion: string | null;
  diseaseId: string | null;
  diseaseName: string | null;
  conditionLabel: string | null;
  observations: string | null;
  fileName: string | null;
  mimeType: string;
  fileUrl: string;
  uploadedByName: string | null;
  uploadedByRole: string | null;
  createdAt: string;
};

@Injectable({ providedIn: 'root' })
export class PatientClinicalMediaService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;

  loadMeta() {
    return firstValueFrom(
      this.http.get<ClinicalMediaMeta>(`${this.apiBase}${API_PATHS.PATIENT.CLINICAL_MEDIA_META}`)
    );
  }

  list() {
    return firstValueFrom(
      this.http.get<{ media: PatientClinicalMediaItem[] }>(`${this.apiBase}${API_PATHS.PATIENT.CLINICAL_MEDIA}`)
    ).then((r) => r.media);
  }

  upload(payload: {
    mediaType: string;
    bodyRegion?: string;
    observations?: string;
    diseaseId?: string;
    conditionLabel?: string;
    mimeType: string;
    fileName?: string;
    dataBase64: string;
  }) {
    return firstValueFrom(
      this.http.post<{ media: PatientClinicalMediaItem }>(`${this.apiBase}${API_PATHS.PATIENT.CLINICAL_MEDIA}`, payload)
    ).then((r) => r.media);
  }

  update(mediaId: string, payload: { bodyRegion?: string; observations?: string; diseaseId?: string | null; conditionLabel?: string | null }) {
    return firstValueFrom(
      this.http.patch<{ media: PatientClinicalMediaItem }>(
        `${this.apiBase}${API_PATHS.PATIENT.CLINICAL_MEDIA_ITEM(mediaId)}`,
        payload
      )
    ).then((r) => r.media);
  }

  remove(mediaId: string) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(`${this.apiBase}${API_PATHS.PATIENT.CLINICAL_MEDIA_ITEM(mediaId)}`)
    );
  }

  loadFile(fileUrl: string) {
    return firstValueFrom(this.http.get(`${this.apiBase}${fileUrl}`, { responseType: 'blob' }));
  }
}
