import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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
  type MiasmaticApproachData,
  type OrganonLmApproachData,
  type ProtocolApproachData,
  type SensationApproachData,
  type StepCompletionContext
} from '@vitalis/homeopathy-approaches';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { ConsultationChatPanelComponent } from '../../../shared/consultation-chat-panel/consultation-chat-panel';
import { ConsultationContextHeaderComponent } from '../../../shared/consultation-context-header/consultation-context-header';
import { ConsultationIntakePanelComponent } from '../../../shared/consultation-intake-panel/consultation-intake-panel';
import { CaseAnalysisApiService } from '../case-analysis-api.service';
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
import type {
  CaseAnalysis,
  ConsultationSummary,
  MateriaMedicaResponse,
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
    ConsultationChatPanelComponent,
    ApproachStepperComponent,
    ApproachOverviewPanelComponent,
    ApproachCaseSheetPanelComponent,
    KentHierarchyPanelComponent,
    SensationCapturePanelComponent,
    MiasmLayerPanelComponent,
    ProtocolSelectPanelComponent,
    PrescriptionHandoffPanelComponent,
    OrganonLmDosingPanelComponent
  ],
  templateUrl: './case-analysis-page.html'
})
export class CaseAnalysisPage {
  private readonly api = inject(CaseAnalysisApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly appointmentsPath = ROUTE_PATHS.APPOINTMENTS;
  readonly worklistPath = ROUTE_PATHS.WORKLIST;
  readonly repertoryPath = ROUTE_PATHS.REPERTORY;
  readonly weightOptions = [1, 2, 3, 4] as const;

  readonly standalone = this.route.snapshot.data['standalone'] === true;
  readonly consultationId = this.standalone ? '' : this.route.snapshot.paramMap.get('consultationId') || '';
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
    if (this.standalone) {
      void this.loadPracticeSession();
    } else if (this.consultationId) {
      void this.load();
    }
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
    const id = this.consultationId.trim();
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
      const nextAnalysis =
        preferred ||
        response.analyses[0] ||
        (await this.api.createAnalysis(id, { sourceId: this.searchModel().selectedSourceId || undefined }));
      if (!response.analyses.length) {
        this.analyses.set([nextAnalysis]);
      }
      this.analysis.set(nextAnalysis);
      this.searchModel.update((model) => ({
        ...model,
        selectedSourceId: nextAnalysis.source?.id || model.selectedSourceId
      }));
      this.hydrateFromAnalysis(nextAnalysis);
    } catch {
      this.error.set('Could not load case analysis for this consultation.');
      this.consultation.set(null);
      this.analysis.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private hydrateFromAnalysis(nextAnalysis: CaseAnalysis) {
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
  }

  removeRubric(rubricId: string) {
    this.selectedRubrics.set(this.selectedRubrics().filter((item) => item.rubricId !== rubricId));
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

    if (previousMethodId && previousMethodId !== methodOptionId && this.hasCaseSheetContent()) {
      const confirmed = confirm(
        `Switch to ${nextApproach.title}? The case sheet will use the new approach structure. Existing case sheet values may be reorganized.`
      );
      if (!confirmed) return;
    }

    this.selectedMethodOptionId.set(methodOptionId);
    this.caseSheetModel.set(hydrateCaseSheetForSchema(nextApproach.caseSheetSchemaId, this.caseSheetModel()));
    this.activeStepId.set(firstIncompleteStepId(nextApproach.steps, {
      methodOptionId,
      caseSheet: this.caseSheetModel(),
      approachData: this.approachData() as Record<string, unknown>
    }));

    this.saving.set(true);
    this.error.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, {
        methodOptionId: methodOptionId || null,
        caseSheet: this.caseSheetModel()
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

  async saveApproachData(partial: ApproachDataPayload) {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    const merged = { ...this.approachData(), ...partial };
    this.approachData.set(merged);
    this.savingApproachData.set(true);
    this.error.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, { approachData: merged as Record<string, unknown> });
      this.syncAnalysisInList(updated);
      this.message.set('Approach-specific case data saved.');
    } catch {
      this.error.set('Could not save approach data.');
    } finally {
      this.savingApproachData.set(false);
    }
  }

  saveKentHierarchy(data: KentHierarchyData) {
    void this.saveApproachData({ kentHierarchy: data });
  }

  saveSensation(data: SensationApproachData) {
    void this.saveApproachData({ sensation: data });
  }

  saveMiasm(data: MiasmaticApproachData) {
    void this.saveApproachData({ miasmatic: data });
  }

  saveProtocol(data: ProtocolApproachData) {
    void this.saveApproachData({ protocol: data });
  }

  saveOrganonLm(data: OrganonLmApproachData) {
    void this.saveApproachData({ organonLm: data });
  }

  async saveRubrics() {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, { rubrics: this.rubricPayload() });
      this.syncAnalysisInList(updated);
      this.hydrateFromAnalysis(updated);
      this.message.set('Case rubrics saved.');
    } catch {
      this.error.set('Could not save rubrics.');
    } finally {
      this.saving.set(false);
    }
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
    if (!this.consultationId) return;
    this.creatingAnalysis.set(true);
    this.error.set('');
    try {
      const created = await this.api.createAnalysis(this.consultationId, {
        sourceId: this.searchModel().selectedSourceId || this.analysis()?.source?.id || undefined,
        methodOptionId: this.selectedMethodOptionId() || undefined
      });
      this.analyses.set([created, ...this.analyses()]);
      this.analysis.set(created);
      this.hydrateFromAnalysis(created);
      this.searchResults.set([]);
      this.searchedOnce.set(false);
      this.message.set('New case analysis started.');
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
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    this.savingCaseSheet.set(true);
    this.error.set('');
    try {
      const sheet = { ...this.caseSheetModel(), _schema: this.activeApproach().caseSheetSchemaId, _version: '1' };
      const updated = await this.api.updateAnalysis(currentAnalysis.id, { caseSheet: sheet });
      this.syncAnalysisInList(updated);
      this.message.set('Case sheet saved.');
    } catch {
      this.error.set('Could not save case sheet.');
    } finally {
      this.savingCaseSheet.set(false);
    }
  }

  async saveNotes() {
    const currentAnalysis = this.analysis();
    if (!currentAnalysis) return;
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const updated = await this.api.updateAnalysis(currentAnalysis.id, { notes: this.notesModel().notes });
      this.syncAnalysisInList(updated);
      this.message.set('Notes saved.');
    } catch {
      this.error.set('Could not save notes.');
    } finally {
      this.saving.set(false);
    }
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

  openPrescriptionWithRemedy() {
    const currentAnalysis = this.analysis();
    if (!this.consultationId) return;

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
        consultationId: this.consultationId,
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
}
