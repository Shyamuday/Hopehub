import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DetailRowsComponent } from '@vitalis/platform-ui';
import type { DetailRow } from '@vitalis/platform-ui';
import { PatientIdCardDisplayComponent, type PatientIdCardData } from '@vitalis/platform-ui';
import {
  clinicalRecordsQuery,
  type ActiveDoctor,
  type ClinicalSummary,
  type ConsumerDetail,
} from '../../models/consumers.models';
import { ConsumerClinicalSummaryPanelComponent } from '../consumer-clinical-summary-panel/consumer-clinical-summary-panel';
import { ConsumerConsultationsPanelComponent } from '../consumer-consultations-panel/consumer-consultations-panel';
import { ConsumerHealthPhotosPanelComponent } from '../consumer-health-photos-panel/consumer-health-photos-panel';

@Component({
  selector: 'app-consumer-overview-panel',
  imports: [
    CommonModule,
    RouterLink,
    DetailRowsComponent,
    PatientIdCardDisplayComponent,
    ConsumerClinicalSummaryPanelComponent,
    ConsumerConsultationsPanelComponent,
    ConsumerHealthPhotosPanelComponent,
  ],
  templateUrl: './consumer-overview-panel.html',
  styleUrl: './consumer-overview-panel.scss',
})
export class ConsumerOverviewPanelComponent {
  @Input({ required: true }) detail!: ConsumerDetail;
  @Input({ required: true }) assignForm!: any;
  @Input() clinicalSummary: ClinicalSummary | null = null;
  @Input() clinicalSummaryLoading = false;
  @Input() clinicalRecordsRoute: string | readonly string[] = '';
  @Input() patientId = '';
  @Input() patientCard: PatientIdCardData | null = null;
  @Input() adherenceRows: DetailRow[] = [];
  @Input() clinicalProfileRows: DetailRow[] = [];
  @Input() clinicalProfileHasData = false;
  @Input() activeDoctors: ActiveDoctor[] = [];
  @Input() assigningConsultationId = '';
  @Input() assigning = false;
  @Input() assignError = '';
  @Input() assignDoctorId = '';

  @Output() startAssign = new EventEmitter<string>();
  @Output() confirmAssign = new EventEmitter<void>();
  @Output() cancelAssign = new EventEmitter<void>();

  recordsQuery() {
    return clinicalRecordsQuery(this.patientId, 'prescriptions');
  }
}
