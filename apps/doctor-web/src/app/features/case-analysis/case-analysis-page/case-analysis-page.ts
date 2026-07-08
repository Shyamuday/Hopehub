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
  resolveApproachByMethodOption,
  structuredPanelForComponent,
  buildPrescriptionHandoff,
  type ApproachDataPayload,
  type ApproachDefinition,
  type ApproachFieldDef,
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
import { ViewportService } from '../../../core/services/viewport.service';
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
import { ApproachStructuredPanelComponent } from '../panels/approach-structured-panel/approach-structured-panel';
import { PatientCaseTimelinePanelComponent } from '../panels/patient-case-timeline-panel/patient-case-timeline-panel';
import { ClinicalMediaPanelComponent } from '../panels/clinical-media-panel/clinical-media-panel';
import type {
  CaseAnalysis,
  ConsultationSummary,
  MateriaMedicaResponse,
  MateriaMedicaSearchResult,
  MateriaMedicaSource,
  PatientCaseHistory,
  RepertoryRemedyRef,
  RepertorySource,
  RubricSearchResult,
  RubricSuggestion,
  SelectedRubric
} from '../case-analysis-page.types';
import { formatRubricPath, rubricPathSegments } from '../rubric-path.util';

export type WorkspaceMobileTab = 'search' | 'rubrics' | 'results';

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
    ApproachStructuredPanelComponent,
    PatientCaseTimelinePanelComponent,
    ClinicalMediaPanelComponent
  ],
  templateUrl: './case-analysis-page.html'
})
export class CaseAnalysisPage implements OnDestroy, OnInit {
  private readonly api = inject(CaseAnalysisApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportService);

  private readonly caseSheetAutoSave = createDebouncedSaver(1200);
  private readonly notesAutoSave = createDebouncedSaver(1200);
  private readonly methodRationaleAutoSave = createDebouncedSaver(1200);
  private readonly rubricsAutoSave = createDebouncedSaver(900);
  private readonly rubricSuggestDebouncer = createDebouncedSaver(280);
  private readonly mmSearchDebouncer = createDebouncedSaver(450);
  private rubricSuggestRequest = 0;
  private mmSearchRequest = 0;
  private lastPersistedCaseSheet = '';
  private lastPersistedNotes = '';
  private lastPersistedMethodRationale = '';
  private lastPersistedRubrics = '';

  readonly appointmentsPath = ROUTE_PATHS.APPOINTMENTS;
  readonly worklistPath = ROUTE_PATHS.WORKLIST;
  readonly repertoryPath = ROUTE_PATHS.REPERTORY;
  readonly repertoryBrowserPath = ROUTE_PATHS.REPERTORY_BROWSER;
  readonly weightOptions = [1, 2, 3, 4] as const;

  readonly standalone = this.route.snapshot.data['standalone'] === true;
  readonly consultationId = signal(this.standalone ? '' : this.route.snapshot.paramMap.get('consultationId') || '');
  readonly consultation = signal<ConsultationSummary | null>(null);
  readonly analyses = signal<CaseAnalysis[]>([]);
  readonly analysis = signal<CaseAnalysis | null>(null);
  readonly sources = signal<RepertorySource[]>([]);
  readonly mmSources = signal<MateriaMedicaSource[]>([]);
  readonly searchMode = signal<'repertory' | 'materia-medica'>('repertory');
  readonly selectedRubrics = signal<SelectedRubric[]>([]);

  readonly searchModel = signal({ selectedSourceId: '', selectedMmSourceId: '', rubricQuery: '' });
  readonly searchForm = form(this.searchModel);
  readonly notesModel = signal({ notes: '' });
  readonly notesForm = form(this.notesModel);
  readonly methodRationaleModel = signal({ rationale: '' });
  readonly caseSheetModel = signal(hydrateCaseSheetForSchema('classical'));
  readonly caseSheetForm = form(this.caseSheetModel);
  readonly approachData = signal<ApproachDataPayload>({});

  readonly searchResults = signal<RubricSearchResult[]>([]);
  readonly mmSearchResults = signal<MateriaMedicaSearchResult[]>([]);
  readonly selectedMmSearchResult = signal<MateriaMedicaSearchResult | null>(null);
  readonly rubricSuggestions = signal<RubricSuggestion[]>([]);
  readonly rubricSuggestionsOpen = signal(false);
  readonly searchedOnce = signal(false);
  readonly maxResultScore = signal(0);

