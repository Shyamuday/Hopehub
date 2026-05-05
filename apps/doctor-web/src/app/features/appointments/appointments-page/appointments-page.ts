import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../../../core/services/auth';

type OptionType = 'METHOD' | 'DIAGNOSED_DISEASE';

type PrescriptionOption = {
  id: string;
  label: string;
};

type MedicineRow = {
  medicineName: string;
  strength: string;
  dose: string;
  frequency: string;
  duration: string;
  durationDays: number;
  instructions: string;
  intakeTimesText: string;
};

type LoadedPrescription = {
  id: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
  diagnosis: string;
  advice?: string | null;
  notes: string;
  methodOptionId?: string | null;
  diagnosedDiseaseOptionId?: string | null;
  items: Array<{
    medicineName: string;
    strength?: string | null;
    dose?: string | null;
    frequency?: string | null;
    duration?: string | null;
    durationDays?: number | null;
    instructions?: string | null;
    intakeTimes?: string[] | null;
  }>;
};

@Component({
  selector: 'app-appointments-page',
  imports: [FormsModule],
  templateUrl: './appointments-page.html',
  styleUrl: './appointments-page.scss'
})
export class AppointmentsPage {
  private readonly apiBase = 'http://localhost:4000';

  consultationId = '';
  methodOptionId = '';
  diagnosedDiseaseOptionId = '';
  diagnosis = '';
  notes = '';
  advice = '';
  status: 'DRAFT' | 'PUBLISHED' = 'DRAFT';
  editingPrescriptionId = '';
  loadedPrescriptions: LoadedPrescription[] = [];

  methods: PrescriptionOption[] = [];
  diagnosedDiseases: PrescriptionOption[] = [];

  newMethod = '';
  newDiagnosedDisease = '';
  message = '';
  error = '';
  medicineRows: MedicineRow[] = [this.newMedicineRow()];

  constructor(
    private readonly http: HttpClient,
    private readonly auth: Auth
  ) {
    void this.loadOptions();
  }

  private headers() {
    return new HttpHeaders({
      Authorization: `Bearer ${this.auth.token()}`
    });
  }

  private async loadByType(type: OptionType) {
    const response = await firstValueFrom(
      this.http.get<{ options: PrescriptionOption[] }>(`${this.apiBase}/doctor/prescription-options`, {
        headers: this.headers(),
        params: { type }
      })
    );

    return response.options;
  }

  async loadOptions() {
    this.error = '';
    try {
      this.methods = await this.loadByType('METHOD');
      this.diagnosedDiseases = await this.loadByType('DIAGNOSED_DISEASE');
    } catch {
      this.error = 'Could not load dropdown options. Login with API-backed doctor account.';
    }
  }

  private newMedicineRow(): MedicineRow {
    return {
      medicineName: '',
      strength: '',
      dose: '',
      frequency: '',
      duration: '',
      durationDays: 7,
      instructions: '',
      intakeTimesText: '09:00,21:00'
    };
  }

