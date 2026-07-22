import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { form, FormField } from '@angular/forms/signals';
import { environment } from '../../../environments/environment';
import { API_PATHS } from '../../core/constants/api-paths.constants';
import { ConsultationNavigationService } from '../../core/services/consultation-navigation.service';
import { ViewportService } from '@hopehub/platform-ui';

type RepertorySource = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  rubricCount?: number | null;
  provider?: 'local' | 'oorep';
};

type MmSource = {
  id: string;
  code: string;
  name: string;
  author?: string | null;
  year?: number | null;
  language?: string | null;
  provider?: 'local' | 'oorep';
};

type RemedyRef = { id: string; name: string; abbreviation: string };

type RubricResult = {
  id: string;
  chapter: string;
  subchapter?: string | null;
  text: string;
  parentPath?: string | null;
  source?: { id: string; name: string; code: string };
  remedies: Array<{ grade: number; remedy: RemedyRef }>;
};

type MmSearchResult = {
  remedyId: string;
  remedyName: string;
  remedyAbbreviation: string;
  sections: Array<{ id: string; heading: string | null; content: string; depth: number }>;
};

type Mode = 'repertory' | 'materia-medica';

@Component({
  selector: 'app-repertory-browser',
  imports: [FormField, CommonModule],
  templateUrl: './repertory-browser.html',
  styleUrl: './repertory-browser.scss',
})
export class RepertoryBrowserPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl;
  private readonly viewport = inject(ViewportService);
  private readonly route = inject(ActivatedRoute);
  private readonly consultationNav = inject(ConsultationNavigationService);

  readonly consultationId = signal('');
  readonly caseAnalysisId = signal('');

  readonly isMobile = computed(() => this.viewport.isMobile());
  readonly filtersOpen = signal(false);
  readonly showMmList = computed(() => !this.isMobile() || !this.selectedMmResult());
  readonly showMmDetail = computed(() => !this.isMobile() || !!this.selectedMmResult());

  readonly mode = signal<Mode>('repertory');
  readonly sources = signal<RepertorySource[]>([]);
  readonly mmSources = signal<MmSource[]>([]);
  readonly rubricResults = signal<RubricResult[]>([]);
  readonly mmResults = signal<MmSearchResult[]>([]);
  readonly selectedMmResult = signal<MmSearchResult | null>(null);

  readonly searchModel = signal({
    query: '',
    sourceId: '',
    mmSourceId: '',
    minWeight: '1',
  });
  readonly searchForm = form(this.searchModel);

  readonly loadingSources = signal(false);
  readonly searching = signal(false);
  readonly searchedOnce = signal(false);
  readonly totalResults = signal(0);
  readonly currentPage = signal(0);
  readonly totalPages = signal(0);

  toggleFilters() {
    this.filtersOpen.update((open) => !open);
  }

  constructor() {
    void this.loadCatalog();
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.consultationId.set(params.get('consultationId') || '');
      this.caseAnalysisId.set(params.get('caseAnalysisId') || '');
      const mode = params.get('mode');
      if (mode === 'materia-medica') {
        this.mode.set('materia-medica');
      }
    });
  }

  hasConsultationContext() {
    return !!this.consultationId();
  }

  addRubricToCase(rubric: RubricResult) {
    const consultationId = this.consultationId();
    if (!consultationId) return;
    void this.consultationNav.openCaseAnalysis(consultationId, {
      caseAnalysisId: this.caseAnalysisId() || null,
      rubricQuery: rubric.text,
    });
  }

  async loadCatalog() {
    this.loadingSources.set(true);
    try {
      const [repData, mmData] = await Promise.all([
        firstValueFrom(
          this.http.get<{ sources: RepertorySource[] }>(
            `${this.apiBase}${API_PATHS.PROVIDER.REPERTORY_SOURCES}`,
          ),
        ),
        firstValueFrom(
          this.http.get<{ sources: MmSource[] }>(
            `${this.apiBase}${API_PATHS.PROVIDER.REPERTORY_MM_SOURCES}`,
          ),
        ),
      ]);
      this.sources.set(repData.sources);
      this.mmSources.set(mmData.sources);
      if (repData.sources.length && !this.searchModel().sourceId) {
        const preferred = repData.sources.find((s) => s.code === 'kent') ?? repData.sources[0];
        this.searchModel.update((m) => ({ ...m, sourceId: preferred.id }));
      }
      if (mmData.sources.length && !this.searchModel().mmSourceId) {
        const preferred = mmData.sources.find((s) => s.code === 'boericke') ?? mmData.sources[0];
        this.searchModel.update((m) => ({ ...m, mmSourceId: preferred.id }));
      }
    } catch {
      /* ignore */
    } finally {
      this.loadingSources.set(false);
    }
  }

  switchMode(next: Mode) {
    this.mode.set(next);
    this.rubricResults.set([]);
    this.mmResults.set([]);
    this.selectedMmResult.set(null);
    this.searchedOnce.set(false);
    this.totalResults.set(0);
    this.currentPage.set(0);
    this.totalPages.set(0);
  }

  async search(page = 0) {
    const q = this.searchModel().query.trim();
    if (q.length < 2) return;
    this.searchedOnce.set(true);
    this.searching.set(true);
    this.selectedMmResult.set(null);

    try {
      if (this.mode() === 'repertory') {
        await this.searchRepertory(q, page);
      } else {
        await this.searchMateriaMedica(q, page);
      }
    } finally {
      this.searching.set(false);
    }
  }

  async searchRepertory(q: string, page: number) {
    const data = await firstValueFrom(
      this.http.get<{
        rubrics: RubricResult[];
        totalResults?: number;
        page?: number;
        totalPages?: number;
      }>(`${this.apiBase}${API_PATHS.PROVIDER.REPERTORY_RUBRICS_SEARCH}`, {
        params: {
          q,
          limit: '50',
          page: String(page),
          minWeight: this.searchModel().minWeight,
          ...(this.searchModel().sourceId ? { sourceId: this.searchModel().sourceId } : {}),
        },
      }),
    );
    this.rubricResults.set(data.rubrics);
    this.mmResults.set([]);
    this.totalResults.set(data.totalResults ?? data.rubrics.length);
    this.currentPage.set(data.page ?? page);
    this.totalPages.set(data.totalPages ?? 1);
  }

  async searchMateriaMedica(q: string, page: number) {
    const sourceId = this.searchModel().mmSourceId;
    if (!sourceId) return;

    const data = await firstValueFrom(
      this.http.get<{ results: MmSearchResult[]; totalResults?: number }>(
        `${this.apiBase}${API_PATHS.PROVIDER.REPERTORY_MM_SEARCH}`,
        {
          params: { q, sourceId, page: String(page), limit: '40' },
        },
      ),
    );
    this.mmResults.set(data.results);
    this.rubricResults.set([]);
    this.totalResults.set(data.totalResults ?? data.results.length);
    this.currentPage.set(page);
    this.totalPages.set(1);
  }

  async nextPage() {
    if (this.currentPage() + 1 >= this.totalPages()) return;
    await this.search(this.currentPage() + 1);
  }

  async prevPage() {
    if (this.currentPage() <= 0) return;
    await this.search(this.currentPage() - 1);
  }

  openMmResult(result: MmSearchResult) {
    this.selectedMmResult.set(result);
  }

  closeMmResult() {
    this.selectedMmResult.set(null);
  }

  async openMateriaMedicaFromRubric(remedy: RemedyRef) {
    if (this.mode() !== 'materia-medica') {
      this.switchMode('materia-medica');
    }
    this.searchModel.update((m) => ({ ...m, query: remedy.abbreviation }));
    await this.search(0);
    const match = this.mmResults().find((r) => r.remedyAbbreviation === remedy.abbreviation);
    if (match) this.selectedMmResult.set(match);
  }

  isLocalSource() {
    const id = this.searchModel().sourceId;
    return id && !id.startsWith('oorep:');
  }

  rubricPath(rubric: RubricResult) {
    return [rubric.chapter, rubric.subchapter, rubric.parentPath].filter(Boolean).join(' › ');
  }

  sourceLabel(source: RepertorySource) {
    const count =
      source.rubricCount != null ? ` · ${source.rubricCount.toLocaleString()} rubrics` : '';
    return `${source.name}${count}`;
  }

  searchPlaceholder() {
    return this.mode() === 'materia-medica'
      ? 'Search MM: anxiety, headache, gums swollen…'
      : 'Search rubrics: cough*, dry*, pain -abdomen, heart palp*…';
  }
}