  readonly methods = signal<Array<{ id: string; label: string; normalizedLabel: string }>>([]);
  readonly selectedMethodOptionId = signal('');
  readonly activeStepId = signal<ApproachStepId>('approach-select');

  readonly loading = signal(false);
  readonly searching = signal(false);
  readonly suggesting = signal(false);
  readonly saving = signal(false);
  readonly savingMethodRationale = signal(false);
  readonly savingCaseSheet = signal(false);
  readonly savingApproachData = signal(false);
  readonly fieldSuggestingKey = signal<string | null>(null);
  readonly creatingAnalysis = signal(false);
  readonly repertorizing = signal(false);
  readonly suggestingRemedies = signal(false);
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
  readonly isMobile = computed(() => this.viewport.isMobile());
  readonly workspaceTab = signal<WorkspaceMobileTab>('search');
  readonly mobilePatientOpen = signal(false);

  readonly formatRubricPath = formatRubricPath;
  readonly rubricPathSegments = rubricPathSegments;

  readonly activeApproach = computed<ApproachDefinition>(() => {
    const method = this.methods().find((item) => item.id === this.selectedMethodOptionId());
    if (method) return resolveApproachByMethodOption(method);
    return resolveApproachByMethodOption(this.analysis()?.methodOption);
  });

  readonly workflowSteps = computed(() => this.activeApproach().steps);

  readonly caseSheetFields = computed(() => caseSheetFieldsForSchema(this.activeApproach().caseSheetSchemaId));

  readonly stepCompletion = computed<StepCompletionContext>(() => ({
    methodOptionId: this.selectedMethodOptionId() || this.analysis()?.methodOptionId,
    methodRationale: this.methodRationaleModel().rationale || this.analysis()?.methodRationale || null,
    caseSheet: this.caseSheetModel(),
    approachData: this.approachData() as Record<string, unknown>,
    rubricCount: this.selectedRubrics().length,
    resultCount: this.analysis()?.results.length || 0,
    selectedRemedyId: this.analysis()?.selectedRemedy?.id || null
  }));

  readonly approachStepComplete = computed(() => {
    const context = this.stepCompletion();
    return !!context.methodOptionId && !!context.methodRationale?.trim();
  });

  readonly activeStepComponent = computed<ApproachStepComponent | null>(() => {
    return this.workflowSteps().find((step) => step.id === this.activeStepId())?.component || null;
  });

  readonly activeStructuredPanel = computed(() => structuredPanelForComponent(this.activeStepComponent()));

  readonly prescriptionHandoffPreview = computed(() => {
    const analysis = this.analysis();
    const protocol = this.approachData().protocol;
    return buildPrescriptionHandoff(this.approachData(), {
      selectedRemedyName: analysis?.selectedRemedy?.name,
      protocolPrimaryRemedy: protocol?.primaryRemedy,
      protocolCompanionRemedy: protocol?.companionRemedy
    });
  });

  readonly repertoryEnabled = computed(() => this.activeApproach().repertory.enabled);

