import { Component, Input, output } from '@angular/core';
import type { PatientCaseHistory, PatientCaseHistoryEntry } from '../../case-analysis-page.types';

@Component({
  selector: 'app-patient-case-timeline-panel',
  templateUrl: './patient-case-timeline-panel.html',
  styleUrl: './patient-case-timeline-panel.scss'
})
export class PatientCaseTimelinePanelComponent {
  @Input() history: PatientCaseHistory | null = null;
  @Input() currentConsultationId = '';
  @Input() loading = false;
  @Input() compact = false;

  readonly openAnalysis = output<{ consultationId: string; analysisId: string }>();

  otherEntries(): PatientCaseHistoryEntry[] {
    if (!this.history) return [];
    return this.history.entries.filter((entry) => entry.consultationId !== this.currentConsultationId);
  }

  formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }

  openCaseAnalysis(consultationId: string, analysisId: string) {
    this.openAnalysis.emit({ consultationId, analysisId });
  }

  primaryAnalysis(entry: PatientCaseHistoryEntry) {
    return entry.analyses[0] || null;
  }
}
