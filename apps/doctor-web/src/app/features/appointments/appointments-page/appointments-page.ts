import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AppointmentsPrescriptionsService } from './appointments-prescriptions.service';
import type {
  LoadedPrescription,
  MedicineRow,
  OptionType,
  PrescriptionOption,
  PrescriptionTemplate
} from './appointments-page.types';
import { analyzePrescriptionSafety, type PrescriptionSafetyReport } from '../prescription-safety';

@Component({
  selector: 'app-appointments-page',
  imports: [FormsModule, DatePipe],
  templateUrl: './appointments-page.html',
  styleUrl: './appointments-page.scss'
})
export class AppointmentsPage {
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

  templates: PrescriptionTemplate[] = [];
  templatesLoading = false;
  showSaveTemplateForm = false;
  templateName = '';
  savingTemplate = false;
  savingTemplateError = '';
  deletingTemplateId = '';
  medicineRows: MedicineRow[] = [this.newMedicineRow()];

  constructor(
    private readonly prescriptions: AppointmentsPrescriptionsService,
    private readonly route: ActivatedRoute
  ) {
    this.consultationId = this.route.snapshot.queryParamMap.get('consultationId') || '';
    void this.loadOptions();
    void this.loadTemplates();
    if (this.consultationId) {
      void this.loadConsultationPrescriptions();
    }
  }

  async loadOptions() {
    this.error = '';
    try {
      const [methods, diagnosedDiseases] = await Promise.all([
        this.prescriptions.loadOptions('METHOD'),
        this.prescriptions.loadOptions('DIAGNOSED_DISEASE')
      ]);
      this.methods = methods;
      this.diagnosedDiseases = diagnosedDiseases;
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
      const response = await this.prescriptions.addOption(type, label);

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
      const response = await this.prescriptions.loadConsultationPrescriptions(this.consultationId);
      this.loadedPrescriptions = response.prescriptions || [];
      this.consultationStatus = response.consultation?.status || '';
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

  prescriptionSafetyReport(): PrescriptionSafetyReport {
    return analyzePrescriptionSafety(this.medicineRows);
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
    await this.executeSave(status, true);
  }

  private buildPayload(targetStatus: 'DRAFT' | 'PUBLISHED', safetyAcknowledged = false) {
    return {
      methodOptionId: this.methodOptionId,
      diagnosedDiseaseOptionId: this.diagnosedDiseaseOptionId,
      diagnosis: this.diagnosis,
      notes: this.notes,
      advice: this.advice || undefined,
      followUpDate: this.followUpDate || undefined,
      status: targetStatus,
      safetyAcknowledged,
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

    const safety = this.prescriptionSafetyReport();
    if (safety.requiresConfirmation) {
      this.pendingSaveStatus = targetStatus;
      return;
    }

    void this.executeSave(targetStatus, false);
  }

  private async executeSave(targetStatus: 'DRAFT' | 'PUBLISHED', safetyAcknowledged: boolean) {
    this.saving = true;
    this.error = '';
    try {
      const payload = this.buildPayload(targetStatus, safetyAcknowledged);
      await this.prescriptions.savePrescription(
        this.consultationId,
        this.editingPrescriptionId || null,
        payload
      );
      this.message = this.editingPrescriptionId
        ? targetStatus === 'PUBLISHED'
          ? 'Draft updated and published.'
          : 'Draft updated.'
        : targetStatus === 'PUBLISHED'
          ? 'Follow-up prescription created and published.'
          : 'Draft created.';
      await this.loadConsultationPrescriptions();
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        const body = error.error as { message?: string; safety?: PrescriptionSafetyReport };
        if (body.safety?.requiresConfirmation) {
          this.pendingSaveStatus = targetStatus;
        }
        this.error = body.message || 'Review safety warnings and confirm to proceed.';
      } else if (error instanceof HttpErrorResponse) {
        this.error = (error.error as { message?: string })?.message || 'Could not save prescription. Check consultation assignment and draft state.';
      } else {
        this.error = 'Could not save prescription. Check consultation assignment and draft state.';
      }
    } finally {
      this.saving = false;
    }
  }

  async loadTemplates() {
    this.templatesLoading = true;
    try {
      this.templates = await this.prescriptions.loadTemplates();
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
      await this.prescriptions.saveTemplate({
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
      });
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
      await this.prescriptions.deleteTemplate(id);
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
      await this.prescriptions.closeConsultation(this.consultationId);
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
