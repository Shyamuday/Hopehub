import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  type CghsFormularyEntry,
  filterFormularyOptions,
  formularyOptionValue,
  matchFormularyKey,
  parseFormularyPick
} from './cghs-formulary';
import {
  allMethodIntakeStorageKeys,
  type MethodIntakeAddonFile,
  type MethodIntakeConfig,
  type MethodIntakeField,
  type MethodIntakeFlatRow,
  type MethodIntakeProfile,
  flattenMethodIntakeFields,
  migrateLegacyMiasmTenNonRanked,
  migrateLegacyRankedFieldsForGroup,
  methodIntakeRowsWithSectionHeaders,
  resolveMethodIntakeProfile
} from './method-intake';
import { KingdomDiagnosisPanelComponent } from './kingdom-diagnosis-panel/kingdom-diagnosis-panel.component';
import { MiasmDiagnosisPanelComponent } from './miasm-diagnosis-panel/miasm-diagnosis-panel.component';
import type {
  ConsultationAttachmentRow,
  LoadedPrescription,
  MedicineRow,
  MethodIntakeUiPanel,
  OptionType,
  PrescriptionOption,
  PrescriptionTemplate
} from './appointments-page.types';
import {
  attachmentKindLabel as formatAttachmentKind,
  createEmptyMedicineRow,
  mapPrescriptionItemsToMedicineRows,
  mapTemplateItemsToMedicineRows,
  prescriptionSafetyReport as evaluatePrescriptionSafety
} from './appointments-page.utils';
import { FORMULARY_LOAD_ERROR, METHOD_INTAKE_CONFIG_ERROR } from './appointments-page.constants';

@Component({
  selector: 'app-appointments-page',
  imports: [FormsModule, DatePipe, KingdomDiagnosisPanelComponent, MiasmDiagnosisPanelComponent],
  templateUrl: './appointments-page.html',
  styleUrl: './appointments-page.scss'
})
export class AppointmentsPage implements OnInit {
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
  medicineRows: MedicineRow[] = [createEmptyMedicineRow()];

  /** CGHS Homoeopathic Formulary (JSON in public/data). */
  formulary: CghsFormularyEntry[] = [];
  formularyQuery = '';
  formularyLoaded = false;
  formularyLoadError = '';

  /** Homeopathy method → contextual intake fields (JSON in public/data). */
  methodIntakeConfig: MethodIntakeConfig | null = null;
  /** Kingdom / miasm addons: separate diagnosis tools (same storage keys as before). */
  kingdomIntakeGroup: MethodIntakeField | null = null;
  miasmIntakeGroup: MethodIntakeField | null = null;
  kingdomDiagnosisTitle = 'Kingdom diagnosis';
  kingdomDiagnosisDescription = '';
  miasmDiagnosisTitle = 'Miasm diagnosis';
  miasmDiagnosisDescription = '';
  methodIntakeValues: Record<string, string> = {};
  methodIntakeLoadError = '';

  /** Method label when opening a version (id-only payloads). */
  private loadedMethodLabel = '';

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

  ngOnInit() {
    void this.loadFormulary();
    void this.loadMethodIntakeConfig();
  }

