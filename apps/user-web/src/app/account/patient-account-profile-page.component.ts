import { Component } from '@angular/core';
import { PatientProfileComponent } from '../patient-profile.component';

@Component({
  selector: 'app-patient-account-profile-page',
  standalone: true,
  imports: [PatientProfileComponent],
  template: `<app-patient-profile [showAddresses]="false" [accountPage]="true" />`,
  styles: [`:host { display: block; }`]
})
export class PatientAccountProfilePage {}
