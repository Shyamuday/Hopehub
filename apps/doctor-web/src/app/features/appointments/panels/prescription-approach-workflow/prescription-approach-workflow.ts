import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import {
  buildPrescriptionHandoff,
  caseSheetFieldsForSchema,
  caseSheetTitleForSchema,
  hydrateCaseSheetForSchema,
  prescriptionInputSteps,
  resolveApproachByMethodOption,
  structuredPanelForComponent,
  type ApproachDataPayload,
  type ApproachDefinition,
  type ApproachStep,
  type IntegrativeFollowUpApproachData,
  type KentHierarchyData,
  type KeynoteApproachData,
  type MiasmaticApproachData,
  type OrganonLmApproachData,
  type ProtocolApproachData,
  type ScholtenApproachData,
  type SehgalApproachData,
  type SensationApproachData,
} from '@hopehub/homeopathy-approaches';
import { RouterLink } from '@angular/router';
import { ROUTE_PATHS } from '../../../../core/constants/app-routes.constants';
import { CaseAnalysisApiService } from '../../../case-analysis/case-analysis-api.service';
import { createDebouncedSaver } from '../../../case-analysis/case-analysis-autosave.util';
import type { CaseAnalysis } from '../../../case-analysis/case-analysis-page.types';
import { ApproachCaseSheetPanelComponent } from '../../../case-analysis/panels/approach-case-sheet-panel/approach-case-sheet-panel';
import { ApproachStructuredPanelComponent } from '../../../case-analysis/panels/approach-structured-panel/approach-structured-panel';
import { IntegrativeFollowUpPanelComponent } from '../../../case-analysis/panels/integrative-follow-up-panel/integrative-follow-up-panel';
import { KentHierarchyPanelComponent } from '../../../case-analysis/panels/kent-hierarchy-panel/kent-hierarchy-panel';
import { MiasmLayerPanelComponent } from '../../../case-analysis/panels/miasm-layer-panel/miasm-layer-panel';
import { OrganonLmDosingPanelComponent } from '../../../case-analysis/panels/organon-lm-dosing-panel/organon-lm-dosing-panel';
import { ProtocolSelectPanelComponent } from '../../../case-analysis/panels/protocol-select-panel/protocol-select-panel';
import { KeynoteStrikingPanelComponent } from '../../../case-analysis/panels/keynote-striking-panel/keynote-striking-panel';
import { ScholtenMapperPanelComponent } from '../../../case-analysis/panels/scholten-mapper-panel/scholten-mapper-panel';
import { SehgalEmotionPanelComponent } from '../../../case-analysis/panels/sehgal-emotion-panel/sehgal-emotion-panel';
import { SensationCapturePanelComponent } from '../../../case-analysis/panels/sensation-capture-panel/sensation-capture-panel';
import { PrescriptionRepertoryPanelComponent } from '../prescription-repertory-panel/prescription-repertory-panel';

export type PrescriptionHandoffApply = {
  remedy: string;
  companionRemedy?: string;
  advice?: string;
};

@Component({
  selector: 'app-prescription-approach-workflow',
  imports: [
    FormField,
    RouterLink,
    ApproachCaseSheetPanelComponent,
    ApproachStructuredPanelComponent,
    KentHierarchyPanelComponent,
    PrescriptionRepertoryPanelComponent,
    SensationCapturePanelComponent,
    MiasmLayerPanelComponent,
    KeynoteStrikingPanelComponent,
    ScholtenMapperPanelComponent,
    SehgalEmotionPanelComponent,
    IntegrativeFollowUpPanelComponent,
    ProtocolSelectPanelComponent,
    OrganonLmDosingPanelComponent,
  ],
  templateUrl: './prescription-approach-workflow.html',
  styleUrl: './prescription-approach-workflow.scss',
})
export class PrescriptionApproachWorkflowComponent implements OnDestroy {
  private readonly api = inject(CaseAnalysisApiService);

