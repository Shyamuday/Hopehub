import { CommonModule, DatePipe } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ROUTE_PATHS } from '../../../core/constants/app-routes.constants';
import { WorklistApiService, type WorklistItem, type WorklistView } from '../worklist-api.service';

@Component({
  selector: 'app-worklist-page',
  imports: [CommonModule, DatePipe, FormsModule, RouterLink],
  templateUrl: './worklist-page.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './worklist-page.scss'
})
export class WorklistPage {
  loading = false;
  error = '';
  search = '';
  view: WorklistView = 'ALL';
  counts = { assigned: 0, inProgress: 0, followUpDue: 0 };
  assigned: WorklistItem[] = [];
  inProgress: WorklistItem[] = [];
  followUpDue: WorklistItem[] = [];

  constructor(
    private readonly worklistApi: WorklistApiService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    const view = this.route.snapshot.queryParamMap.get('view');
    if (view === 'ASSIGNED' || view === 'IN_PROGRESS' || view === 'FOLLOW_UP_DUE' || view === 'ALL') {
      this.view = view;
    }
    void this.load();
  }

  async load() {
    this.error = '';
    this.loading = true;
    try {
      const response = await this.worklistApi.loadWorklist(this.view, this.search);
      this.counts = response.counts;
      this.assigned = response.sections.assigned;
      this.inProgress = response.sections.inProgress;
      this.followUpDue = response.sections.followUpDue;
    } catch {
      this.error = 'Could not load your worklist.';
    } finally {
      this.loading = false;
    }
  }

  showSection(section: 'ASSIGNED' | 'IN_PROGRESS' | 'FOLLOW_UP_DUE') {
    return this.view === 'ALL' || this.view === section;
  }

  setView(view: WorklistView) {
    this.view = view;
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
