import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import {
  ConsultationNavigationService,
  type PrescriptionTab,
} from '../../../core/services/consultation-navigation.service';
import { ConsultationApiService } from '../../../core/services/consultation-api.service';
import type { DoctorConsultation } from '../../../core/types/consultation.types';
import { AppointmentsPrescriptionsService } from './appointments-prescriptions.service';
import { PrescriptionPdfService } from '../../../core/services/prescription-pdf.service';
import { ProviderSessionService } from '../../../core/services/provider-session';
import { ConsultationChatPanelComponent } from '../../../shared/consultation-chat-panel/consultation-chat-panel';
import { ConsultationContextHeaderComponent } from '../../../shared/consultation-context-header/consultation-context-header';
import { ConsultationIntakePanelComponent } from '../../../shared/consultation-intake-panel/consultation-intake-panel';
import type {
  LoadedPrescription,
  MedicineRow,
  OptionType,
  PrescriptionOption,
  PrescriptionTemplate,
} from './appointments-page.types';
import { analyzePrescriptionSafety, type PrescriptionSafetyReport } from '../prescription-safety';
import { DiseaseCatalogService } from '../../../core/services/disease-catalog.service';
import {
  PatientHealthProfileComponent,
  type PatientClinicalProfile,
} from '../../../shared/patient-health-profile/patient-health-profile';
import { ViewportService } from '@hopehub/platform-ui';
import {
  PrescriptionApproachWorkflowComponent,
  type PrescriptionHandoffApply,
} from '../panels/prescription-approach-workflow/prescription-approach-workflow';
import { PrescriptionConsultationPickerComponent } from '../panels/prescription-consultation-picker/prescription-consultation-picker';

export type PrescriptionMobileTab = 'context' | 'setup' | 'remedies' | 'review';

function newMedicineRow(): MedicineRow {
  return {
    medicineName: '',
    strength: '',
    dose: '',
    frequency: '',
    duration: '',
    durationDays: 7,
    instructions: '',
    intakeTimesText: '09:00,21:00',
  };
}

function emptyPrescriptionModel() {
  return {
    consultationId: '',
    caseAnalysisId: '',
    methodOptionId: '',
    diagnosedDiseaseOptionId: '',
    diagnosis: '',
    notes: '',
    advice: '',
    followUpDate: '',
    editingPrescriptionId: '',
    medicineRows: [newMedicineRow()] as MedicineRow[],
  };
}

