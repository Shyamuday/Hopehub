import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { WorklistApiService, type WorklistItem, type WorklistView } from '../worklist-api.service';

@Component({
  selector: 'app-worklist-page',
  imports: [CommonModule, DatePipe, FormField, RouterLink],
  templateUrl: './worklist-page.html',
  styleUrl: './worklist-page.scss'
})
export class WorklistPage {
  private readonly worklistApi = inject(WorklistApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly filterModel = signal<{ search: string; view: WorklistView }>({
    search: '',
    view: this.initialView()
  });
  readonly filterForm = form(this.filterModel);
  readonly counts = signal({ assigned: 0, inProgress: 0, followUpDue: 0 });
  readonly assigned = signal<WorklistItem[]>([]);
  readonly inProgress = signal<WorklistItem[]>([]);
  readonly followUpDue = signal<WorklistItem[]>([]);

  constructor() {
    void this.load();
  }

  private initialView(): WorklistView {
    const view = this.route.snapshot.queryParamMap.get('view');
    if (view === 'ASSIGNED' || view === 'IN_PROGRESS' || view === 'FOLLOW_UP_DUE' || view === 'ALL') {
      return view;
    }
    return 'ALL';
  }

  async load() {
    const { search, view } = this.filterModel();
    this.error.set('');
    this.loading.set(true);
    try {
      const response = await this.worklistApi.loadWorklist(view, search);
      this.counts.set(response.counts);
      this.assigned.set(response.sections.assigned);
      this.inProgress.set(response.sections.inProgress);
      this.followUpDue.set(response.sections.followUpDue);
    } catch {
      this.error.set('Could not load your worklist.');
    } finally {
      this.loading.set(false);
    }
  }

  showSection(section: 'ASSIGNED' | 'IN_PROGRESS' | 'FOLLOW_UP_DUE') {
    return this.filterModel().view === 'ALL' || this.filterModel().view === section;
  }

  setView(view: WorklistView) {
    this.filterModel.update((model) => ({ ...model, view }));
    void this.load();
  }

  openInAppointments(consultationId: string) {
    void this.router.navigate(['/', ROUTE_PATHS.APPOINTMENTS], { queryParams: { consultationId } });
  }

  openCaseAnalysis(consultationId: string) {
    void this.router.navigate(['/', ROUTE_PATHS.CASE_ANALYSIS, consultationId, 'case-analysis']);
  }

  scanPatient(patientCode: string | null | undefined) {
    if (!patientCode) {
      return;
    }
    void this.router.navigate(['/', 'scan', 'patient', patientCode]);
  }
}
