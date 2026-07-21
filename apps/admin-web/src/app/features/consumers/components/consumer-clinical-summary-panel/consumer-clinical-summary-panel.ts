import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DetailRowsComponent } from '@hopehub/platform-ui';
import { clinicalRecordsQuery, type ClinicalSummary } from '../../models/consumers.models';

@Component({
  selector: 'app-consumer-clinical-summary-panel',
  imports: [CommonModule, RouterLink, DetailRowsComponent],
  templateUrl: './consumer-clinical-summary-panel.html',
  styleUrl: './consumer-clinical-summary-panel.scss'
})
export class ConsumerClinicalSummaryPanelComponent {
  @Input() clinicalSummary: ClinicalSummary | null = null;
  @Input() clinicalSummaryLoading = false;
  @Input() clinicalRecordsRoute: string | readonly string[] = '';
  @Input() patientId = '';

  recordsQuery(tab: 'prescriptions' | 'analyses', consultationId?: string) {
    return clinicalRecordsQuery(this.patientId, tab, consultationId);
  }
}
