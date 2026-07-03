import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { CaseAnalysisApiService } from '../case-analysis-api.service';
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
  imports: [FormsModule, RouterLink, DecimalPipe],
  templateUrl: './case-analysis-page.html',
  styleUrl: './case-analysis-page.scss'
})
export class CaseAnalysisPage {
  readonly appointmentsPath = ROUTE_PATHS.APPOINTMENTS;
  readonly worklistPath = ROUTE_PATHS.WORKLIST;
  readonly weightOptions = [1, 2, 3, 4] as const;

  consultationId = '';
  consultation: ConsultationSummary | null = null;
  analysis: CaseAnalysis | null = null;
  sources: RepertorySource[] = [];
  selectedSourceId = '';
  selectedRubrics: SelectedRubric[] = [];
  notes = '';

  rubricQuery = '';
  searchResults: RubricSearchResult[] = [];
  searchedOnce = false;
  maxResultScore = 0;

  loading = false;
  searching = false;
  saving = false;
  repertorizing = false;
  selectingRemedyId = '';
  focusedRemedy: RepertoryRemedyRef | null = null;
  materiaMedica: MateriaMedicaResponse | null = null;
  loadingMateriaMedica = false;
  materiaMedicaError = '';
  error = '';
  message = '';

  readonly formatRubricPath = formatRubricPath;
  readonly rubricPathSegments = rubricPathSegments;

  constructor(
    private readonly api: CaseAnalysisApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    this.consultationId = this.route.snapshot.paramMap.get('consultationId') || '';
    void this.loadSources();
    if (this.consultationId) {
      void this.load();
    }
  }

  async loadSources() {
    try {
      this.sources = await this.api.loadSources();
      this.selectedSourceId = this.sources[0]?.id || '';
    } catch {
      this.sources = [];
    }
  }

  async load() {
    const id = this.consultationId.trim();
    if (!id) return;

    this.loading = true;
    this.error = '';
    this.message = '';
    try {
      const response = await this.api.loadConsultationAnalyses(id);
      this.consultation = response.consultation;
      this.analysis =
        response.analyses[0] ||
        (await this.api.createAnalysis(id, { sourceId: this.selectedSourceId || undefined }));
      this.selectedSourceId = this.analysis.source?.id || this.selectedSourceId;
      this.hydrateFromAnalysis(this.analysis);
    } catch {
      this.error = 'Could not load case analysis for this consultation.';
      this.consultation = null;
      this.analysis = null;
    } finally {
      this.loading = false;
    }
  }

  private hydrateFromAnalysis(analysis: CaseAnalysis) {
    this.notes = analysis.notes || '';
    this.selectedRubrics = analysis.rubrics.map((item) => ({
      rubricId: item.rubricId,
      weight: item.weight,
      rubric: item.rubric || undefined
    }));
    this.maxResultScore = analysis.results[0]?.totalScore || 0;
    if (analysis.selectedRemedy && this.focusedRemedy?.id !== analysis.selectedRemedy.id) {
      void this.focusRemedy(analysis.selectedRemedy);
    }
  }

  async focusRemedy(remedy: RepertoryRemedyRef) {
    this.focusedRemedy = remedy;
    this.materiaMedica = null;
    this.materiaMedicaError = '';
    this.loadingMateriaMedica = true;

    try {
      this.materiaMedica = await this.api.loadMateriaMedica(remedy.id, {
        analysisId: this.analysis?.id,
        repertorySourceId: this.analysis?.source?.id
      });
    } catch {
      this.materiaMedicaError = 'Could not load materia medica for this remedy.';
    } finally {
      this.loadingMateriaMedica = false;
    }
  }

  clearFocusedRemedy() {
    this.focusedRemedy = null;
    this.materiaMedica = null;
    this.materiaMedicaError = '';
  }

  isFocusedRemedy(remedyId: string) {
    return this.focusedRemedy?.id === remedyId;
  }

  scorePercent(score: number) {
    if (!this.maxResultScore) return 0;
    return Math.max(8, Math.round((score / this.maxResultScore) * 100));
  }

  async searchRubrics() {
    const q = this.rubricQuery.trim();
    if (q.length < 2) return;

    this.searching = true;
    this.error = '';
    this.searchedOnce = true;
    try {
      this.searchResults = await this.api.searchRubrics(q, this.selectedSourceId || this.analysis?.source?.id);
    } catch {
      this.error = 'Rubric search failed.';
      this.searchResults = [];
    } finally {
      this.searching = false;
    }
  }

  hasRubric(rubricId: string) {
    return this.selectedRubrics.some((item) => item.rubricId === rubricId);
  }

  addRubric(rubric: RubricSearchResult) {
    if (this.hasRubric(rubric.id)) return;
    this.selectedRubrics = [
      ...this.selectedRubrics,
      {
        rubricId: rubric.id,
        weight: 2,
        rubric: {
          id: rubric.id,
          chapter: rubric.chapter,
          subchapter: rubric.subchapter,
          text: rubric.text,
          parentPath: rubric.parentPath
        }
      }
    ];
    this.message = 'Symptom added to case.';
  }

  removeRubric(rubricId: string) {
    this.selectedRubrics = this.selectedRubrics.filter((item) => item.rubricId !== rubricId);
  }

  private rubricPayload() {
    return this.selectedRubrics.map((item) => ({
      rubricId: item.rubricId,
      weight: item.weight
    }));
  }

  async saveRubrics() {
    if (!this.analysis) return;
    this.saving = true;
    this.error = '';
    this.message = '';
    try {
      this.analysis = await this.api.updateAnalysis(this.analysis.id, { rubrics: this.rubricPayload() });
      this.hydrateFromAnalysis(this.analysis);
      this.message = 'Case rubrics saved.';
    } catch {
      this.error = 'Could not save rubrics.';
    } finally {
      this.saving = false;
    }
  }

  async saveNotes() {
    if (!this.analysis) return;
    this.saving = true;
    this.error = '';
    this.message = '';
    try {
      this.analysis = await this.api.updateAnalysis(this.analysis.id, { notes: this.notes });
      this.message = 'Notes saved.';
    } catch {
      this.error = 'Could not save notes.';
    } finally {
      this.saving = false;
    }
  }

  async runRepertorization() {
    if (!this.analysis) return;
    this.repertorizing = true;
    this.error = '';
    this.message = '';
    try {
      await this.saveRubrics();
      this.analysis = await this.api.repertorize(this.analysis.id);
      this.hydrateFromAnalysis(this.analysis);
      this.message = 'Repertorization complete. Review ranked remedies on the right.';
    } catch {
      this.error = 'Repertorization failed. Add rubrics and try again.';
    } finally {
      this.repertorizing = false;
    }
  }

  async chooseRemedy(remedy: { id: string; name: string; abbreviation: string }) {
    if (!this.analysis) return;
    this.selectingRemedyId = remedy.id;
    this.error = '';
    this.message = '';
    try {
      this.analysis = await this.api.selectRemedy(this.analysis.id, remedy.id);
      await this.focusRemedy(remedy);
      this.message = `${remedy.name} selected as the case remedy.`;
    } catch {
      this.error = 'Could not select remedy.';
    } finally {
      this.selectingRemedyId = '';
    }
  }

  openPrescriptionWithRemedy() {
    if (!this.analysis?.selectedRemedy || !this.consultationId) return;
    void this.router.navigate(['/', ROUTE_PATHS.APPOINTMENTS], {
      queryParams: {
        consultationId: this.consultationId,
        remedy: this.analysis.selectedRemedy.name
      }
    });
  }
}
