import { Component, Input, computed } from '@angular/core';
import {
  buildDetailRows,
  DetailRowsComponent,
  PATIENT_CLINICAL_PROFILE_FIELDS,
  patientClinicalProfileHasData,
  type PatientClinicalProfile
} from '@hopehub/platform-ui';

export type { PatientClinicalProfile };

@Component({
  selector: 'app-patient-health-profile',
  imports: [DetailRowsComponent],
  templateUrl: './patient-health-profile.html',
  styleUrl: './patient-health-profile.scss'
})
export class PatientHealthProfileComponent {
  @Input({ required: true }) profile!: PatientClinicalProfile;
  @Input() compact = false;

  readonly rows = computed(() => buildDetailRows(this.profile, PATIENT_CLINICAL_PROFILE_FIELDS));

  hasAny(): boolean {
    return patientClinicalProfileHasData(this.profile);
  }
}
