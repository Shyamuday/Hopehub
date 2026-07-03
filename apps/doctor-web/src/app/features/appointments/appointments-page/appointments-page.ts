import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute } from '@angular/router';
import { RouterLink } from '@angular/router';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { AppointmentsPrescriptionsService } from './appointments-prescriptions.service';
import { PrescriptionPdfService } from '../../../core/services/prescription-pdf.service';
import type {
  LoadedPrescription,
  MedicineRow,
  OptionType,
  PrescriptionOption,
  PrescriptionTemplate
} from './appointments-page.types';
import { analyzePrescriptionSafety, type PrescriptionSafetyReport } from '../prescription-safety';
import {
  PatientHealthProfileComponent,
  type PatientClinicalProfile
} from '../../../shared/patient-health-profile/patient-health-profile';

function newMedicineRow(): MedicineRow {
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

function emptyPrescriptionModel() {
  return {
    consultationId: '',
    methodOptionId: '',
    diagnosedDiseaseOptionId: '',
    diagnosis: '',
    notes: '',
    advice: '',
    followUpDate: '',
    editingPrescriptionId: '',
    medicineRows: [newMedicineRow()] as MedicineRow[]
  };
}

@Component({
  selector: 'app-appointments-page',
  imports: [FormField, DatePipe, PatientHealthProfileComponent, RouterLink],
  templateUrl: './appointments-page.html',
  styleUrl: './appointments-page.scss'
})
export class AppointmentsPage {
  private readonly prescriptions = inject(AppointmentsPrescriptionsService);
  private readonly prescriptionPdf = inject(PrescriptionPdfService);
  private readonly route = inject(ActivatedRoute);

  readonly caseAnalysisPath = ROUTE_PATHS.CASE_ANALYSIS;
  readonly prescriptionModel = signal(this.createInitialPrescriptionModel());
  readonly prescriptionForm = form(this.prescriptionModel);
  readonly templateModel = signal({ templateName: '' });
  readonly templateForm = form(this.templateModel);
  readonly optionDraftModel = signal({ newMethod: '', newDiagnosedDisease: '' });
  readonly optionDraftForm = form(this.optionDraftModel);

  status: 'DRAFT' | 'PUBLISHED' = 'DRAFT';
  loadedPrescriptions: LoadedPrescription[] = [];

  methods: PrescriptionOption[] = [];
  diagnosedDiseases: PrescriptionOption[] = [];

  message = '';
  error = '';
  saving = false;
  pendingSaveStatus: 'DRAFT' | 'PUBLISHED' | null = null;
  consultationStatus = '';
  confirmingClose = false;

  templates: PrescriptionTemplate[] = [];
  templatesLoading = false;
  showSaveTemplateForm = false;
  savingTemplate = false;
  savingTemplateError = '';
  deletingTemplateId = '';
  patientClinical: PatientClinicalProfile | null = null;
  pdfBusyId = '';
  pdfError = '';

  constructor() {
    void this.loadOptions();
    void this.loadTemplates();
    if (this.prescriptionModel().consultationId) {
      void this.loadConsultationPrescriptions();
    }
  }

  private createInitialPrescriptionModel() {
    const consultationId = this.route.snapshot.queryParamMap.get('consultationId') || '';
    const remedySuggestion = this.route.snapshot.queryParamMap.get('remedy') || '';
    const medicineRows = [newMedicineRow()];
    if (remedySuggestion) {
      medicineRows[0].medicineName = remedySuggestion;
    }
    return { ...emptyPrescriptionModel(), consultationId, medicineRows };
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

  async addOption(type: OptionType) {
    this.message = '';
    this.error = '';

    const draft = this.optionDraftModel();
    const label = type === 'METHOD' ? draft.newMethod.trim() : draft.newDiagnosedDisease.trim();
    if (!label) {
      return;
    }

    try {
      const response = await this.prescriptions.addOption(type, label);

      if (type === 'METHOD') {
        this.optionDraftModel.update((model) => ({ ...model, newMethod: '' }));
        this.methods = [...this.methods, response.option].sort((a, b) => a.label.localeCompare(b.label));
        this.prescriptionModel.update((model) => ({ ...model, methodOptionId: response.option.id }));
      } else {
        this.optionDraftModel.update((model) => ({ ...model, newDiagnosedDisease: '' }));
        this.diagnosedDiseases = [...this.diagnosedDiseases, response.option].sort((a, b) =>
          a.label.localeCompare(b.label)
        );
        this.prescriptionModel.update((model) => ({ ...model, diagnosedDiseaseOptionId: response.option.id }));
      }
      this.message = 'Option added successfully.';
    } catch {
      this.error = 'Could not add option.';
    }
  }

  addMedicineRow() {
    this.prescriptionModel.update((model) => ({
      ...model,
      medicineRows: [...model.medicineRows, newMedicineRow()]
    }));
  }

  removeMedicineRow(index: number) {
    const medicineRows = this.prescriptionModel().medicineRows;
    if (medicineRows.length === 1) {
      return;
    }

    this.prescriptionModel.update((model) => ({
      ...model,
      medicineRows: model.medicineRows.filter((_, idx) => idx !== index)
    }));
  }

  async loadConsultationPrescriptions() {
    this.message = '';
    this.error = '';
    this.prescriptionModel.update((model) => ({ ...model, editingPrescriptionId: '' }));
    const consultationId = this.prescriptionModel().consultationId.trim();
    if (!consultationId) {
      this.error = 'Please enter consultation id.';
      return;
    }

    try {
      const response = await this.prescriptions.loadConsultationPrescriptions(consultationId);
      this.loadedPrescriptions = response.prescriptions || [];
      this.consultationStatus = response.consultation?.status || '';
      this.patientClinical = response.patient
        ? {
            allergies: response.patient.allergies,
            currentMedications: response.patient.currentMedications,
            chronicConditions: response.patient.chronicConditions
          }
        : null;
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
    this.prescriptionModel.update((model) => ({
      ...model,
      editingPrescriptionId: prescription.id,
      methodOptionId: prescription.methodOptionId || '',
      diagnosedDiseaseOptionId: prescription.diagnosedDiseaseOptionId || '',
      diagnosis: prescription.diagnosis || '',
      advice: prescription.advice || '',
      notes: prescription.notes || '',
      followUpDate: prescription.followUpDate
        ? new Date(prescription.followUpDate).toISOString().substring(0, 10)
        : '',
      medicineRows: (prescription.items || []).length
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
        : [newMedicineRow()]
    }));
    this.status = prescription.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
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
    this.prescriptionModel.update((model) => ({
      ...model,
      editingPrescriptionId: '',
      methodOptionId: prescription.methodOptionId || '',
      diagnosedDiseaseOptionId: prescription.diagnosedDiseaseOptionId || '',
      diagnosis: prescription.diagnosis || '',
      advice: prescription.advice || '',
      notes: prescription.notes || '',
      followUpDate: '',
      medicineRows: (prescription.items || []).length
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
        : [newMedicineRow()]
    }));
    this.status = 'DRAFT';
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
    this.prescriptionModel.update((model) => ({
      ...model,
      editingPrescriptionId: '',
      diagnosis: '',
      advice: '',
      notes: '',
      followUpDate: '',
      medicineRows: [newMedicineRow()]
    }));
    this.status = 'DRAFT';
  }

  prescriptionSafetyReport(): PrescriptionSafetyReport {
    return analyzePrescriptionSafety(this.prescriptionModel().medicineRows);
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
    const form = this.prescriptionModel();
    return {
      methodOptionId: form.methodOptionId,
      diagnosedDiseaseOptionId: form.diagnosedDiseaseOptionId,
      diagnosis: form.diagnosis,
      notes: form.notes,
      advice: form.advice || undefined,
      followUpDate: form.followUpDate || undefined,
      status: targetStatus,
      safetyAcknowledged,
      items: form.medicineRows.map((row) => ({
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

    const form = this.prescriptionModel();
    if (!form.consultationId || !form.methodOptionId || !form.diagnosedDiseaseOptionId || !form.diagnosis || !form.notes) {
      this.error = 'Please fill consultation id, method, diagnosed disease, diagnosis and notes.';
      return;
    }

    if (form.medicineRows.some((row) => !row.medicineName.trim())) {
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
    const form = this.prescriptionModel();
    this.saving = true;
    this.error = '';
    try {
      const payload = this.buildPayload(targetStatus, safetyAcknowledged);
      await this.prescriptions.savePrescription(
        form.consultationId,
        form.editingPrescriptionId || null,
        payload
      );
      this.message = form.editingPrescriptionId
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
    this.prescriptionModel.update((model) => ({
      ...model,
      diagnosis: template.diagnosis || '',
      advice: template.advice || '',
      notes: template.notes || '',
      medicineRows: template.items.length
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
        : [newMedicineRow()]
    }));
    this.message = `Template "${template.name}" applied. Review and adjust before saving.`;
  }

  async saveAsTemplate() {
    const name = this.templateModel().templateName.trim();
    const form = this.prescriptionModel();
    if (!name) { this.savingTemplateError = 'Enter a template name.'; return; }
    if (!form.medicineRows.some((r) => r.medicineName.trim())) {
      this.savingTemplateError = 'Add at least one medicine.'; return;
    }
    this.savingTemplate = true;
    this.savingTemplateError = '';
    try {
      await this.prescriptions.saveTemplate({
        name,
        diagnosis: form.diagnosis,
        advice: form.advice,
        notes: form.notes,
        items: form.medicineRows
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
      this.templateModel.set({ templateName: '' });
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

  async sharePublishedPdf(prescriptionId: string) {
    await this.runPdfAction(prescriptionId, async () => {
      const meta = await this.prescriptionPdf.fetchShareMeta(prescriptionId);
      const url = this.prescriptionPdf.whatsAppUrl(meta.shareText);
      window.open(url, '_blank', 'noopener,noreferrer');
      this.message = 'WhatsApp share opened — attach the PDF if needed after download.';
    });
  }

  async downloadPublishedPdf(prescriptionId: string) {
    await this.runPdfAction(prescriptionId, () => this.prescriptionPdf.download(prescriptionId));
  }

  async viewPublishedPdf(prescriptionId: string) {
    await this.runPdfAction(prescriptionId, () => this.prescriptionPdf.view(prescriptionId));
  }

  isPdfBusy(prescriptionId: string) {
    return this.pdfBusyId === prescriptionId;
  }

  private async runPdfAction(prescriptionId: string, action: () => Promise<void>) {
    this.pdfBusyId = prescriptionId;
    this.pdfError = '';
    try {
      await action();
    } catch {
      this.pdfError = 'Could not open prescription PDF.';
    } finally {
      this.pdfBusyId = '';
    }
  }

  async closeConsultation() {
    const consultationId = this.prescriptionModel().consultationId;
    this.saving = true;
    this.error = '';
    try {
      await this.prescriptions.closeConsultation(consultationId);
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
