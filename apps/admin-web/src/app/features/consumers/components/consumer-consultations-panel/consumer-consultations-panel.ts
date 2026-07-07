import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { clinicalRecordsQuery, type ActiveDoctor, type ConsumerDetail } from '../../models/consumers.models';

@Component({
  selector: 'app-consumer-consultations-panel',
  imports: [CommonModule, FormField, RouterLink],
  templateUrl: './consumer-consultations-panel.html',
  styleUrl: './consumer-consultations-panel.scss'
})
export class ConsumerConsultationsPanelComponent {
  @Input({ required: true }) assignForm!: any;
  @Input() consultations: ConsumerDetail['consultations'] = [];
  @Input() clinicalRecordsRoute: string | readonly string[] = '';
  @Input() patientId = '';
  @Input() activeDoctors: ActiveDoctor[] = [];
  @Input() assigningConsultationId = '';
  @Input() assigning = false;
  @Input() assignError = '';
  @Input() assignDoctorId = '';

  @Output() startAssign = new EventEmitter<string>();
  @Output() confirmAssign = new EventEmitter<void>();
  @Output() cancelAssign = new EventEmitter<void>();

  recordsQuery(consultationId: string) {
    return clinicalRecordsQuery(this.patientId, 'prescriptions', consultationId);
  }
}
