import { CommonModule, DatePipe, formatDate } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { buildDetailRows, DetailRowsComponent } from '@hopehub/platform-ui';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { ConsultationNavigationService } from '../../../core/services/consultation-navigation.service';
import {
  WorklistApiService,
  type WorklistItem,
  type WorklistResponse,
  type WorklistView,
} from '../worklist-api.service';
import { worklistItemMetaFields } from '../constants/worklist-detail.fields';

@Component({
  selector: 'app-worklist-page',
  imports: [CommonModule, DatePipe, FormField, RouterLink, DetailRowsComponent],
  templateUrl: './worklist-page.html',
  styleUrl: './worklist-page.scss',
})
export class WorklistPage {
  private readonly worklistApi = inject(WorklistApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly consultationNav = inject(ConsultationNavigationService);

  private readonly worklistMetaFieldDefs = worklistItemMetaFields((iso) =>
    formatDate(iso, 'mediumDate', 'en-US'),
  );

  readonly loading = signal(false);
  readonly refreshing = signal(false);
  readonly error = signal('');
  readonly filterModel = signal<{ search: string; view: WorklistView }>({
    search: '',
    view: this.initialView(),
  });
  readonly filterForm = form(this.filterModel);
  readonly counts = signal({ assigned: 0, inProgress: 0, followUpDue: 0 });
  readonly assigned = signal<WorklistItem[]>([]);
  readonly inProgress = signal<WorklistItem[]>([]);
  readonly followUpDue = signal<WorklistItem[]>([]);
  readonly expandedCardId = signal<string | null>(null);

  private syncViewFromRoute(params: { get(name: string): string | null }) {
    const raw = params.get('view');
    const view: WorklistView =
      raw === 'ASSIGNED' || raw === 'IN_PROGRESS' || raw === 'FOLLOW_UP_DUE' || raw === 'ALL'
        ? raw
        : 'ALL';

    if (this.filterModel().view !== view) {
      this.filterModel.update((model) => ({ ...model, view }));
      void this.load();
    }
  }

  constructor() {
    const initial = this.filterModel();
    const cached = this.worklistApi.peekSnapshot(initial.view, initial.search);
    if (cached) {
      this.applyResponse(cached);
    }

    this.route.queryParamMap.subscribe((params) => {
      this.syncViewFromRoute(params);
    });
    void this.load({ preferCache: Boolean(cached) });
  }

  private initialView(): WorklistView {
    const view = this.route.snapshot.queryParamMap.get('view');
    if (
      view === 'ASSIGNED' ||
      view === 'IN_PROGRESS' ||
      view === 'FOLLOW_UP_DUE' ||
      view === 'ALL'
    ) {
      return view;
    }
    return 'ALL';
  }

  async load(options?: { preferCache?: boolean }) {
    const { search, view } = this.filterModel();
    const cached = this.worklistApi.peekSnapshot(view, search);
    if (cached && options?.preferCache) {
      this.applyResponse(cached);
    }

    const hasVisibleData =
      this.assigned().length > 0 || this.inProgress().length > 0 || this.followUpDue().length > 0;
    if (hasVisibleData || cached) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.error.set('');
    try {
      const response = await this.worklistApi.loadWorklist(view, search);
      this.applyResponse(response);
    } catch {
      if (!hasVisibleData && !cached) {
        this.error.set('Could not load your worklist.');
      }
    } finally {
      this.loading.set(false);
      this.refreshing.set(false);
    }
  }

  private applyResponse(response: WorklistResponse) {
    this.counts.set(response.counts);
    this.assigned.set(response.sections.assigned);
    this.inProgress.set(response.sections.inProgress);
    this.followUpDue.set(response.sections.followUpDue);
  }

  showSection(section: 'ASSIGNED' | 'IN_PROGRESS' | 'FOLLOW_UP_DUE') {
    return this.filterModel().view === 'ALL' || this.filterModel().view === section;
  }

  pageTitle() {
    switch (this.filterModel().view) {
      case 'ASSIGNED':
        return 'Assigned cases';
      case 'IN_PROGRESS':
        return 'In-progress cases';
      case 'FOLLOW_UP_DUE':
        return 'Follow-up due';
      default:
        return 'Worklist';
    }
  }

  pageDescription() {
    switch (this.filterModel().view) {
      case 'ASSIGNED':
        return 'Newly assigned consultations waiting for you to start.';
      case 'IN_PROGRESS':
        return 'Cases you are actively working on right now.';
      case 'FOLLOW_UP_DUE':
        return 'Patients due for a follow-up prescription or review.';
      default:
        return 'Your active cases — assigned, in progress, and follow-ups due.';
    }
  }

  setView(view: WorklistView) {
    this.filterModel.update((model) => ({ ...model, view }));
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: view === 'ALL' ? null : view },
      queryParamsHandling: 'merge',
    });
    void this.load();
  }

  primaryAction(section: 'ASSIGNED' | 'IN_PROGRESS' | 'FOLLOW_UP_DUE') {
    return this.consultationNav.primaryActionForSection(section);
  }

  openConsultationContext(consultationId: string) {
    void this.consultationNav.openPrescriptionContext(consultationId);
  }

  openPrescription(consultationId: string, patientName?: string | null) {
    void this.consultationNav.openPrescription(consultationId, { patientName });
  }

  openCaseAnalysis(consultationId: string, patientName?: string | null) {
    void this.consultationNav.openCaseAnalysis(consultationId, { patientName });
  }

  scanPatient(patientCode: string | null | undefined) {
    if (!patientCode) {
      return;
    }
    void this.router.navigate(['/', ROUTE_PATHS.PATIENT_SCAN, patientCode]);
  }

  worklistMetaRows(item: WorklistItem) {
    return buildDetailRows(item, this.worklistMetaFieldDefs);
  }

  toggleCardMenu(consultationId: string) {
    this.expandedCardId.update((current) => (current === consultationId ? null : consultationId));
  }

  isCardMenuOpen(consultationId: string) {
    return this.expandedCardId() === consultationId;
  }
}