  private readonly caseSheetAutoSave = createDebouncedSaver(1200);
  private readonly notesAutoSave = createDebouncedSaver(1200);
  private readonly methodRationaleAutoSave = createDebouncedSaver(1200);
  private lastPersistedCaseSheet = '';
  private lastPersistedNotes = '';
  private lastPersistedMethodRationale = '';
  private lastSyncedMethodId = '';

  readonly consultationId = input('');
  readonly methodOptionId = input('');
  readonly caseAnalysisId = input('');
  readonly diseaseName = input('');
  readonly methods = input<Array<{ id: string; label: string; normalizedLabel?: string }>>([]);

  readonly caseAnalysisIdChange = output<string>();
  readonly handoffApply = output<PrescriptionHandoffApply>();

  private lastLoadedConsultationId = '';

  readonly caseAnalysisPath = ROUTE_PATHS.CASE_ANALYSIS;

  readonly loading = signal(false);
  readonly hydrating = signal(false);
  readonly saving = signal(false);
  readonly savingCaseSheet = signal(false);
  readonly savingApproachData = signal(false);
  readonly savingMethodRationale = signal(false);
  readonly error = signal('');
  readonly analysis = signal<CaseAnalysis | null>(null);

  readonly methodRationaleModel = signal({ rationale: '' });
  readonly methodRationaleForm = form(this.methodRationaleModel);
  readonly caseSheetModel = signal(hydrateCaseSheetForSchema('classical'));
  readonly caseSheetForm = form(this.caseSheetModel);
  readonly notesModel = signal({ notes: '' });
  readonly notesForm = form(this.notesModel);
  readonly approachData = signal<ApproachDataPayload>({});

  readonly activeApproach = computed<ApproachDefinition | null>(() => {
    const methodId = this.methodOptionId();
    const method = this.methods().find((item) => item.id === methodId);
    if (method) return resolveApproachByMethodOption(method);
    return resolveApproachByMethodOption(this.analysis()?.methodOption);
  });

  readonly inputSteps = computed<ApproachStep[]>(() => {
    const approach = this.activeApproach();
    if (!approach) return [];
    return prescriptionInputSteps(approach.steps);
  });

  readonly caseSheetFields = computed(() => {
    const approach = this.activeApproach();
    if (!approach) return [];
    return caseSheetFieldsForSchema(approach.caseSheetSchemaId);
  });

  readonly caseSheetTitle = computed(() => {
    const approach = this.activeApproach();
    if (!approach) return 'Structured case sheet';
    return caseSheetTitleForSchema(approach.caseSheetSchemaId, approach.workflowKind);
  });

  readonly prescriptionHandoffPreview = computed(() => {
    const analysis = this.analysis();
    const protocol = this.approachData().protocol;
    return buildPrescriptionHandoff(this.approachData(), {
      selectedRemedyName: analysis?.selectedRemedy?.name,
      protocolPrimaryRemedy: protocol?.primaryRemedy,
      protocolCompanionRemedy: protocol?.companionRemedy,
    });
  });

  readonly linkedRubricCount = computed(() => this.analysis()?.rubrics?.length || 0);

  readonly structuredPanelForComponent = structuredPanelForComponent;

  constructor() {
    effect(() => {
      const consultationId = this.consultationId().trim();
      if (consultationId) {
        void this.ensureAnalysisLoaded();
      } else {
        this.analysis.set(null);
        this.lastLoadedConsultationId = '';
      }
    });

    effect(() => {
      const preferredId = this.caseAnalysisId().trim();
      const currentId = this.analysis()?.id || '';
      if (!preferredId || preferredId === currentId || !this.lastLoadedConsultationId) return;
      void this.switchToPreferredAnalysis(preferredId);
    });

    effect(() => {
      const methodId = this.methodOptionId();
      const consultationId = this.consultationId().trim();
      if (!consultationId || !methodId || this.hydrating() || !this.analysis()) return;
      const currentMethodId = this.analysis()?.methodOptionId || '';
      if (methodId === currentMethodId) {
        this.lastSyncedMethodId = methodId;
        return;
      }
      if (methodId === this.lastSyncedMethodId) return;
      void this.syncMethodFromParent(methodId);
    });

    effect(() => {
      this.caseSheetModel();
      this.scheduleAutoSaveCaseSheet();
    });
    effect(() => {
      this.notesModel();
      this.scheduleAutoSaveNotes();
    });
    effect(() => {
      this.methodRationaleModel();
      this.scheduleAutoSaveMethodRationale();
    });
  }

