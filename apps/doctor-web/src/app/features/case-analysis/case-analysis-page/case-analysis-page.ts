import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  caseSheetFieldsForSchema,
  defaultRubricWeightForChapter,
  firstIncompleteStepId,
  hydrateCaseSheetForSchema,
  resolveApproachByMethodLabel,
  type ApproachDataPayload,
  type ApproachDefinition,
  type ApproachStepComponent,
  type ApproachStepId,
  type KentHierarchyData,
  type KeynoteApproachData,
  type MiasmaticApproachData,
  type OrganonLmApproachData,
  type ProtocolApproachData,
  type ScholtenApproachData,
  type SehgalApproachData,
  type IntegrativeFollowUpApproachData,
  type SensationApproachData,
  type StepCompletionContext
} from '@vitalis/homeopathy-approaches';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { ConsultationChatPanelComponent } from '../../../shared/consultation-chat-panel/consultation-chat-panel';
import { ConsultationContextHeaderComponent } from '../../../shared/consultation-context-header/consultation-context-header';
import { ConsultationIntakePanelComponent } from '../../../shared/consultation-intake-panel/consultation-intake-panel';
import { CollapsibleSectionComponent } from '../../../shared/collapsible-section/collapsible-section';
import { CaseAnalysisApiService } from '../case-analysis-api.service';
import { createDebouncedSaver } from '../case-analysis-autosave.util';
import { primaryIntakeSearchPhrase } from '../intake-rubric.util';
import { ApproachCaseSheetPanelComponent } from '../panels/approach-case-sheet-panel/approach-case-sheet-panel';
import { ApproachOverviewPanelComponent } from '../panels/approach-overview-panel/approach-overview-panel';
import { ApproachStepperComponent } from '../panels/approach-stepper/approach-stepper';
import { KentHierarchyPanelComponent } from '../panels/kent-hierarchy-panel/kent-hierarchy-panel';
import { MiasmLayerPanelComponent } from '../panels/miasm-layer-panel/miasm-layer-panel';
import { PrescriptionHandoffPanelComponent } from '../panels/prescription-handoff-panel/prescription-handoff-panel';
import { ProtocolSelectPanelComponent } from '../panels/protocol-select-panel/protocol-select-panel';
import { OrganonLmDosingPanelComponent } from '../panels/organon-lm-dosing-panel/organon-lm-dosing-panel';
import { SensationCapturePanelComponent } from '../panels/sensation-capture-panel/sensation-capture-panel';
import { KeynoteStrikingPanelComponent } from '../panels/keynote-striking-panel/keynote-striking-panel';
import { ScholtenMapperPanelComponent } from '../panels/scholten-mapper-panel/scholten-mapper-panel';
import { SehgalEmotionPanelComponent } from '../panels/sehgal-emotion-panel/sehgal-emotion-panel';
import { IntegrativeFollowUpPanelComponent } from '../panels/integrative-follow-up-panel/integrative-follow-up-panel';
import { PatientCaseTimelinePanelComponent } from '../panels/patient-case-timeline-panel/patient-case-timeline-panel';
import type {
  CaseAnalysis,
  ConsultationSummary,
  MateriaMedicaResponse,
  PatientCaseHistory,
  RepertoryRemedyRef,
  RepertorySource,
  RubricSearchResult,
  SelectedRubric
} from '../case-analysis-page.types';
import { formatRubricPath, rubricPathSegments } from '../rubric-path.util';

