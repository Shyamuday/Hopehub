import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { API_PATHS } from '../../../core/constants/api-paths.constants';
import type {
  LoadedPrescription,
  OptionType,
  PrescriptionOption,
  PrescriptionPayload,
  PrescriptionTemplate,
  SaveTemplatePayload
} from './appointments-page.types';

@Service()
export class AppointmentsPrescriptionsService {
  private readonly apiBase = environment.apiUrl;

  private readonly http = inject(HttpClient);

  loadOptions(type: OptionType) {
    return firstValueFrom(
      this.http.get<{ options: PrescriptionOption[] }>(`${this.apiBase}${API_PATHS.DOCTOR.PRESCRIPTION_OPTIONS}`, {
        params: { type }
      })
    ).then((response) => response.options);
  }

  addOption(type: OptionType, label: string) {
    return firstValueFrom(
      this.http.post<{ option: PrescriptionOption }>(`${this.apiBase}${API_PATHS.DOCTOR.PRESCRIPTION_OPTIONS}`, {
        type,
        label
      })
    );
  }

  loadConsultationPrescriptions(consultationId: string) {
    return firstValueFrom(
      this.http.get<{
        prescriptions: LoadedPrescription[];
        consultation?: { status: string };
        patient?: {
          id: string;
          name: string;
          allergies?: string | null;
          currentMedications?: string | null;
          chronicConditions?: string | null;
        };
      }>(`${this.apiBase}${API_PATHS.DOCTOR.APPOINTMENT_PRESCRIPTIONS(consultationId)}`)
    );
  }

  savePrescription(consultationId: string, prescriptionId: string | null, payload: PrescriptionPayload) {
    if (prescriptionId) {
      return firstValueFrom(
        this.http.put(`${this.apiBase}${API_PATHS.DOCTOR.PRESCRIPTIONS}/${prescriptionId}`, payload)
      );
    }

    return firstValueFrom(
      this.http.post(`${this.apiBase}${API_PATHS.DOCTOR.APPOINTMENT_PRESCRIPTIONS(consultationId)}`, payload)
    );
  }

  loadTemplates() {
    return firstValueFrom(
      this.http.get<{ templates: PrescriptionTemplate[] }>(`${this.apiBase}${API_PATHS.DOCTOR.PRESCRIPTION_TEMPLATES}`)
    ).then((response) => response.templates || []);
  }

  saveTemplate(payload: SaveTemplatePayload) {
    return firstValueFrom(
      this.http.post(`${this.apiBase}${API_PATHS.DOCTOR.PRESCRIPTION_TEMPLATES}`, payload)
    );
  }

  deleteTemplate(id: string) {
    return firstValueFrom(this.http.delete(`${this.apiBase}${API_PATHS.DOCTOR.PRESCRIPTION_TEMPLATES}/${id}`));
  }

  closeConsultation(consultationId: string) {
    return firstValueFrom(
      this.http.post(`${this.apiBase}${API_PATHS.CONSULTATIONS}/${consultationId}/complete`, {})
    );
  }
}