  ngOnDestroy() {
    this.caseSheetAutoSave.cancel();
    this.notesAutoSave.cancel();
    this.methodRationaleAutoSave.cancel();
  }

  updateMethodRationale(rationale: string) {
    this.methodRationaleModel.set({ rationale });
  }

  onRationaleInput(event: Event) {
    this.updateMethodRationale((event.target as HTMLTextAreaElement).value);
  }

  async switchToPreferredAnalysis(analysisId: string) {
    const consultationId = this.consultationId().trim();
    if (!consultationId) return;

    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.api.loadConsultationAnalyses(consultationId);
      const preferred = response.analyses.find((item: CaseAnalysis) => item.id === analysisId);
      if (!preferred) return;
      this.analysis.set(preferred);
      this.hydrateFromAnalysis(preferred);
    } catch {
      this.error.set('Could not switch linked case analysis.');
    } finally {
      this.loading.set(false);
    }
  }

  async ensureAnalysisLoaded() {
    const consultationId = this.consultationId().trim();
    if (!consultationId) {
      this.lastLoadedConsultationId = '';
      return;
    }
    if (consultationId === this.lastLoadedConsultationId && this.analysis()) return;

    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.api.loadConsultationAnalyses(consultationId);
      const preferredId = this.caseAnalysisId().trim();
      const preferred = preferredId
        ? response.analyses.find((item: CaseAnalysis) => item.id === preferredId)
        : undefined;
      const nextAnalysis =
        preferred ||
        response.analyses[0] ||
        (await this.api.createAnalysis(consultationId, {
          methodOptionId: this.methodOptionId() || undefined,
        }));

      this.lastLoadedConsultationId = consultationId;
      this.analysis.set(nextAnalysis);
      this.hydrateFromAnalysis(nextAnalysis);
      if (nextAnalysis.id !== preferredId) {
        this.caseAnalysisIdChange.emit(nextAnalysis.id);
      }
    } catch {
      this.error.set('Could not load case analysis for approach-specific inputs.');
      this.analysis.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private hydrateFromAnalysis(nextAnalysis: CaseAnalysis) {
    this.hydrating.set(true);
    this.caseSheetAutoSave.cancel();
    this.notesAutoSave.cancel();
    this.methodRationaleAutoSave.cancel();

    const approach = resolveApproachByMethodOption(
      nextAnalysis.methodOption
        ? {
            label: nextAnalysis.methodOption.label,
            normalizedLabel: nextAnalysis.methodOption.normalizedLabel,
          }
        : this.methods().find((item) => item.id === nextAnalysis.methodOptionId),
    );

    this.notesModel.set({ notes: nextAnalysis.notes || '' });
    this.methodRationaleModel.set({ rationale: nextAnalysis.methodRationale || '' });
    this.caseSheetModel.set(
      hydrateCaseSheetForSchema(approach.caseSheetSchemaId, nextAnalysis.caseSheet),
    );
    this.approachData.set((nextAnalysis.approachData as ApproachDataPayload) || {});
    this.lastSyncedMethodId = nextAnalysis.methodOptionId || nextAnalysis.methodOption?.id || '';

    this.lastPersistedCaseSheet = JSON.stringify(this.buildCaseSheetPayload());
    this.lastPersistedNotes = nextAnalysis.notes || '';
    this.lastPersistedMethodRationale = nextAnalysis.methodRationale || '';
    this.hydrating.set(false);
  }

  private syncAnalysisInList(updated: CaseAnalysis) {
    this.analysis.set(updated);
    this.caseAnalysisIdChange.emit(updated.id);
  }

  private async syncMethodFromParent(methodOptionId: string) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;

    const nextMethod = this.methods().find((item) => item.id === methodOptionId);
    const nextApproach = resolveApproachByMethodOption(nextMethod);
    const previousMethodId = currentAnalysis.methodOptionId || '';

    if (
      previousMethodId &&
      previousMethodId !== methodOptionId &&
      (this.hasCaseSheetContent() || this.hasApproachDataContent())
    ) {
      const confirmed = confirm(
        `Switch to ${nextApproach.title}? Approach-specific panel data will reset to the new method structure.`,
      );
      if (!confirmed) return;
    }

    const clearedApproachData: ApproachDataPayload = {};
    this.approachData.set(clearedApproachData);
    this.methodRationaleModel.set({ rationale: '' });
    this.caseSheetModel.set(
      hydrateCaseSheetForSchema(nextApproach.caseSheetSchemaId, this.caseSheetModel()),
    );

    this.saving.set(true);
    this.error.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, {
        methodOptionId: methodOptionId || null,
        methodRationale: null,
        caseSheet: this.buildCaseSheetPayload(),
        approachData: clearedApproachData as Record<string, unknown>,
      });
      this.syncAnalysisInList(updated);
      this.hydrateFromAnalysis(updated);
      this.lastSyncedMethodId = methodOptionId;
    } catch {
      this.error.set('Could not save approach change.');
    } finally {
      this.saving.set(false);
    }
  }

  private hasCaseSheetContent() {
    return Object.entries(this.caseSheetModel()).some(
      ([key, value]) => !key.startsWith('_') && !!value?.trim(),
    );
  }

  private hasApproachDataContent() {
    return Object.keys(this.approachData()).length > 0;
  }

  private buildCaseSheetPayload() {
    const approach = this.activeApproach();
    return {
      ...this.caseSheetModel(),
      _schema: approach?.caseSheetSchemaId || 'classical',
      _version: '1',
    };
  }

  private scheduleAutoSaveCaseSheet() {
    if (this.hydrating() || !this.analysis()?.id) return;
    const snapshot = JSON.stringify(this.buildCaseSheetPayload());
    if (snapshot === this.lastPersistedCaseSheet) return;
    this.caseSheetAutoSave.schedule(() => this.persistCaseSheet(true));
  }

  private scheduleAutoSaveNotes() {
    if (this.hydrating() || !this.analysis()?.id) return;
    const notes = this.notesModel().notes;
    if (notes === this.lastPersistedNotes) return;
    this.notesAutoSave.schedule(() => this.persistNotes(true));
  }

  private scheduleAutoSaveMethodRationale() {
    if (this.hydrating() || !this.analysis()?.id) return;
    const rationale = this.methodRationaleModel().rationale;
    if (rationale === this.lastPersistedMethodRationale) return;
    this.methodRationaleAutoSave.schedule(() => this.persistMethodRationale(true));
  }

  private async persistCaseSheet(silent = false) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    const sheet = this.buildCaseSheetPayload();
    const snapshot = JSON.stringify(sheet);
    if (snapshot === this.lastPersistedCaseSheet) return;

    if (!silent) this.savingCaseSheet.set(true);
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, { caseSheet: sheet });
      this.syncAnalysisInList(updated);
      this.lastPersistedCaseSheet = snapshot;
    } catch {
      if (!silent) this.error.set('Could not save case sheet.');
    } finally {
      if (!silent) this.savingCaseSheet.set(false);
    }
  }

  private async persistNotes(silent = false) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    const notes = this.notesModel().notes;
    if (notes === this.lastPersistedNotes) return;

    if (!silent) this.saving.set(true);
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, { notes });
      this.syncAnalysisInList(updated);
      this.lastPersistedNotes = notes;
    } catch {
      if (!silent) this.error.set('Could not save notes.');
    } finally {
      if (!silent) this.saving.set(false);
    }
  }

  private async persistMethodRationale(silent = false) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    const rationale = this.methodRationaleModel().rationale;
    if (rationale === this.lastPersistedMethodRationale) return;

    if (!silent) this.savingMethodRationale.set(true);
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, {
        methodRationale: rationale.trim() || null,
      });
      this.syncAnalysisInList(updated);
      this.lastPersistedMethodRationale = rationale;
    } catch {
      if (!silent) this.error.set('Could not save approach rationale.');
    } finally {
      if (!silent) this.savingMethodRationale.set(false);
    }
  }

  async saveCaseSheet() {
    await this.persistCaseSheet(false);
  }

  async saveNotes() {
    await this.persistNotes(false);
  }

  async saveApproachData(partial: ApproachDataPayload, silent = false) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    const merged = { ...this.approachData(), ...partial };
    this.approachData.set(merged);
    if (!silent) this.savingApproachData.set(true);
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, {
        approachData: merged as Record<string, unknown>,
      });
      this.syncAnalysisInList(updated);
    } catch {
      if (!silent) this.error.set('Could not save approach data.');
    } finally {
      if (!silent) this.savingApproachData.set(false);
    }
  }

  saveKentHierarchy(data: KentHierarchyData, silent = false) {
    void this.saveApproachData({ kentHierarchy: data }, silent);
  }

  saveSensation(data: SensationApproachData, silent = false) {
    void this.saveApproachData({ sensation: data }, silent);
  }

  saveMiasm(data: MiasmaticApproachData, silent = false) {
    void this.saveApproachData({ miasmatic: data }, silent);
  }

  saveProtocol(data: ProtocolApproachData, silent = false) {
    void this.saveApproachData({ protocol: data }, silent);
  }

  saveOrganonLm(data: OrganonLmApproachData, silent = false) {
    void this.saveApproachData({ organonLm: data }, silent);
  }

  saveKeynote(data: KeynoteApproachData, silent = false) {
    void this.saveApproachData({ keynote: data }, silent);
  }

  saveScholten(data: ScholtenApproachData, silent = false) {
    void this.saveApproachData({ scholten: data }, silent);
  }

  saveSehgal(data: SehgalApproachData, silent = false) {
    void this.saveApproachData({ sehgal: data }, silent);
  }

  saveIntegrativeFollowUp(data: IntegrativeFollowUpApproachData, silent = false) {
    void this.saveApproachData({ integrativeFollowUp: data }, silent);
  }

  structuredPanelInitial(dataKey: keyof ApproachDataPayload) {
    const block = this.approachData()[dataKey];
    return (block as Record<string, string> | undefined) || null;
  }

  saveStructuredPanel(
    dataKey: keyof ApproachDataPayload,
    data: Record<string, string>,
    silent = false,
  ) {
    void this.saveApproachData({ [dataKey]: data } as ApproachDataPayload, silent);
  }

  protocolData() {
    return this.approachData().protocol || null;
  }

  kentData() {
    return this.approachData().kentHierarchy || null;
  }

  sensationData() {
    return this.approachData().sensation || null;
  }

  miasmData() {
    return this.approachData().miasmatic || null;
  }

  keynoteData() {
    return this.approachData().keynote || null;
  }

  scholtenData() {
    return this.approachData().scholten || null;
  }

  sehgalData() {
    return this.approachData().sehgal || null;
  }

  integrativeFollowUpData() {
    return this.approachData().integrativeFollowUp || null;
  }

  organonLmData() {
    return this.approachData().organonLm || null;
  }

  applyHandoffFromPreview() {
    const handoff = this.prescriptionHandoffPreview();
    if (!handoff) return;
    this.handoffApply.emit({
      remedy: handoff.remedy,
      companionRemedy: handoff.companionRemedy,
      advice: handoff.advice,
    });
  }

  applyHandoffFromProtocol(data: ProtocolApproachData) {
    void this.saveProtocol(data);
    const handoff = buildPrescriptionHandoff(
      { ...this.approachData(), protocol: data },
      {
        protocolPrimaryRemedy: data.primaryRemedy,
        protocolCompanionRemedy: data.companionRemedy,
      },
    );
    if (!handoff) return;
    this.handoffApply.emit({
      remedy: handoff.remedy,
      companionRemedy: handoff.companionRemedy,
      advice: handoff.advice,
    });
  }
}
