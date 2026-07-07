import { Component, Input } from '@angular/core';
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

  otherEntries(): PatientCaseHistoryEntry[] {
    if (!this.history) return [];
    return this.history.entries.filter((entry) => entry.consultationId !== this.currentConsultationId);
  }

  formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }
}
