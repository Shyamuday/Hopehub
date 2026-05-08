import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

type OptionType = 'METHOD' | 'DIAGNOSED_DISEASE';

type TemplateItem = {
  medicineName: string;
  strength?: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  sortOrder?: number;
};

type PrescriptionTemplate = {
  id: string;
  name: string;
  diagnosis: string;
  advice?: string | null;
  notes: string;
  items: TemplateItem[];
};

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
  createdAt?: string;
  followUpDate?: string | null;
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

type ConsultationAttachmentRow = {
  id: string;
  kind: string;
  fileName?: string | null;
  mimeType?: string | null;
  caption?: string | null;
  fileUrl: string;
  createdAt?: string;
  uploadedBy?: { name?: string };
};

@Component({
  selector: 'app-appointments-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './appointments-page.html',
  styleUrl: './appointments-page.scss'
})
export class AppointmentsPage {
  private readonly apiBase = environment.apiUrl;

  consultationId = '';
  methodOptionId = '';
  diagnosedDiseaseOptionId = '';
  diagnosis = '';
  notes = '';
  advice = '';
  followUpDate = '';
  status: 'DRAFT' | 'PUBLISHED' = 'DRAFT';
  editingPrescriptionId = '';
  loadedPrescriptions: LoadedPrescription[] = [];

  methods: PrescriptionOption[] = [];
  diagnosedDiseases: PrescriptionOption[] = [];

  newMethod = '';
  newDiagnosedDisease = '';
  message = '';
  error = '';
  saving = false;
  pendingSaveStatus: 'DRAFT' | 'PUBLISHED' | null = null;
  consultationStatus = '';
  confirmingClose = false;

  attachments: ConsultationAttachmentRow[] = [];
  clinicalAttachmentCaption = '';
  uploadingClinicalAttachment = false;
  clinicalAttachmentMessage = '';

  templates: PrescriptionTemplate[] = [];
  templatesLoading = false;
  showSaveTemplateForm = false;
  templateName = '';
  savingTemplate = false;
  savingTemplateError = '';
  deletingTemplateId = '';
  medicineRows: MedicineRow[] = [this.newMedicineRow()];

  constructor(
    private readonly http: HttpClient,
    private readonly route: ActivatedRoute
  ) {
    this.consultationId = this.route.snapshot.queryParamMap.get('consultationId') || '';
    void this.loadOptions();
    void this.loadTemplates();
    if (this.consultationId) {
      void this.loadConsultationPrescriptions();
    }
  }