  readonly showMobileRepertorizeBar = computed(
    () =>
      this.isMobile() &&
      this.showRepertoryWorkspace() &&
      this.workspaceTab() === 'rubrics' &&
      this.selectedRubrics().length > 0
  );

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
      this.methodRationaleModel();
      this.scheduleAutoSaveMethodRationale();
    });
    effect(() => {
      this.selectedRubrics();
      this.scheduleAutoSaveRubrics();
    });
    effect(() => {
      if (this.searchMode() !== 'repertory') {
        this.closeRubricSuggestions();
        return;
      }
      const query = this.searchModel().rubricQuery.trim();
      const sourceId = this.searchModel().selectedSourceId || this.analysis()?.source?.id || '';
      this.scheduleRubricSuggest(query, sourceId);
    });
    effect(() => {
      if (this.searchMode() !== 'materia-medica') return;
      const query = this.searchModel().rubricQuery.trim();
      const sourceId = this.searchModel().selectedMmSourceId;
      this.scheduleMmSearch(query, sourceId);
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
    this.methodRationaleAutoSave.cancel();
    this.rubricsAutoSave.cancel();
    this.rubricSuggestDebouncer.cancel();
    this.mmSearchDebouncer.cancel();
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

  setWorkspaceTab(tab: WorkspaceMobileTab) {
    this.workspaceTab.set(tab);
  }

  toggleMobilePatient() {
    this.mobilePatientOpen.update((open) => !open);
  }

  showWorkspaceSearch() {
    return !this.isMobile() || this.workspaceTab() === 'search';
  }

  showWorkspaceRubrics() {
    return !this.isMobile() || this.workspaceTab() === 'rubrics';
  }

  showWorkspaceResults() {
    return !this.isMobile() || this.workspaceTab() === 'results';
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
      const [nextSources, nextMmSources] = await Promise.all([
        this.api.loadSources(),
        this.api.loadMateriaMedicaSources()
      ]);
      this.sources.set(nextSources);
      this.mmSources.set(nextMmSources);
      const defaultRep = this.pickDefaultRepertorySource(nextSources);
      const defaultMm =
        nextMmSources.find((s) => s.id.startsWith('oorep-mm:')) ??
        nextMmSources.find((s) => s.code === 'boericke') ??
        nextMmSources[0];
      this.searchModel.update((model) => ({
        ...model,
        selectedSourceId: model.selectedSourceId || defaultRep?.id || '',
        selectedMmSourceId: model.selectedMmSourceId || defaultMm?.id || ''
      }));
    } catch {
      this.sources.set([]);
      this.mmSources.set([]);
    }
  }

  private pickDefaultRepertorySource(sources: RepertorySource[]) {
    return (
      sources.find((s) => s.code === 'kent') ??
      sources.find((s) => s.code === 'publicum' && (s.rubricCount ?? 0) > 100) ??
      sources.find((s) => s.id.startsWith('oorep:') && s.code === 'publicum') ??
      sources.find((s) => s.id.startsWith('oorep:')) ??
      sources.find((s) => (s.rubricCount ?? 0) > 100) ??
      sources.find((s) => !s.name.toLowerCase().includes('mvp')) ??
      sources[0]
    );
  }

  switchSearchMode(mode: 'repertory' | 'materia-medica') {
    this.searchMode.set(mode);
    this.searchResults.set([]);
    this.mmSearchResults.set([]);
    this.selectedMmSearchResult.set(null);
    this.searchedOnce.set(false);
    this.closeRubricSuggestions();
    this.mmSearchDebouncer.cancel();
    if (mode === 'materia-medica') {
      const query = this.searchModel().rubricQuery.trim();
      const sourceId = this.searchModel().selectedMmSourceId;
      if (query.length >= 2 && sourceId) {
        this.scheduleMmSearch(query, sourceId);
      }
    }
  }

  async runSymptomSearch() {
    if (this.searchMode() === 'materia-medica') {
      await this.searchMateriaMedica();
    } else {
      await this.searchRubrics();
    }
  }

  async searchMateriaMedica() {
    const q = this.searchModel().rubricQuery.trim();
    const sourceId = this.searchModel().selectedMmSourceId;
    if (q.length < 2 || !sourceId) return;
    await this.loadMmSearch(q, sourceId);
  }

  private scheduleMmSearch(query: string, sourceId: string) {
    if (query.length < 2 || !sourceId) {
      this.mmSearchDebouncer.cancel();
      this.mmSearchResults.set([]);
      this.selectedMmSearchResult.set(null);
      this.searchedOnce.set(false);
      this.searching.set(false);
      return;
    }

    this.mmSearchDebouncer.schedule(() => this.loadMmSearch(query, sourceId));
  }

  private async loadMmSearch(query: string, sourceId: string) {
    if (!sourceId.startsWith('oorep-mm:')) {
      this.error.set('Materia medica search uses online OOREP sources. Pick a source like Boericke or Clarke.');
      this.mmSearchResults.set([]);
      this.searchedOnce.set(true);
      return;
    }

    const requestId = ++this.mmSearchRequest;
    this.closeRubricSuggestions();
    this.searching.set(true);
    this.error.set('');
    this.searchedOnce.set(true);
    this.selectedMmSearchResult.set(null);
    try {
      const response = await this.api.searchMateriaMedica(query, sourceId);
      if (requestId !== this.mmSearchRequest) return;
      this.mmSearchResults.set(response.results);
      this.searchResults.set([]);
    } catch {
      if (requestId !== this.mmSearchRequest) return;
      this.error.set('Materia medica search failed.');
      this.mmSearchResults.set([]);
    } finally {
      if (requestId === this.mmSearchRequest) {
        this.searching.set(false);
      }
    }
  }

  openMmSearchResult(result: MateriaMedicaSearchResult) {
    this.selectedMmSearchResult.set(result);
  }

  closeMmSearchResult() {
    this.selectedMmSearchResult.set(null);
  }

  symptomSearchPlaceholder() {
    if (this.searchMode() === 'materia-medica') {
      return 'Search materia medica: anxiety, headache, gums swollen…';
    }
    return this.activeApproach().repertory.searchPlaceholder || 'Search rubrics: cough*, dry*, pain -abdomen…';
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
        this.message.set(
          `Case analysis started with ${nextAnalysis.methodOption.label}. Confirm the approach and explain why you chose it.`
        );
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
    this.methodRationaleAutoSave.cancel();
    this.rubricsAutoSave.cancel();

    const approach = resolveApproachByMethodOption(
      nextAnalysis.methodOption
        ? {
            label: nextAnalysis.methodOption.label,
            normalizedLabel: nextAnalysis.methodOption.normalizedLabel
          }
        : this.methods().find((item) => item.id === nextAnalysis.methodOptionId)
    );
    this.notesModel.set({ notes: nextAnalysis.notes || '' });
    this.methodRationaleModel.set({ rationale: nextAnalysis.methodRationale || '' });
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
      methodRationale: nextAnalysis.methodRationale,
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
    this.lastPersistedMethodRationale = nextAnalysis.methodRationale || '';
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

    this.closeRubricSuggestions();
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

  private scheduleRubricSuggest(query: string, sourceId: string) {
    if (query.length < 2) {
      this.rubricSuggestDebouncer.cancel();
      this.rubricSuggestions.set([]);
      this.rubricSuggestionsOpen.set(false);
      this.suggesting.set(false);
      return;
    }

    this.rubricSuggestDebouncer.schedule(() => this.loadRubricSuggestions(query, sourceId));
  }

  private async loadRubricSuggestions(query: string, sourceId: string) {
    const requestId = ++this.rubricSuggestRequest;
    this.suggesting.set(true);
    try {
      const suggestions = await this.api.suggestRubrics(query, sourceId || undefined);
      if (requestId !== this.rubricSuggestRequest) return;
      this.rubricSuggestions.set(suggestions);
      this.rubricSuggestionsOpen.set(suggestions.length > 0);
    } catch {
      if (requestId !== this.rubricSuggestRequest) return;
      this.rubricSuggestions.set([]);
      this.rubricSuggestionsOpen.set(false);
    } finally {
      if (requestId === this.rubricSuggestRequest) {
        this.suggesting.set(false);
      }
    }
  }

  onRubricSearchFocus() {
    if (this.rubricSuggestions().length) {
      this.rubricSuggestionsOpen.set(true);
    }
  }

  closeRubricSuggestions() {
    this.rubricSuggestionsOpen.set(false);
  }

  pickRubricSuggestion(suggestion: RubricSuggestion) {
    this.searchModel.update((model) => ({ ...model, rubricQuery: suggestion.text }));
    this.closeRubricSuggestions();
    void this.searchRubrics();
  }

  addRubricSuggestion(suggestion: RubricSuggestion) {
    if (this.hasRubric(suggestion.id)) return;
    this.addRubric({
      id: suggestion.id,
      chapter: suggestion.chapter,
      subchapter: suggestion.subchapter,
      text: suggestion.text,
      parentPath: suggestion.parentPath,
      source: suggestion.source,
      remedies: []
    });
    this.closeRubricSuggestions();
    this.message.set('Symptom added to case.');
  }

  applyRubricSearchPhrase(phrase: string) {
    const trimmed = phrase.trim();
    if (!trimmed) return;
    this.searchModel.update((model) => ({ ...model, rubricQuery: trimmed }));
    if (this.repertoryEnabled()) {
      this.setActiveStep('rubric-search');
    }
    void this.searchRubrics();
    this.message.set(`Search prefilled: "${trimmed}".`);
  }

  async applyApproachFieldSuggestion(payload: { field: ApproachFieldDef; currentValue: string }) {
    const analysisId = this.analysis()?.id;
    if (!analysisId) {
      this.message.set('Save the case analysis first, then try suggestions.');
      return;
    }

    const component = this.activeStepComponent();
    this.fieldSuggestingKey.set(payload.field.key);
    try {
      const result = await this.api.suggestApproachField(analysisId, {
        fieldKey: payload.field.key,
        promptKey: payload.field.promptKey,
        suggestEndpoint: payload.field.suggestEndpoint,
        currentValue: payload.currentValue,
        panelComponent: component === 'case-sheet' ? 'case-sheet' : component || undefined,
        extractFrom: payload.field.extractFrom
      });

      const suggestion = result.suggestion?.trim();
      if (!suggestion) {
        this.message.set('No suggestion available for this field yet.');
        return;
      }

      this.applyFieldSuggestionValue(payload.field.key, suggestion, component);
      const sourceLabel =
        result.source === 'ai-extract-intake' || result.source === 'ai-extract-intake-fallback'
          ? 'patient intake'
          : result.source === 'ai-extract-media'
            ? 'clinical photos'
            : result.source === 'prior-case'
              ? 'prior cases'
              : 'case context';
      this.message.set(`Filled "${payload.field.label}" from ${sourceLabel}.`);
    } catch {
      this.message.set('Could not fetch a suggestion for this field. Try again or enter manually.');
    } finally {
      this.fieldSuggestingKey.set(null);
    }
  }

  private applyFieldSuggestionValue(
    fieldKey: string,
    suggestion: string,
    component: ApproachStepComponent | null
  ) {
    if (component === 'case-sheet') {
      this.caseSheetModel.update((current) => ({ ...current, [fieldKey]: suggestion }));
      return;
    }

    const structured = this.activeStructuredPanel();
    if (structured) {
      const key = structured.dataKey;
      this.approachData.update((current) => ({
        ...current,
        [key]: {
          ...((current[key] as Record<string, string> | undefined) || {}),
          [fieldKey]: suggestion
        }
      }));
      void this.saveApproachData({ [key]: this.approachData()[key] } as ApproachDataPayload, true);
      return;
    }

    const specializedKey = this.specializedApproachDataKey(component);
    if (specializedKey) {
      this.approachData.update((current) => ({
        ...current,
        [specializedKey]: {
          ...((current[specializedKey] as Record<string, string> | undefined) || {}),
          [fieldKey]: suggestion
        }
      }));
      void this.saveApproachData({ [specializedKey]: this.approachData()[specializedKey] } as ApproachDataPayload, true);
    }
  }

  private specializedApproachDataKey(component: ApproachStepComponent | null): keyof ApproachDataPayload | null {
    switch (component) {
      case 'kent-hierarchy':
        return 'kentHierarchy';
      case 'sensation-mapper':
        return 'sensation';
      case 'miasm-selector':
        return 'miasmatic';
      case 'keynote-striking':
        return 'keynote';
      case 'scholten-mapper':
        return 'scholten';
      case 'sehgal-emotion':
        return 'sehgal';
      case 'integrative-follow-up':
        return 'integrativeFollowUp';
      case 'organon-lm-dosing':
        return 'organonLm';
      default:
        return null;
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
    if (this.isMobile()) {
      this.workspaceTab.set('rubrics');
    }
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
    const nextApproach = resolveApproachByMethodOption(nextMethod);

    if (previousMethodId && previousMethodId !== methodOptionId && (this.hasCaseSheetContent() || this.hasApproachDataContent())) {
      const confirmed = confirm(
        `Switch to ${nextApproach.title}? The case sheet will use the new approach structure and approach-specific panel data will be cleared.`
      );
      if (!confirmed) return;
    }

    const clearedApproachData: ApproachDataPayload = {};
    this.selectedMethodOptionId.set(methodOptionId);
    this.approachData.set(clearedApproachData);
    this.methodRationaleModel.set({ rationale: '' });
    this.caseSheetModel.set(hydrateCaseSheetForSchema(nextApproach.caseSheetSchemaId, this.caseSheetModel()));
    this.activeStepId.set('approach-select');

    this.saving.set(true);
    this.error.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, {
        methodOptionId: methodOptionId || null,
        methodRationale: null,
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

  private scheduleAutoSaveMethodRationale() {
    if (this.hydrating() || !this.analysis()?.id) return;
    const rationale = this.methodRationaleModel().rationale;
    if (rationale === this.lastPersistedMethodRationale) return;
    this.methodRationaleAutoSave.schedule(() => this.persistMethodRationale(true));
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

  updateMethodRationale(rationale: string) {
    this.methodRationaleModel.set({ rationale });
  }

  private async persistMethodRationale(silent = false) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    const rationale = this.methodRationaleModel().rationale;
    if (rationale === this.lastPersistedMethodRationale) return;

    if (!silent) this.savingMethodRationale.set(true);
    else this.autoSaveStatus.set('saving');
    this.error.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, {
        methodRationale: rationale.trim() || null
      });
      this.syncAnalysisInList(updated);
      this.lastPersistedMethodRationale = rationale;
      if (silent) this.autoSaveStatus.set('saved');
    } catch {
      if (silent) this.autoSaveStatus.set('error');
      else this.error.set('Could not save approach rationale.');
    } finally {
      if (!silent) this.savingMethodRationale.set(false);
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

  structuredPanelInitial(dataKey: keyof ApproachDataPayload) {
    const block = this.approachData()[dataKey];
    return (block as Record<string, string> | undefined) || null;
  }

  saveStructuredPanel(dataKey: keyof ApproachDataPayload, data: Record<string, string>, silent = false) {
    void this.saveApproachData({ [dataKey]: data } as ApproachDataPayload, silent);
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
      if (this.isMobile()) {
        this.workspaceTab.set('results');
      }
    } catch {
      this.error.set('Repertorization failed. Check rubrics and try again.');
    } finally {
      this.repertorizing.set(false);
    }
  }

  async suggestRemediesFromCase() {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;

    this.suggestingRemedies.set(true);
    this.error.set('');
    try {
      const response = await this.api.suggestRemediesFromApproach(currentAnalysis.id, { apply: true });
      if (response.analysis) {
        this.syncAnalysisInList(response.analysis);
        this.hydrateFromAnalysis(response.analysis);
      }
      this.setActiveStep('remedy-select');
      this.message.set(response.summary);
      if (this.isMobile()) {
        this.workspaceTab.set('results');
      }
    } catch {
      this.error.set(
        'Could not suggest remedies from case data. Fill approach fields with symptoms, or add rubrics manually.'
      );
    } finally {
      this.suggestingRemedies.set(false);
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
    const handoff = buildPrescriptionHandoff(this.approachData(), {
      selectedRemedyName: currentAnalysis?.selectedRemedy?.name,
      protocolPrimaryRemedy: protocol?.primaryRemedy,
      protocolCompanionRemedy: protocol?.companionRemedy
    });
    if (!handoff) return;

    void this.router.navigate(['/', ROUTE_PATHS.APPOINTMENTS], {
      queryParams: {
        consultationId: this.consultationId(),
        caseAnalysisId: currentAnalysis?.id,
        remedy: handoff.remedy,
        diagnosis: handoff.remedy,
        ...(handoff.advice ? { advice: handoff.advice } : {}),
        ...(handoff.companionRemedy ? { companionRemedy: handoff.companionRemedy } : {}),
        ...(this.selectedMethodOptionId() ? { methodOptionId: this.selectedMethodOptionId() } : {})
      }
    });
  }

  organonLmData() {
    return this.approachData().organonLm || null;
  }

  caseSheetTitle() {
    const schema = this.activeApproach().caseSheetSchemaId;
    const titles: Record<string, string> = {
      'eight-box': '8-Box case structure',
      'organon-lm': 'Baseline case (Organon LM)',
      keynote: 'Totality review',
      scholten: 'Scholten case sheet',
      sehgal: 'Sehgal case sheet',
      pathological: 'Pathology case sheet',
      'integrative-follow-up': 'Integrative care plan',
      fibonacci: 'Fibonacci baseline case',
      tautopathy: 'Tautopathy case context',
      eizayaga: 'Eizayaga layer case sheet',
      vithoulkas: 'Vithoulkas essence case sheet',
      drainage: 'Drainage case sheet',
      hering: 'Follow-up baseline',
      'acute-fast': 'Acute case notes',
      combination: 'Combination notes',
      boenninghausen: 'Boenninghausen case sheet',
      boger: 'Boger case sheet',
      constitutional: 'Constitutional case sheet',
      clinical: 'Clinical case notes',
      kentian: 'Kentian case sheet',
      miasmatic: 'Miasmatic case sheet',
      sensation: 'Sensation case sheet',
      hybrid: 'Integration plan',
      protocol: 'Protocol notes',
      classical: 'Structured case sheet'
    };
    if (titles[schema]) return titles[schema];
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
