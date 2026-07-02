import { Component, Input } from '@angular/core';

export type PatientClinicalProfile = {
  allergies?: string | null;
  currentMedications?: string | null;
  chronicConditions?: string | null;
};

@Component({
  selector: 'app-patient-health-profile',
  imports: [],
  templateUrl: './patient-health-profile.html',
  styleUrl: './patient-health-profile.scss'
})
export class PatientHealthProfileComponent {
  @Input({ required: true }) profile!: PatientClinicalProfile;
  @Input() compact = false;

  hasAny(): boolean {
    return Boolean(
      this.profile.allergies?.trim() ||
        this.profile.currentMedications?.trim() ||
        this.profile.chronicConditions?.trim()
    );
  }
}