  private async loadByType(type: OptionType) {
    const response = await firstValueFrom(
      this.http.get<{ options: PrescriptionOption[] }>(`${this.apiBase}/doctor/prescription-options`, {
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
          { type, label }
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

    const id = this.consultationId.trim();

    try {
      const rxRes = await firstValueFrom(
        this.http.get<{ prescriptions: LoadedPrescription[]; consultation?: { status: string } }>(
          `${this.apiBase}/doctor/appointments/${id}/prescriptions`
        )
      );
      this.loadedPrescriptions = rxRes.prescriptions || [];
      this.consultationStatus = rxRes.consultation?.status || '';

      try {
        const detailRes = await firstValueFrom(
          this.http.get<{ consultation: { attachments?: ConsultationAttachmentRow[]; status: string } }>(
            `${this.apiBase}/consultations/${id}`
          )
        );
        this.attachments = detailRes.consultation?.attachments || [];
        if (!this.consultationStatus) {
          this.consultationStatus = detailRes.consultation?.status || '';
        }
      } catch {
        this.attachments = [];
      }

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

  attachmentKindLabel(kind: string): string {
    if (kind === 'PATIENT_REPORT') return 'Patient report';
    if (kind === 'DOCTOR_CLINICAL') return 'Clinical / clinic photo';
    return 'File';
  }

  async uploadClinicalAttachment(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const id = this.consultationId.trim();
    if (!file || !id) return;

    this.uploadingClinicalAttachment = true;
    this.clinicalAttachmentMessage = '';

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'DOCTOR_CLINICAL');
      if (this.clinicalAttachmentCaption.trim()) {
        fd.append('caption', this.clinicalAttachmentCaption.trim().slice(0, 500));
      }

      const response = await firstValueFrom(
        this.http.post<{ attachment: ConsultationAttachmentRow }>(
          `${this.apiBase}/consultations/${id}/attachments`,
          fd
        )
      );
      this.attachments = [response.attachment, ...this.attachments];
      this.clinicalAttachmentCaption = '';
      this.clinicalAttachmentMessage = 'Uploaded.';
    } catch {
      this.clinicalAttachmentMessage = 'Upload failed.';
    } finally {
      this.uploadingClinicalAttachment = false;
    }
  }

  selectPrescription(prescription: LoadedPrescription) {
    this.editingPrescriptionId = prescription.id;
    this.methodOptionId = prescription.methodOptionId || '';
    this.diagnosedDiseaseOptionId = prescription.diagnosedDiseaseOptionId || '';
    this.diagnosis = prescription.diagnosis || '';
    this.advice = prescription.advice || '';
    this.notes = prescription.notes || '';
    this.followUpDate = prescription.followUpDate
      ? new Date(prescription.followUpDate).toISOString().substring(0, 10)
      : '';
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

  openVersion(prescription: LoadedPrescription) {
    this.selectPrescription(prescription);
    this.message = `Opened version v${prescription.version}.`;
    this.error = '';
  }

  canEditVersion(prescription: LoadedPrescription) {
    return prescription.id === this.loadedPrescriptions[0]?.id && prescription.status !== 'PUBLISHED';
  }

  startFollowUpFrom(prescription: LoadedPrescription) {
    this.editingPrescriptionId = '';
    this.methodOptionId = prescription.methodOptionId || '';
    this.diagnosedDiseaseOptionId = prescription.diagnosedDiseaseOptionId || '';
    this.diagnosis = prescription.diagnosis || '';
    this.advice = prescription.advice || '';
    this.notes = prescription.notes || '';
    this.followUpDate = '';
    this.status = 'DRAFT';
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
    this.message = `Follow-up draft started from v${prescription.version}.`;
    this.error = '';
  }

  versionBadgeClass(status: LoadedPrescription['status']) {
    if (status === 'PUBLISHED') {
      return 'badge published';
    }
    if (status === 'DRAFT') {
      return 'badge draft';
    }

    return 'badge cancelled';
  }

  resetEditorForFollowUp() {
    this.editingPrescriptionId = '';
    this.status = 'DRAFT';
    this.diagnosis = '';
    this.advice = '';
    this.notes = '';
    this.followUpDate = '';
    this.medicineRows = [this.newMedicineRow()];
  }

  private normalizeMedicineName(name: string) {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  prescriptionSafetyReport(): {
    duplicateMedicines: string[];
    conflictingMedicines: string[];
  } {
    const groups = new Map<string, MedicineRow[]>();
    for (const row of this.medicineRows) {
      const key = this.normalizeMedicineName(row.medicineName);
      if (!key) {
        continue;
      }
      const list = groups.get(key);
      if (list) {
        list.push(row);
      } else {
        groups.set(key, [row]);
      }
    }

    const duplicateMedicines: string[] = [];
    const conflictingMedicines: string[] = [];
    for (const rows of groups.values()) {
      if (rows.length < 2) {
        continue;
      }
      const displayName = rows[0].medicineName.trim() || rows[0].medicineName;
      duplicateMedicines.push(displayName);
      const signatures = new Set(
        rows.map((r) => `${(r.dose || '').trim()}|${(r.frequency || '').trim()}`)
      );
      if (signatures.size > 1) {
        conflictingMedicines.push(displayName);
      }
    }

    return { duplicateMedicines, conflictingMedicines };
  }

  dismissSafetyConfirm() {
    this.pendingSaveStatus = null;
  }

  async confirmAndSave() {
    if (!this.pendingSaveStatus) {
      return;
    }
    const status = this.pendingSaveStatus;
    this.pendingSaveStatus = null;
    await this.executeSave(status);
  }

  private buildPayload(targetStatus: 'DRAFT' | 'PUBLISHED') {
    return {
      methodOptionId: this.methodOptionId,
      diagnosedDiseaseOptionId: this.diagnosedDiseaseOptionId,
      diagnosis: this.diagnosis,
      notes: this.notes,
      advice: this.advice || undefined,
      followUpDate: this.followUpDate || undefined,
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

  savePrescription(targetStatus: 'DRAFT' | 'PUBLISHED') {
    this.message = '';
    this.error = '';
    this.pendingSaveStatus = null;

    if (!this.consultationId || !this.methodOptionId || !this.diagnosedDiseaseOptionId || !this.diagnosis || !this.notes) {
      this.error = 'Please fill consultation id, method, diagnosed disease, diagnosis and notes.';
      return;
    }

    if (this.medicineRows.some((row) => !row.medicineName.trim())) {
      this.error = 'Each medicine row must include medicine name.';
      return;
    }

    const { duplicateMedicines, conflictingMedicines } = this.prescriptionSafetyReport();
    if (duplicateMedicines.length || conflictingMedicines.length) {
      this.pendingSaveStatus = targetStatus;
      return;
    }

    void this.executeSave(targetStatus);
  }

  private async executeSave(targetStatus: 'DRAFT' | 'PUBLISHED') {
    this.saving = true;
    this.error = '';
    try {
      const payload = this.buildPayload(targetStatus);
      if (this.editingPrescriptionId) {
        await firstValueFrom(
          this.http.put(`${this.apiBase}/doctor/prescriptions/${this.editingPrescriptionId}`, payload)
        );
        this.message = targetStatus === 'PUBLISHED' ? 'Draft updated and published.' : 'Draft updated.';
      } else {
        await firstValueFrom(
          this.http.post(`${this.apiBase}/doctor/appointments/${this.consultationId}/prescriptions`, payload)
        );
        this.message = targetStatus === 'PUBLISHED' ? 'Follow-up prescription created and published.' : 'Draft created.';
      }
      await this.loadConsultationPrescriptions();
    } catch {
      this.error = 'Could not save prescription. Check consultation assignment and draft state.';
    } finally {
      this.saving = false;
    }
  }

  async loadTemplates() {
    this.templatesLoading = true;
    try {
      const res = await firstValueFrom(
        this.http.get<{ templates: PrescriptionTemplate[] }>(`${this.apiBase}/doctor/prescription-templates`)
      );
      this.templates = res.templates || [];
    } catch {
      // non-blocking — silently skip
    } finally {
      this.templatesLoading = false;
    }
  }

  applyTemplate(template: PrescriptionTemplate) {
    this.diagnosis = template.diagnosis || '';
    this.advice = template.advice || '';
    this.notes = template.notes || '';
    this.medicineRows = template.items.length
      ? template.items.map((item) => ({
          medicineName: item.medicineName,
          strength: item.strength || '',
          dose: item.dose || '',
          frequency: item.frequency || '',
          duration: item.duration || '',
          durationDays: 0,
          instructions: item.instructions || '',
          intakeTimesText: ''
        }))
      : [this.newMedicineRow()];
    this.message = `Template "${template.name}" applied. Review and adjust before saving.`;
  }

  async saveAsTemplate() {
    const name = this.templateName.trim();
    if (!name) { this.savingTemplateError = 'Enter a template name.'; return; }
    if (!this.medicineRows.some((r) => r.medicineName.trim())) {
      this.savingTemplateError = 'Add at least one medicine.'; return;
    }
    this.savingTemplate = true;
    this.savingTemplateError = '';
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}/doctor/prescription-templates`, {
          name,
          diagnosis: this.diagnosis,
          advice: this.advice,
          notes: this.notes,
          items: this.medicineRows
            .filter((r) => r.medicineName.trim())
            .map((r, i) => ({
              medicineName: r.medicineName,
              strength: r.strength || undefined,
              dose: r.dose || undefined,
              frequency: r.frequency || undefined,
              duration: r.duration || undefined,
              instructions: r.instructions || undefined,
              sortOrder: i
            }))
        })
      );
      this.templateName = '';
      this.showSaveTemplateForm = false;
      await this.loadTemplates();
      this.message = `Template "${name}" saved.`;
    } catch {
      this.savingTemplateError = 'Could not save template.';
    } finally {
      this.savingTemplate = false;
    }
  }

  async deleteTemplate(id: string) {
    this.deletingTemplateId = id;
    try {
      await firstValueFrom(this.http.delete(`${this.apiBase}/doctor/prescription-templates/${id}`));
      this.templates = this.templates.filter((t) => t.id !== id);
    } catch {
      this.error = 'Could not delete template.';
    } finally {
      this.deletingTemplateId = '';
    }
  }

  async closeConsultation() {
    this.saving = true;
    this.error = '';
    try {
      await firstValueFrom(
        this.http.post(`${this.apiBase}/consultations/${this.consultationId}/complete`, {})
      );
      this.consultationStatus = 'COMPLETED';
      this.confirmingClose = false;
      this.message = 'Consultation marked as completed.';
    } catch {
      this.error = 'Could not close consultation.';
    } finally {
      this.saving = false;
    }
  }
}