  private async loadMethodIntakeConfig() {
    this.methodIntakeLoadError = '';
    try {
      const [main, kingdomRes, miasmRes] = await Promise.all([
        firstValueFrom(this.http.get<MethodIntakeConfig>('data/homeopathy-method-intake.json')),
        firstValueFrom(this.http.get<MethodIntakeAddonFile>('data/homeopathy-kingdom-intake.json')).catch(() => null),
        firstValueFrom(this.http.get<MethodIntakeAddonFile>('data/homeopathy-miasm-intake.json')).catch(() => null)
      ]);
      if (main?.profiles?.length) {
        this.methodIntakeConfig = main;
      } else {
        this.methodIntakeConfig = null;
      }
      const kg = kingdomRes?.group;
      if (kg?.type === 'structured_group' && kg.key === 'kingdom_classification') {
        this.kingdomIntakeGroup = kg;
        this.kingdomDiagnosisTitle = (kingdomRes?.title ?? '').trim() || 'Kingdom diagnosis';
        this.kingdomDiagnosisDescription = (kingdomRes?.description ?? '').trim();
      } else {
        this.kingdomIntakeGroup = null;
        this.kingdomDiagnosisTitle = 'Kingdom diagnosis';
        this.kingdomDiagnosisDescription = '';
      }
      const mg = miasmRes?.group;
      if (mg?.type === 'structured_group' && mg.key === 'miasm_classification') {
        this.miasmIntakeGroup = mg;
        this.miasmDiagnosisTitle = (miasmRes?.title ?? '').trim() || 'Miasm diagnosis';
        this.miasmDiagnosisDescription = (miasmRes?.description ?? '').trim();
      } else {
        this.miasmIntakeGroup = null;
        this.miasmDiagnosisTitle = 'Miasm diagnosis';
        this.miasmDiagnosisDescription = '';
      }
      this.ensureMethodIntakeKeys();
    } catch {
      this.methodIntakeConfig = null;
      this.kingdomIntakeGroup = null;
      this.miasmIntakeGroup = null;
      this.kingdomDiagnosisDescription = '';
      this.miasmDiagnosisDescription = '';
      this.methodIntakeLoadError = METHOD_INTAKE_CONFIG_ERROR;
    }
  }

  /** Base global fields from main method JSON only (no kingdom/miasm). */
  private baseGlobalFields(): MethodIntakeField[] {
    return this.methodIntakeConfig?.globalFields?.length ? [...this.methodIntakeConfig.globalFields] : [];
  }

  /** All structured groups whose keys must exist on `methodIntakeValues` for save/hydrate. */
  private allMethodIntakeFieldGroups(): MethodIntakeField[] {
    const out: MethodIntakeField[] = [...this.baseGlobalFields()];
    if (this.kingdomIntakeGroup) {
      out.push(this.kingdomIntakeGroup);
    }
    if (this.miasmIntakeGroup) {
      out.push(this.miasmIntakeGroup);
    }
    return out;
  }

  selectedMethodLabel(): string {
    const fromList = this.methods.find((m) => m.id === this.methodOptionId)?.label;
    return (fromList || this.loadedMethodLabel || '').trim();
  }

  activeMethodProfile(): MethodIntakeProfile | null {
    return resolveMethodIntakeProfile(this.methodIntakeConfig, this.selectedMethodLabel());
  }

  /**
   * Method-specific capture: active profile + base global fields only.
   * Kingdom and miasm render in `app-kingdom-diagnosis-panel` / `app-miasm-diagnosis-panel`.
   */
  methodIntakeFlatRows(): Array<MethodIntakeFlatRow & { showSectionHeader: boolean }> {
    const p = this.activeMethodProfile();
    if (!p) {
      return [];
    }
    const rows: MethodIntakeFlatRow[] = flattenMethodIntakeFields(p.fields);
    if (this.baseGlobalFields().length) {
      rows.push(...flattenMethodIntakeFields(this.baseGlobalFields()));
    }
    return methodIntakeRowsWithSectionHeaders(rows);
  }

  /** Method + method global fields only (kingdom/miasm use dedicated panels). */
  methodIntakeUiPanels(): MethodIntakeUiPanel[] {
    const panels: MethodIntakeUiPanel[] = [];
    const p = this.activeMethodProfile();
    if (p) {
      panels.push({
        id: 'method',
        heading: 'Method-specific case capture',
        description: '',
        profileTitle: p.title,
        profileHelper: p.helper,
        rows: this.methodIntakeFlatRows()
      });
    }
    return panels;
  }

  onMethodOptionChanged() {
    this.loadedMethodLabel = '';
    this.resetMethodIntakeForActiveProfile();
  }

  private resetMethodIntakeForActiveProfile() {
    const p = this.activeMethodProfile();
    this.methodIntakeValues = {};
    for (const key of allMethodIntakeStorageKeys(p, this.allMethodIntakeFieldGroups())) {
      this.methodIntakeValues[key] = '';
    }
  }

  private ensureMethodIntakeKeys() {
    const keys = allMethodIntakeStorageKeys(this.activeMethodProfile(), this.allMethodIntakeFieldGroups());
    for (const key of keys) {
      if (this.methodIntakeValues[key] === undefined) {
        this.methodIntakeValues[key] = '';
      }
    }
  }