@Component({
  selector: 'app-case-analysis-page',
  host: { class: 'case-analysis-page' },
  imports: [
    FormField,
    RouterLink,
    DecimalPipe,
    ConsultationContextHeaderComponent,
    ConsultationIntakePanelComponent,
    CollapsibleSectionComponent,
    ConsultationChatPanelComponent,
    ApproachStepperComponent,
    ApproachOverviewPanelComponent,
    ApproachCaseSheetPanelComponent,
    KentHierarchyPanelComponent,
    SensationCapturePanelComponent,
    MiasmLayerPanelComponent,
    ProtocolSelectPanelComponent,
    PrescriptionHandoffPanelComponent,
    OrganonLmDosingPanelComponent,
    KeynoteStrikingPanelComponent,
    ScholtenMapperPanelComponent,
    SehgalEmotionPanelComponent,
    IntegrativeFollowUpPanelComponent,
    PatientCaseTimelinePanelComponent
  ],
  templateUrl: './case-analysis-page.html'
})
export class CaseAnalysisPage implements OnDestroy, OnInit {
  private readonly api = inject(CaseAnalysisApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly caseSheetAutoSave = createDebouncedSaver(1200);
  private readonly notesAutoSave = createDebouncedSaver(1200);
  private readonly rubricsAutoSave = createDebouncedSaver(900);
  private lastPersistedCaseSheet = '';
  private lastPersistedNotes = '';
  private lastPersistedRubrics = '';

  readonly appointmentsPath = ROUTE_PATHS.APPOINTMENTS;
  readonly worklistPath = ROUTE_PATHS.WORKLIST;
  readonly repertoryPath = ROUTE_PATHS.REPERTORY;
  readonly weightOptions = [1, 2, 3, 4] as const;

  readonly standalone = this.route.snapshot.data['standalone'] === true;
  readonly consultationId = signal(this.standalone ? '' : this.route.snapshot.paramMap.get('consultationId') || '');
  readonly consultation = signal<ConsultationSummary | null>(null);
  readonly analyses = signal<CaseAnalysis[]>([]);
  readonly analysis = signal<CaseAnalysis | null>(null);
  readonly sources = signal<RepertorySource[]>([]);
  readonly selectedRubrics = signal<SelectedRubric[]>([]);

  readonly searchModel = signal({ selectedSourceId: '', rubricQuery: '' });
  readonly searchForm = form(this.searchModel);
  readonly notesModel = signal({ notes: '' });
  readonly notesForm = form(this.notesModel);
  readonly caseSheetModel = signal(hydrateCaseSheetForSchema('classical'));
  readonly caseSheetForm = form(this.caseSheetModel);
  readonly approachData = signal<ApproachDataPayload>({});

  readonly searchResults = signal<RubricSearchResult[]>([]);
  readonly searchedOnce = signal(false);
  readonly maxResultScore = signal(0);

  readonly methods = signal<Array<{ id: string; label: string }>>([]);
  readonly selectedMethodOptionId = signal('');
  readonly activeStepId = signal<ApproachStepId>('approach-select');

  readonly loading = signal(false);
  readonly searching = signal(false);
  readonly saving = signal(false);
  readonly savingCaseSheet = signal(false);
  readonly savingApproachData = signal(false);
  readonly creatingAnalysis = signal(false);
  readonly repertorizing = signal(false);
  readonly selectingRemedyId = signal('');
  readonly focusedRemedy = signal<RepertoryRemedyRef | null>(null);
  readonly materiaMedica = signal<MateriaMedicaResponse | null>(null);
  readonly loadingMateriaMedica = signal(false);
  readonly materiaMedicaError = signal('');
  readonly error = signal('');
  readonly message = signal('');
  readonly hydrating = signal(false);
  readonly autoSaveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  readonly patientCaseHistory = signal<PatientCaseHistory | null>(null);
  readonly loadingPatientHistory = signal(false);

  readonly formatRubricPath = formatRubricPath;
  readonly rubricPathSegments = rubricPathSegments;

  readonly activeApproach = computed<ApproachDefinition>(() => {
    const method = this.methods().find((item) => item.id === this.selectedMethodOptionId());
    return resolveApproachByMethodLabel(method?.label || this.analysis()?.methodOption?.label);
  });

  readonly workflowSteps = computed(() => this.activeApproach().steps);

  readonly caseSheetFields = computed(() => caseSheetFieldsForSchema(this.activeApproach().caseSheetSchemaId));

  readonly stepCompletion = computed<StepCompletionContext>(() => ({
    methodOptionId: this.selectedMethodOptionId() || this.analysis()?.methodOptionId,
    caseSheet: this.caseSheetModel(),
    approachData: this.approachData() as Record<string, unknown>,
    rubricCount: this.selectedRubrics().length,
    resultCount: this.analysis()?.results.length || 0,
    selectedRemedyId: this.analysis()?.selectedRemedy?.id || null
  }));

  readonly activeStepComponent = computed<ApproachStepComponent | null>(() => {
    return this.workflowSteps().find((step) => step.id === this.activeStepId())?.component || null;
  });

  readonly repertoryEnabled = computed(() => this.activeApproach().repertory.enabled);

  constructor() {
    void this.loadSources();
    void this.loadMethodOptions();

    effect(() => {
      this.caseSheetModel();
      this.scheduleAutoSaveCaseSheet();
    });
    effect(() => {
      this.notesModel();
      this.scheduleAutoSaveNotes();
    });
    effect(() => {
      this.selectedRubrics();
      this.scheduleAutoSaveRubrics();
    });
  }

  ngOnInit() {
    if (this.standalone) {
      void this.loadPracticeSession();
      return;
    }

    this.route.paramMap.subscribe((params) => {
      const id = params.get('consultationId') || '';
      if (!id) return;
      const changed = id !== this.consultationId();
      this.consultationId.set(id);
      if (changed || !this.analysis()) {
        void this.load();
      }
    });

    this.route.queryParamMap.subscribe((params) => {
      const caseAnalysisId = params.get('caseAnalysisId');
      if (!caseAnalysisId) return;
      const selected = this.analyses().find((item) => item.id === caseAnalysisId);
      if (selected && selected.id !== this.analysis()?.id) {
        void this.switchAnalysis(caseAnalysisId);
      }
    });
  }

  ngOnDestroy() {
    this.caseSheetAutoSave.cancel();
    this.notesAutoSave.cancel();
    this.rubricsAutoSave.cancel();
  }

  showPanel(component: ApproachStepComponent) {
    return this.activeStepComponent() === component;
  }

  showRepertoryWorkspace() {
    const component = this.activeStepComponent();
    return (
      this.repertoryEnabled() &&
      (component === 'repertory-workspace' ||
        component === 'remedy-results' ||
        component === 'organon-lm-dosing' ||
        component === 'analysis-notes')
    );
  }

  setActiveStep(stepId: ApproachStepId) {
    this.activeStepId.set(stepId);
  }

  async loadPracticeSession() {
    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const nextAnalysis = await this.api.loadOrCreatePracticeSession();
      this.consultation.set(null);
      this.analysis.set(nextAnalysis);
      this.searchModel.update((model) => ({
        ...model,
        selectedSourceId: nextAnalysis.source?.id || model.selectedSourceId
      }));
      this.hydrateFromAnalysis(nextAnalysis);
    } catch {
      this.error.set('Could not open repertory. Check that OOREP / repertory data is seeded.');
      this.analysis.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  async startNewPracticeSession() {
    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const nextAnalysis = await this.api.createPracticeSession({
        sourceId: this.searchModel().selectedSourceId || undefined
      });
      this.consultation.set(null);
      this.analysis.set(nextAnalysis);
      this.searchModel.update((model) => ({
        ...model,
        selectedSourceId: nextAnalysis.source?.id || model.selectedSourceId
      }));
      this.hydrateFromAnalysis(nextAnalysis);
      this.searchResults.set([]);
      this.searchedOnce.set(false);
      this.message.set('New practice case started.');
    } catch {
      this.error.set('Could not start a new practice case.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadMethodOptions() {
    try {
      this.methods.set(await this.api.loadMethodOptions());
    } catch {
      this.methods.set([]);
    }
  }

  async loadSources() {
    try {
      const nextSources = await this.api.loadSources();
      this.sources.set(nextSources);
      this.searchModel.update((model) => ({
        ...model,
        selectedSourceId: model.selectedSourceId || nextSources[0]?.id || ''
      }));
    } catch {
      this.sources.set([]);
    }
  }

  async load() {
    const id = this.consultationId().trim();
    if (!id) return;

    this.loading.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const response = await this.api.loadConsultationAnalyses(id);
      this.consultation.set(response.consultation);
      this.analyses.set(response.analyses);
      const preferredAnalysisId = this.route.snapshot.queryParamMap.get('caseAnalysisId') || '';
      const preferred = preferredAnalysisId
        ? response.analyses.find((item) => item.id === preferredAnalysisId)
        : undefined;
      const createdFirstAnalysis = !response.analyses.length;
      const nextAnalysis =
        preferred ||
        response.analyses[0] ||
        (await this.api.createAnalysis(id, { sourceId: this.searchModel().selectedSourceId || undefined }));
      if (createdFirstAnalysis) {
        this.analyses.set([nextAnalysis]);
      }
      this.analysis.set(nextAnalysis);
      this.searchModel.update((model) => ({
        ...model,
        selectedSourceId: nextAnalysis.source?.id || model.selectedSourceId
      }));
      this.hydrateFromAnalysis(nextAnalysis);
      void this.loadPatientCaseHistory(response.consultation.patient?.id);
      if (createdFirstAnalysis && nextAnalysis.methodOption?.label) {
        this.message.set(`Case analysis started with ${nextAnalysis.methodOption.label}.`);
      }
    } catch {
      this.error.set('Could not load case analysis for this consultation.');
      this.consultation.set(null);
      this.analysis.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private hydrateFromAnalysis(nextAnalysis: CaseAnalysis) {
    this.hydrating.set(true);
    this.caseSheetAutoSave.cancel();
    this.notesAutoSave.cancel();
    this.rubricsAutoSave.cancel();

    const approach = resolveApproachByMethodLabel(nextAnalysis.methodOption?.label);
    this.notesModel.set({ notes: nextAnalysis.notes || '' });
    this.caseSheetModel.set(hydrateCaseSheetForSchema(approach.caseSheetSchemaId, nextAnalysis.caseSheet));
    this.approachData.set((nextAnalysis.approachData as ApproachDataPayload) || {});
    this.selectedMethodOptionId.set(nextAnalysis.methodOptionId || nextAnalysis.methodOption?.id || '');
    this.selectedRubrics.set(
      nextAnalysis.rubrics.map((item) => ({
        rubricId: item.rubricId,
        weight: item.weight,
        rubric: item.rubric || undefined
      }))
    );
    this.maxResultScore.set(nextAnalysis.results[0]?.totalScore || 0);
    this.activeStepId.set(firstIncompleteStepId(approach.steps, {
      methodOptionId: nextAnalysis.methodOptionId,
      caseSheet: nextAnalysis.caseSheet || undefined,
      approachData: (nextAnalysis.approachData as Record<string, unknown>) || undefined,
      rubricCount: nextAnalysis.rubrics.length,
      resultCount: nextAnalysis.results.length,
      selectedRemedyId: nextAnalysis.selectedRemedy?.id || null
    }));
    if (nextAnalysis.selectedRemedy && this.focusedRemedy()?.id !== nextAnalysis.selectedRemedy.id) {
      void this.focusRemedy(nextAnalysis.selectedRemedy);
    }

    this.lastPersistedCaseSheet = JSON.stringify(this.buildCaseSheetPayload());
    this.lastPersistedNotes = nextAnalysis.notes || '';
    this.lastPersistedRubrics = JSON.stringify(this.rubricPayload());
    this.hydrating.set(false);
  }

  private syncAnalysisInList(updated: CaseAnalysis) {
    this.analysis.set(updated);
    this.analyses.set(this.analyses().map((item) => (item.id === updated.id ? updated : item)));
  }

  async focusRemedy(remedy: RepertoryRemedyRef) {
    this.focusedRemedy.set(remedy);
    this.materiaMedica.set(null);
    this.materiaMedicaError.set('');
    this.loadingMateriaMedica.set(true);

    try {
      this.materiaMedica.set(
        await this.api.loadMateriaMedica(remedy.id, {
          analysisId: this.analysis()?.id,
          repertorySourceId: this.analysis()?.source?.id
        })
      );
    } catch {
      this.materiaMedicaError.set('Could not load materia medica for this remedy.');
    } finally {
      this.loadingMateriaMedica.set(false);
    }
  }

  clearFocusedRemedy() {
    this.focusedRemedy.set(null);
    this.materiaMedica.set(null);
    this.materiaMedicaError.set('');
  }

  isFocusedRemedy(remedyId: string) {
    return this.focusedRemedy()?.id === remedyId;
  }

  scorePercent(score: number) {
    const max = this.maxResultScore();
    if (!max) return 0;
    return Math.max(8, Math.round((score / max) * 100));
  }

  async searchRubrics() {
    const q = this.searchModel().rubricQuery.trim();
    if (q.length < 2) return;

    this.searching.set(true);
    this.error.set('');
    this.searchedOnce.set(true);
    try {
      this.searchResults.set(
        await this.api.searchRubrics(q, this.searchModel().selectedSourceId || this.analysis()?.source?.id)
      );
    } catch {
      this.error.set('Rubric search failed.');
      this.searchResults.set([]);
    } finally {
      this.searching.set(false);
    }
  }

  hasRubric(rubricId: string) {
    return this.selectedRubrics().some((item) => item.rubricId === rubricId);
  }

  addRubric(rubric: RubricSearchResult) {
    if (this.hasRubric(rubric.id)) return;
    const approach = this.activeApproach();
    const defaultWeight = defaultRubricWeightForChapter(approach, rubric.chapter);
    this.selectedRubrics.set([
      ...this.selectedRubrics(),
      {
        rubricId: rubric.id,
        weight: defaultWeight,
        rubric: {
          id: rubric.id,
          chapter: rubric.chapter,
          subchapter: rubric.subchapter,
          text: rubric.text,
          parentPath: rubric.parentPath
        }
      }
    ]);
    this.message.set('Symptom added to case.');
    this.scheduleAutoSaveRubrics();
  }

  removeRubric(rubricId: string) {
    this.selectedRubrics.set(this.selectedRubrics().filter((item) => item.rubricId !== rubricId));
    this.scheduleAutoSaveRubrics();
  }

  setRubricWeight(rubricId: string, weight: number) {
    this.selectedRubrics.set(
      this.selectedRubrics().map((item) => (item.rubricId === rubricId ? { ...item, weight } : item))
    );
    this.scheduleAutoSaveRubrics();
  }

  private rubricPayload() {
    return this.selectedRubrics().map((item) => ({
      rubricId: item.rubricId,
      weight: item.weight
    }));
  }

  async saveApproach(methodOptionId: string) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;

    const previousMethodId = this.selectedMethodOptionId();
    const nextMethod = this.methods().find((item) => item.id === methodOptionId);
    const nextApproach = resolveApproachByMethodLabel(nextMethod?.label);

    if (previousMethodId && previousMethodId !== methodOptionId && (this.hasCaseSheetContent() || this.hasApproachDataContent())) {
      const confirmed = confirm(
        `Switch to ${nextApproach.title}? The case sheet will use the new approach structure and approach-specific panel data will be cleared.`
      );
      if (!confirmed) return;
    }

    const clearedApproachData: ApproachDataPayload = {};
    this.selectedMethodOptionId.set(methodOptionId);
    this.approachData.set(clearedApproachData);
    this.caseSheetModel.set(hydrateCaseSheetForSchema(nextApproach.caseSheetSchemaId, this.caseSheetModel()));
    this.activeStepId.set(firstIncompleteStepId(nextApproach.steps, {
      methodOptionId,
      caseSheet: this.caseSheetModel(),
      approachData: clearedApproachData as Record<string, unknown>
    }));

    this.saving.set(true);
    this.error.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, {
        methodOptionId: methodOptionId || null,
        caseSheet: this.buildCaseSheetPayload(),
        approachData: clearedApproachData as Record<string, unknown>
      });
      this.syncAnalysisInList(updated);
      this.hydrateFromAnalysis(updated);
      this.message.set(`Approach updated to ${nextApproach.title}.`);
    } catch {
      this.error.set('Could not save approach.');
    } finally {
      this.saving.set(false);
    }
  }

  private hasCaseSheetContent() {
    return Object.entries(this.caseSheetModel()).some(([key, value]) => !key.startsWith('_') && !!value?.trim());
  }

  private hasApproachDataContent() {
    return Object.keys(this.approachData()).length > 0;
  }

  private buildCaseSheetPayload() {
    return { ...this.caseSheetModel(), _schema: this.activeApproach().caseSheetSchemaId, _version: '1' };
  }

  async loadPatientCaseHistory(patientId?: string) {
    if (!patientId) {
      this.patientCaseHistory.set(null);
      return;
    }
    this.loadingPatientHistory.set(true);
    try {
      this.patientCaseHistory.set(await this.api.loadPatientCaseHistory(patientId));
    } catch {
      this.patientCaseHistory.set(null);
    } finally {
      this.loadingPatientHistory.set(false);
    }
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

  private scheduleAutoSaveRubrics() {
    if (this.hydrating() || !this.analysis()?.id) return;
    const snapshot = JSON.stringify(this.rubricPayload());
    if (snapshot === this.lastPersistedRubrics) return;
    this.rubricsAutoSave.schedule(() => this.persistRubrics(true));
  }

  private async persistCaseSheet(silent = false) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    const sheet = this.buildCaseSheetPayload();
    const snapshot = JSON.stringify(sheet);
    if (snapshot === this.lastPersistedCaseSheet) return;

    if (!silent) this.savingCaseSheet.set(true);
    else this.autoSaveStatus.set('saving');
    this.error.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, { caseSheet: sheet });
      this.syncAnalysisInList(updated);
      this.lastPersistedCaseSheet = snapshot;
      if (silent) this.autoSaveStatus.set('saved');
      else this.message.set('Case sheet saved.');
    } catch {
      if (silent) this.autoSaveStatus.set('error');
      else this.error.set('Could not save case sheet.');
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
    else this.autoSaveStatus.set('saving');
    this.error.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, { notes });
      this.syncAnalysisInList(updated);
      this.lastPersistedNotes = notes;
      if (silent) this.autoSaveStatus.set('saved');
      else this.message.set('Notes saved.');
    } catch {
      if (silent) this.autoSaveStatus.set('error');
      else this.error.set('Could not save notes.');
    } finally {
      if (!silent) this.saving.set(false);
    }
  }

  private async persistRubrics(silent = false) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    const payload = this.rubricPayload();
    const snapshot = JSON.stringify(payload);
    if (snapshot === this.lastPersistedRubrics) return;

    if (!silent) this.saving.set(true);
    else this.autoSaveStatus.set('saving');
    this.error.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, { rubrics: payload });
      this.syncAnalysisInList(updated);
      this.lastPersistedRubrics = snapshot;
      if (silent) this.autoSaveStatus.set('saved');
      else this.message.set('Case rubrics saved.');
    } catch {
      if (silent) this.autoSaveStatus.set('error');
      else this.error.set('Could not save rubrics.');
    } finally {
      if (!silent) this.saving.set(false);
    }
  }

  async saveApproachData(partial: ApproachDataPayload, silent = false) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    const merged = { ...this.approachData(), ...partial };
    this.approachData.set(merged);
    if (silent) {
      this.autoSaveStatus.set('saving');
    } else {
      this.savingApproachData.set(true);
    }
    this.error.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, { approachData: merged as Record<string, unknown> });
      this.syncAnalysisInList(updated);
      if (silent) {
        this.autoSaveStatus.set('saved');
      } else {
        this.message.set('Approach-specific case data saved.');
      }
    } catch {
      if (silent) {
        this.autoSaveStatus.set('error');
      } else {
        this.error.set('Could not save approach data.');
      }
    } finally {
      if (!silent) {
        this.savingApproachData.set(false);
      }
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

  async saveRubrics() {
    await this.persistRubrics(false);
  }

  analysisLabel(analysis: CaseAnalysis) {
    const created = analysis.createdAt ? new Date(analysis.createdAt).toLocaleString() : 'Case';
    const remedy = analysis.selectedRemedy?.name;
    const approach = analysis.methodOption?.label;
    if (approach && remedy) return `${approach} · ${remedy}`;
    if (approach) return `${approach} · ${created}`;
    return remedy ? `${created} · ${remedy}` : created;
  }

  async switchAnalysis(analysisId: string) {
    const selected = this.analyses().find((item) => item.id === analysisId);
    if (!selected || selected.id === this.analysis()?.id) return;
    this.analysis.set(selected);
    this.hydrateFromAnalysis(selected);
    this.searchResults.set([]);
    this.searchedOnce.set(false);
    this.message.set('Switched to another case analysis.');
  }

  async createNewAnalysis() {
    if (!this.consultationId()) return;
    this.creatingAnalysis.set(true);
    this.error.set('');
    try {
      const created = await this.api.createAnalysis(this.consultationId(), {
        sourceId: this.searchModel().selectedSourceId || this.analysis()?.source?.id || undefined
      });
      this.analyses.set([created, ...this.analyses()]);
      this.analysis.set(created);
      this.hydrateFromAnalysis(created);
      this.searchResults.set([]);
      this.searchedOnce.set(false);
      const lastMethod = this.patientCaseHistory()?.lastPrescriptionMethod;
      this.message.set(
        lastMethod
          ? `New case analysis started using last prescribed method (${lastMethod.label}).`
          : 'New case analysis started.'
      );
    } catch {
      this.error.set('Could not start a new case analysis.');
    } finally {
      this.creatingAnalysis.set(false);
    }
  }

  suggestFromIntake() {
    const phrase = primaryIntakeSearchPhrase(this.consultation()?.intakeAnswers);
    if (!phrase) {
      this.message.set('No intake answers available to suggest rubric search terms.');
      return;
    }
    this.searchModel.update((model) => ({ ...model, rubricQuery: phrase }));
    this.message.set(`Search prefilled from intake: "${phrase}".`);
  }

  async saveCaseSheet() {
    await this.persistCaseSheet(false);
  }

  async saveNotes() {
    await this.persistNotes(false);
  }

  async runRepertorization() {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    this.repertorizing.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await this.saveRubrics();
      const updated = await this.api.repertorize(currentAnalysis.id);
      this.syncAnalysisInList(updated);
      this.hydrateFromAnalysis(updated);
      this.setActiveStep('remedy-select');
      this.message.set('Repertorization complete. Review ranked remedies on the right.');
    } catch {
      this.error.set('Repertorization failed. Add rubrics and try again.');
    } finally {
      this.repertorizing.set(false);
    }
  }

  async chooseRemedy(remedy: { id: string; name: string; abbreviation: string }) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    this.selectingRemedyId.set(remedy.id);
    this.error.set('');
    this.message.set('');
    try {
      const updated = await this.api.selectRemedy(currentAnalysis.id, remedy.id);
      this.syncAnalysisInList(updated);
      await this.focusRemedy(remedy);
      const nextStep = this.activeApproach().slug === 'organon-lm' ? 'lm-dosing' : 'prescribe';
      this.setActiveStep(nextStep);
      this.message.set(`${remedy.name} selected as the case remedy.`);
    } catch {
      this.error.set('Could not select remedy.');
    } finally {
      this.selectingRemedyId.set('');
    }
  }

  openHistoricalCaseAnalysis(consultationId: string, analysisId: string) {
    if (consultationId === this.consultationId()) {
      void this.switchAnalysis(analysisId);
      return;
    }

    void this.router.navigate(['/', ROUTE_PATHS.CASE_ANALYSIS, consultationId, 'case-analysis'], {
      queryParams: { caseAnalysisId: analysisId }
    });
  }

  historyBadge() {
    return this.patientCaseHistory()?.lastPrescriptionMethod?.label || '';
  }

  openPrescriptionWithRemedy() {
    const currentAnalysis = this.analysis();
    if (!this.consultationId()) return;

    const protocol = this.approachData().protocol;
    const organonLm = this.approachData().organonLm;
    const remedy = currentAnalysis?.selectedRemedy?.name || protocol?.primaryRemedy;
    if (!remedy) return;

    const lmAdvice = organonLm
      ? [
          organonLm.selectedLmPotency ? `LM potency: ${organonLm.selectedLmPotency}` : '',
          organonLm.dilutionGlass ? `Dilution glass: ${organonLm.dilutionGlass}` : '',
          organonLm.repetitionSchedule ? `Schedule: ${organonLm.repetitionSchedule}` : '',
          organonLm.responseMonitoring ? `Monitor: ${organonLm.responseMonitoring}` : ''
        ]
          .filter(Boolean)
          .join('. ')
      : '';

    void this.router.navigate(['/', ROUTE_PATHS.APPOINTMENTS], {
      queryParams: {
        consultationId: this.consultationId(),
        caseAnalysisId: currentAnalysis?.id,
        remedy,
        diagnosis: remedy,
        ...(lmAdvice ? { advice: lmAdvice } : {}),
        ...(protocol?.companionRemedy ? { companionRemedy: protocol.companionRemedy } : {}),
        ...(this.selectedMethodOptionId() ? { methodOptionId: this.selectedMethodOptionId() } : {})
      }
    });
  }

  organonLmData() {
    return this.approachData().organonLm || null;
  }

  caseSheetTitle() {
    const schema = this.activeApproach().caseSheetSchemaId;
    if (schema === 'eight-box') return '8-Box case structure';
    if (schema === 'organon-lm') return 'Baseline case (Organon LM)';
    if (schema === 'keynote') return 'Totality review';
    if (schema === 'scholten') return 'Scholten case sheet';
    if (schema === 'sehgal') return 'Sehgal case sheet';
    if (schema === 'pathological') return 'Pathology case sheet';
    if (schema === 'integrative-follow-up') return 'Integrative care plan';
    if (this.activeApproach().workflowKind === 'PROTOCOL_DRIVEN') return 'Protocol notes';
    return 'Structured case sheet';
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
}