  async addOption(type: OptionType) {
    this.message = '';
    this.error = '';

    const label = type === 'METHOD' ? this.newMethod.trim() : this.newDiagnosedDisease.trim();
    if (!label) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ option: PrescriptionOption }>(
          `${this.apiBase}/doctor/prescription-options`,
          { type, label },
          { headers: this.headers() }
        )
      );

      if (type === 'METHOD') {
        this.newMethod = '';
        this.methods = [...this.methods, response.option].sort((a, b) => a.label.localeCompare(b.label));
        this.methodOptionId = response.option.id;
      } else {
        this.newDiagnosedDisease = '';
        this.diagnosedDiseases = [...this.diagnosedDiseases, response.option].sort((a, b) =>
          a.label.localeCompare(b.label)
        );
        this.diagnosedDiseaseOptionId = response.option.id;
      }
      this.message = 'Option added successfully.';
    } catch {
      this.error = 'Could not add option.';
    }
  }

  addMedicineRow() {
    this.medicineRows = [...this.medicineRows, this.newMedicineRow()];
  }

  removeMedicineRow(index: number) {
    if (this.medicineRows.length === 1) {
      return;
    }

    this.medicineRows = this.medicineRows.filter((_, idx) => idx !== index);
  }

  async loadConsultationPrescriptions() {
    this.message = '';
    this.error = '';
    this.editingPrescriptionId = '';
    if (!this.consultationId.trim()) {
      this.error = 'Please enter consultation id.';
      return;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<{ prescriptions: LoadedPrescription[] }>(
          `${this.apiBase}/doctor/appointments/${this.consultationId}/prescriptions`,
          { headers: this.headers() }
        )
      );
      this.loadedPrescriptions = response.prescriptions || [];
      if (this.loadedPrescriptions.length) {
        this.selectPrescription(this.loadedPrescriptions[0]);
      } else {
        this.resetEditorForFollowUp();
        this.message = 'No prescription history found for this consultation.';
      }
    } catch {
      this.error = 'Could not load prescription history.';
    }
  }

  selectPrescription(prescription: LoadedPrescription) {
    this.editingPrescriptionId = prescription.id;
    this.methodOptionId = prescription.methodOptionId || '';
    this.diagnosedDiseaseOptionId = prescription.diagnosedDiseaseOptionId || '';
    this.diagnosis = prescription.diagnosis || '';
    this.advice = prescription.advice || '';
    this.notes = prescription.notes || '';
    this.status = prescription.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
    this.medicineRows = (prescription.items || []).length
      ? (prescription.items || []).map((item) => ({
          medicineName: item.medicineName || '',
          strength: item.strength || '',
          dose: item.dose || '',
          frequency: item.frequency || '',
          duration: item.duration || '',
          durationDays: item.durationDays || 7,
          instructions: item.instructions || '',
          intakeTimesText: (item.intakeTimes || ['09:00']).join(',')
        }))
      : [this.newMedicineRow()];
  }

  selectPrescriptionById(prescriptionId: string) {
    const selected = this.loadedPrescriptions.find((item) => item.id === prescriptionId);
    if (!selected) {
      return;
    }

    this.selectPrescription(selected);
  }

  resetEditorForFollowUp() {
    this.editingPrescriptionId = '';
    this.status = 'DRAFT';
    this.diagnosis = '';
    this.advice = '';
    this.notes = '';
    this.medicineRows = [this.newMedicineRow()];
  }

  private buildPayload(targetStatus: 'DRAFT' | 'PUBLISHED') {
    return {
      methodOptionId: this.methodOptionId,
      diagnosedDiseaseOptionId: this.diagnosedDiseaseOptionId,
      diagnosis: this.diagnosis,
      notes: this.notes,
      advice: this.advice || undefined,
      status: targetStatus,
      items: this.medicineRows.map((row) => ({
        medicineName: row.medicineName,
        strength: row.strength || undefined,
        dose: row.dose || undefined,
        frequency: row.frequency || undefined,
        duration: row.duration || undefined,
        durationDays: row.durationDays || undefined,
        instructions: row.instructions || undefined,
        intakeTimes: row.intakeTimesText
          .split(',')
          .map((value) => value.trim())
          .filter((value) => /^\d{2}:\d{2}$/.test(value))
      }))
    };
  }

  async savePrescription(targetStatus: 'DRAFT' | 'PUBLISHED') {
    this.message = '';
    this.error = '';

    if (!this.consultationId || !this.methodOptionId || !this.diagnosedDiseaseOptionId || !this.diagnosis || !this.notes) {
      this.error = 'Please fill consultation id, method, diagnosed disease, diagnosis and notes.';
      return;
    }

    if (this.medicineRows.some((row) => !row.medicineName.trim())) {
      this.error = 'Each medicine row must include medicine name.';
      return;
    }

    try {
      const payload = this.buildPayload(targetStatus);
      if (this.editingPrescriptionId) {
        await firstValueFrom(
          this.http.put(`${this.apiBase}/doctor/prescriptions/${this.editingPrescriptionId}`, payload, {
            headers: this.headers()
          })
        );
        this.message = targetStatus === 'PUBLISHED' ? 'Draft updated and published.' : 'Draft updated.';
      } else {
        await firstValueFrom(
          this.http.post(`${this.apiBase}/doctor/appointments/${this.consultationId}/prescriptions`, payload, {
            headers: this.headers()
          })
        );
        this.message = targetStatus === 'PUBLISHED' ? 'Follow-up prescription created and published.' : 'Draft created.';
      }

      await this.loadConsultationPrescriptions();
    } catch {
      this.error = 'Could not save prescription. Check consultation assignment and draft state.';
    }
  }
}