  private hydrateMethodIntakeFromPrescription(raw: Record<string, string> | null | undefined) {
    this.methodIntakeValues = {};
    if (raw && typeof raw === 'object') {
      for (const [k, v] of Object.entries(raw)) {
        this.methodIntakeValues[k] = typeof v === 'string' ? v : '';
      }
    }
    this.ensureMethodIntakeKeys();
    migrateLegacyMiasmTenNonRanked(this.methodIntakeValues);
    migrateLegacyRankedFieldsForGroup(this.methodIntakeValues, this.kingdomIntakeGroup);
    migrateLegacyRankedFieldsForGroup(this.methodIntakeValues, this.miasmIntakeGroup);
  }

  private serializeMethodIntake(): Record<string, string> | undefined {
    const out: Record<string, string> = {};
    for (const key of allMethodIntakeStorageKeys(this.activeMethodProfile(), this.allMethodIntakeFieldGroups())) {
      const v = (this.methodIntakeValues[key] || '').trim();
      if (v) {
        out[key] = v;
      }
    }
    return Object.keys(out).length ? out : undefined;
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

  private async loadFormulary() {
    this.formularyLoadError = '';
    try {
      const res = await firstValueFrom(
        this.http.get<{ entries: CghsFormularyEntry[] }>('data/cghs-homoeopathic-formulary.json')
      );
      this.formulary = res.entries || [];
    } catch {
      this.formulary = [];
      this.formularyLoadError = FORMULARY_LOAD_ERROR;
    } finally {
      this.formularyLoaded = true;
      this.refreshFormularyKeysOnRows();
    }
  }

  formularyEntryKey(e: CghsFormularyEntry): string {
    return formularyOptionValue(e);
  }

  formularyOptionsFiltered(): CghsFormularyEntry[] {
    return filterFormularyOptions(this.formulary, this.formularyQuery);
  }

  onFormularyPick(row: MedicineRow, value: string) {
    row.formularyKey = value;
    const parsed = parseFormularyPick(value);
    if (!parsed) {
      return;
    }
    row.medicineName = parsed.name;
    row.strength = parsed.potency;
    row.dose = parsed.amount;
  }

  private refreshFormularyKeysOnRows() {
    for (const row of this.medicineRows) {
      if (!row.medicineName.trim()) {
        row.formularyKey = '';
        continue;
      }
      row.formularyKey = matchFormularyKey(this.formulary, row.medicineName, row.strength, row.dose);
    }
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
    this.medicineRows = [...this.medicineRows, createEmptyMedicineRow()];
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
    return formatAttachmentKind(kind);
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
    this.loadedMethodLabel = prescription.methodOption?.label || '';
    this.diagnosedDiseaseOptionId = prescription.diagnosedDiseaseOptionId || '';
    this.diagnosis = prescription.diagnosis || '';
    this.advice = prescription.advice || '';
    this.notes = prescription.notes || '';
    this.hydrateMethodIntakeFromPrescription(prescription.methodIntakeAnswers);
    this.followUpDate = prescription.followUpDate
      ? new Date(prescription.followUpDate).toISOString().substring(0, 10)
      : '';
    this.status = prescription.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
    this.medicineRows = mapPrescriptionItemsToMedicineRows(this.formulary, prescription.items);
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
    this.loadedMethodLabel = prescription.methodOption?.label || '';
    this.diagnosedDiseaseOptionId = prescription.diagnosedDiseaseOptionId || '';
    this.diagnosis = prescription.diagnosis || '';
    this.advice = prescription.advice || '';
    this.notes = prescription.notes || '';
    this.hydrateMethodIntakeFromPrescription(prescription.methodIntakeAnswers);
    this.followUpDate = '';
    this.status = 'DRAFT';
    this.medicineRows = mapPrescriptionItemsToMedicineRows(this.formulary, prescription.items);
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
    this.loadedMethodLabel = '';
    this.methodIntakeValues = {};
    this.medicineRows = [createEmptyMedicineRow()];
  }

  prescriptionSafetyReport() {
    return evaluatePrescriptionSafety(this.medicineRows);
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
      methodIntakeAnswers: this.serializeMethodIntake(),
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
    this.medicineRows = mapTemplateItemsToMedicineRows(this.formulary, template.items);
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