@Component({
  selector: 'app-appointments-page',
  imports: [
    FormField,
    DatePipe,
    PatientHealthProfileComponent,
    RouterLink,
    ConsultationContextHeaderComponent,
    ConsultationIntakePanelComponent,
    ConsultationChatPanelComponent,
    PrescriptionApproachWorkflowComponent,
    PrescriptionConsultationPickerComponent,
  ],
  templateUrl: './appointments-page.html',
  styleUrl: './appointments-page.scss',
})
export class AppointmentsPage implements OnInit {
  private readonly prescriptions = inject(AppointmentsPrescriptionsService);
  private readonly prescriptionPdf = inject(PrescriptionPdfService);
  private readonly session = inject(ProviderSessionService);
  private readonly consultationApi = inject(ConsultationApiService);
  private readonly diseaseCatalog = inject(DiseaseCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly consultationNav = inject(ConsultationNavigationService);
  private readonly viewport = inject(ViewportService);

  private lastSyncedConsultationId = '';

  readonly isMobile = computed(() => this.viewport.isMobile());
  readonly selectedDiseaseName = computed(() => {
    const optionId = this.prescriptionModel().diagnosedDiseaseOptionId;
    const match = this.diagnosedDiseases.find((item) => item.prescriptionOptionId === optionId);
    return match?.name || this.consultationContext?.disease?.name || '';
  });
  readonly mobileTab = signal<PrescriptionMobileTab>('setup');
  readonly mobileContextOpen = signal(false);

  defaultMethodOptionId = '';

  readonly caseAnalysisPath = ROUTE_PATHS.CASE_ANALYSIS;
  readonly worklistPath = ROUTE_PATHS.WORKLIST;
  readonly prescriptionModel = signal(emptyPrescriptionModel());
  readonly prescriptionForm = form(this.prescriptionModel);
  readonly templateModel = signal({ templateName: '' });
  readonly templateForm = form(this.templateModel);
  readonly optionDraftModel = signal({
    newMethod: '',
    newDiagnosedDisease: '',
    diagnosedDiseaseSearch: '',
  });
  readonly optionDraftForm = form(this.optionDraftModel);

  status: 'DRAFT' | 'PUBLISHED' = 'DRAFT';
  loadedPrescriptions: LoadedPrescription[] = [];

  methods: PrescriptionOption[] = [];
  diagnosedDiseases: Array<{ id: string; name: string; prescriptionOptionId: string | null }> = [];

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
  consultationContext: DoctorConsultation | null = null;
  pdfBusyId = '';
  pdfError = '';

  setMobileTab(tab: PrescriptionMobileTab) {
    this.mobileTab.set(tab);
  }

  toggleMobileContext() {
    this.mobileContextOpen.update((open) => !open);
  }

  showContextPane() {
    return !this.isMobile() || this.mobileTab() === 'context';
  }

  showSetupPane() {
    return !this.isMobile() || this.mobileTab() === 'setup';
  }

  showRemediesPane() {
    return !this.isMobile() || this.mobileTab() === 'remedies';
  }

  showReviewPane() {
    return !this.isMobile() || this.mobileTab() === 'review';
  }

  ngOnInit() {
    void this.loadOptions();
    void this.loadTemplates();
    void this.loadDoctorDefaultApproach();
    this.route.paramMap.subscribe((params) => {
      void this.syncFromRoute(params, this.route.snapshot.queryParamMap);
    });
    this.route.queryParamMap.subscribe((query) => {
      void this.syncFromRoute(this.route.snapshot.paramMap, query);
    });
  }

  private async syncFromRoute(paramMap: ParamMap, queryMap: ParamMap) {
    const routeConsultationId = paramMap.get('consultationId')?.trim() || '';
    const queryConsultationId = queryMap.get('consultationId')?.trim() || '';
    const consultationId = routeConsultationId || queryConsultationId;

    if (
      !routeConsultationId &&
      queryConsultationId &&
      this.router.url.includes(`/${ROUTE_PATHS.APPOINTMENTS}`)
    ) {
      await this.consultationNav.openPrescription(queryConsultationId, {
        caseAnalysisId: queryMap.get('caseAnalysisId'),
        remedy: queryMap.get('remedy'),
        companionRemedy: queryMap.get('companionRemedy'),
        advice: queryMap.get('advice'),
        diagnosis: queryMap.get('diagnosis'),
        methodOptionId: queryMap.get('methodOptionId'),
        tab: this.parsePrescriptionTab(queryMap.get('tab')),
      });
      return;
    }

    const tab = this.parsePrescriptionTab(queryMap.get('tab'));
    if (tab) {
      this.mobileTab.set(tab);
    }

    const handoffPatch = this.handoffPatchFromQuery(queryMap);
    const consultationChanged = consultationId !== this.lastSyncedConsultationId;

    if (consultationId) {
      this.prescriptionModel.update((model) => ({
        ...model,
        consultationId,
        ...handoffPatch,
      }));
      if (consultationChanged) {
        this.lastSyncedConsultationId = consultationId;
        await this.loadConsultationPrescriptions();
        await this.loadConsultationContext();
      } else if (Object.keys(handoffPatch).length) {
        this.prescriptionModel.update((model) => ({ ...model, ...handoffPatch }));
      }
      this.applyDefaultMethodIfEmpty();
    } else if (consultationChanged) {
      this.lastSyncedConsultationId = '';
      this.prescriptionModel.set(emptyPrescriptionModel());
    }
  }

  private parsePrescriptionTab(value: string | null): PrescriptionTab | null {
    if (value === 'context' || value === 'setup' || value === 'remedies' || value === 'review') {
      return value;
    }
    return null;
  }

  private handoffPatchFromQuery(queryMap: ParamMap) {
    const patch: Partial<ReturnType<typeof emptyPrescriptionModel>> = {};
    const caseAnalysisId = queryMap.get('caseAnalysisId');
    const methodOptionId = queryMap.get('methodOptionId');
    const remedy = queryMap.get('remedy');
    const companionRemedy = queryMap.get('companionRemedy');
    const advice = queryMap.get('advice');
    const diagnosis = queryMap.get('diagnosis');

    if (caseAnalysisId) patch.caseAnalysisId = caseAnalysisId;
    if (methodOptionId) patch.methodOptionId = methodOptionId;
    if (advice) patch.advice = advice;
    if (diagnosis || remedy) patch.diagnosis = diagnosis || remedy || '';

    if (remedy || companionRemedy) {
      const medicineRows = [...this.prescriptionModel().medicineRows];
      if (remedy) {
        medicineRows[0] = { ...(medicineRows[0] || newMedicineRow()), medicineName: remedy };
      }
      if (companionRemedy) {
        if (medicineRows.length > 1) {
          medicineRows[1] = { ...medicineRows[1], medicineName: companionRemedy };
        } else {
          medicineRows.push({ ...newMedicineRow(), medicineName: companionRemedy });
        }
      }
      patch.medicineRows = medicineRows;
    }

    return patch;
  }

  async loadConsultationContext() {
    const consultationId = this.prescriptionModel().consultationId.trim();
    if (!consultationId) {
      this.consultationContext = null;
      return;
    }

    try {
      this.consultationContext = await this.consultationApi.loadConsultation(consultationId);
    } catch {
      this.consultationContext = null;
    }
  }

  async loadDoctorDefaultApproach() {
    try {
      const session = await this.session.load();
      this.defaultMethodOptionId = session.doctorProfile?.defaultMethodOptionId || '';
      this.applyDefaultMethodIfEmpty();
    } catch {
      // ignore - provider can still pick manually
    }
  }

  private applyDefaultMethodIfEmpty() {
    if (!this.defaultMethodOptionId) return;
    this.prescriptionModel.update((model) =>
      model.methodOptionId ? model : { ...model, methodOptionId: this.defaultMethodOptionId },
    );
  }

  async loadOptions() {
    this.error = '';
    try {
      const search = this.optionDraftModel().diagnosedDiseaseSearch;
      const [methods, diseaseResponse] = await Promise.all([
        this.prescriptions.loadOptions('METHOD'),
        this.diseaseCatalog.loadDiseases({ q: search || undefined, grouped: false }),
      ]);
      this.methods = methods;
      this.diagnosedDiseases = (diseaseResponse.diseases || []).map((disease) => ({
        id: disease.id,
        name: disease.name,
        prescriptionOptionId: disease.prescriptionOptionId ?? null,
      }));
      this.applyDefaultMethodIfEmpty();
    } catch {
      this.error = 'Could not load dropdown options. Login with an API-backed provider account.';
    }
  }

  async searchDiagnosedDiseases() {
    try {
      const diseaseResponse = await this.diseaseCatalog.loadDiseases({
        q: this.optionDraftModel().diagnosedDiseaseSearch || undefined,
        grouped: false,
      });
      this.diagnosedDiseases = (diseaseResponse.diseases || []).map((disease) => ({
        id: disease.id,
        name: disease.name,
        prescriptionOptionId: disease.prescriptionOptionId ?? null,
      }));
    } catch {
      this.error = 'Could not search diagnosed diseases.';
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
      if (type === 'METHOD') {
        const response = await this.prescriptions.addOption(type, label);
        this.optionDraftModel.update((model) => ({ ...model, newMethod: '' }));
        this.methods = [...this.methods, response.option].sort((a, b) =>
          a.label.localeCompare(b.label),
        );
        this.prescriptionModel.update((model) => ({
          ...model,
          methodOptionId: response.option.id,
        }));
      } else {
        const disease = await this.diseaseCatalog.createDisease({
          name: label,
          publicCategory: 'miscellaneous',
          description: `${label} - provider-added condition`,
        });
        await this.loadOptions();
        const optionId = disease.prescriptionOptionId;
        if (optionId) {
          this.prescriptionModel.update((model) => ({
            ...model,
            diagnosedDiseaseOptionId: optionId,
          }));
        }
        this.optionDraftModel.update((model) => ({ ...model, newDiagnosedDisease: '' }));
      }
      this.message = 'Option added successfully.';
    } catch {
      this.error = 'Could not add option.';
    }
  }

  addMedicineRow() {
    this.prescriptionModel.update((model) => ({
      ...model,
      medicineRows: [...model.medicineRows, newMedicineRow()],
    }));
  }

  removeMedicineRow(index: number) {
    const medicineRows = this.prescriptionModel().medicineRows;
    if (medicineRows.length === 1) {
      return;
    }

    this.prescriptionModel.update((model) => ({
      ...model,
      medicineRows: model.medicineRows.filter((_, idx) => idx !== index),
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
      await this.loadConsultationContext();
      this.patientClinical = response.patient
        ? {
            allergies: response.patient.allergies,
            currentMedications: response.patient.currentMedications,
            chronicConditions: response.patient.chronicConditions,
          }
        : null;
      if (this.loadedPrescriptions.length) {
        this.selectPrescription(this.loadedPrescriptions[0]);
      } else {
        this.resetEditorForFollowUp();
        this.applyDefaultMethodIfEmpty();
        this.message = 'No prescription history found for this consultation.';
      }
    } catch {
      this.error = 'Could not load prescription history.';
    }
  }

  onCaseAnalysisIdChange(caseAnalysisId: string) {
    this.prescriptionModel.update((model) => ({ ...model, caseAnalysisId }));
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { caseAnalysisId: caseAnalysisId || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  applyApproachHandoff(handoff: PrescriptionHandoffApply) {
    this.prescriptionModel.update((model) => {
      const medicineRows = [...model.medicineRows];
      if (handoff.remedy.trim()) {
        medicineRows[0] = {
          ...(medicineRows[0] || newMedicineRow()),
          medicineName: handoff.remedy.trim(),
        };
      }
      if (handoff.companionRemedy?.trim()) {
        if (medicineRows.length > 1) {
          medicineRows[1] = {
            ...medicineRows[1],
            medicineName: handoff.companionRemedy.trim(),
          };
        } else {
          medicineRows.push({ ...newMedicineRow(), medicineName: handoff.companionRemedy.trim() });
        }
      }
      return {
        ...model,
        medicineRows,
        advice: handoff.advice?.trim() || model.advice,
        diagnosis: handoff.remedy.trim() || model.diagnosis,
      };
    });
    this.message = 'Approach data applied to remedy rows.';
  }

  selectPrescription(prescription: LoadedPrescription) {
    this.prescriptionModel.update((model) => ({
      ...model,
      editingPrescriptionId: prescription.id,
      caseAnalysisId: prescription.caseAnalysisId || model.caseAnalysisId,
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
            intakeTimesText: (item.intakeTimes || ['09:00']).join(','),
          }))
        : [newMedicineRow()],
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
    return (
      prescription.id === this.loadedPrescriptions[0]?.id && prescription.status !== 'PUBLISHED'
    );
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
            intakeTimesText: (item.intakeTimes || ['09:00']).join(','),
          }))
        : [newMedicineRow()],
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
      medicineRows: [newMedicineRow()],
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
      ...(form.caseAnalysisId ? { caseAnalysisId: form.caseAnalysisId } : {}),
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
          .filter((value) => /^\d{2}:\d{2}$/.test(value)),
      })),
    };
  }

  savePrescription(targetStatus: 'DRAFT' | 'PUBLISHED') {
    this.message = '';
    this.error = '';
    this.pendingSaveStatus = null;

    const form = this.prescriptionModel();
    if (
      !form.consultationId ||
      !form.methodOptionId ||
      !form.diagnosedDiseaseOptionId ||
      !form.diagnosis ||
      !form.notes
    ) {
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
        payload,
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
        this.error =
          (error.error as { message?: string })?.message ||
          'Could not save prescription. Check consultation assignment and draft state.';
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
            intakeTimesText: '',
          }))
        : [newMedicineRow()],
    }));
    this.message = `Template "${template.name}" applied. Review and adjust before saving.`;
  }

  async saveAsTemplate() {
    const name = this.templateModel().templateName.trim();
    const form = this.prescriptionModel();
    if (!name) {
      this.savingTemplateError = 'Enter a template name.';
      return;
    }
    if (!form.medicineRows.some((r) => r.medicineName.trim())) {
      this.savingTemplateError = 'Add at least one medicine.';
      return;
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
            sortOrder: i,
          })),
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
