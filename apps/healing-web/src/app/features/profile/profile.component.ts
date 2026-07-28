import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AuthModalService } from '../../core/services/auth-modal.service';
import type { PatientProfile, PatientProfileUpdateRequest } from '../../core/models/auth.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly authModal = inject(AuthModalService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly needsLogin = signal(false);
  readonly patientCode = signal<string | null>(null);

  readonly profileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.email]],
    alternateMobile: [''],
    dateOfBirth: [''],
    gender: [''],
    occupation: [''],
    maritalStatus: [''],
    preferredLanguage: [''],
    emergencyContactName: [''],
    emergencyContactPhone: [''],
    emergencyContactRelation: [''],
    patientNotes: [''],
    sleepPattern: [''],
    mentalTemperament: [''],
    stressTriggers: [''],
    fearsPhobias: [''],
    concentrationMemory: [''],
    socialBehaviour: [''],
    currentMedications: [''],
    chronicConditions: [''],
    allergies: [''],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    if (!this.auth.getToken()) {
      this.needsLogin.set(true);
      this.authModal.openLogin();
      return;
    }
    this.needsLogin.set(false);
    this.loading.set(true);
    this.error.set('');
    this.auth.loadPatientProfile().subscribe({
      next: ({ profile }) => {
        this.patientCode.set(profile.patientCode);
        this.profileForm.reset(this.toFormValue(profile));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load your profile.');
        this.loading.set(false);
      },
    });
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid || this.saving()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    try {
      const response = await this.auth.savePatientProfile(this.toPayload());
      this.patientCode.set(response.profile.patientCode);
      this.profileForm.reset(this.toFormValue(response.profile));
      this.message.set('Profile saved.');
    } catch {
      this.error.set('Could not save your profile.');
    } finally {
      this.saving.set(false);
    }
  }

  private toFormValue(profile: PatientProfile) {
    return {
      name: profile.name || '',
      email: profile.email || '',
      alternateMobile: profile.alternateMobile || '',
      dateOfBirth: profile.dateOfBirth || '',
      gender: profile.gender || '',
      occupation: profile.occupation || '',
      maritalStatus: profile.maritalStatus || '',
      preferredLanguage: profile.preferredLanguage || '',
      emergencyContactName: profile.emergencyContactName || '',
      emergencyContactPhone: profile.emergencyContactPhone || '',
      emergencyContactRelation: profile.emergencyContactRelation || '',
      patientNotes: profile.patientNotes || '',
      sleepPattern: profile.sleepPattern || '',
      mentalTemperament: profile.mentalTemperament || '',
      stressTriggers: profile.stressTriggers || '',
      fearsPhobias: profile.fearsPhobias || '',
      concentrationMemory: profile.concentrationMemory || '',
      socialBehaviour: profile.socialBehaviour || '',
      currentMedications: profile.currentMedications || '',
      chronicConditions: profile.chronicConditions || '',
      allergies: profile.allergies || '',
    };
  }

  private toPayload(): PatientProfileUpdateRequest {
    const value = this.profileForm.getRawValue();
    const text = (input: string | null | undefined) => input?.trim() || null;
    return {
      name: text(value.name) || '',
      email: text(value.email),
      alternateMobile: text(value.alternateMobile),
      dateOfBirth: text(value.dateOfBirth),
      gender: (text(value.gender) as PatientProfileUpdateRequest['gender']) || null,
      occupation: text(value.occupation),
      maritalStatus:
        (text(value.maritalStatus) as PatientProfileUpdateRequest['maritalStatus']) || null,
      preferredLanguage: text(value.preferredLanguage),
      emergencyContactName: text(value.emergencyContactName),
      emergencyContactPhone: text(value.emergencyContactPhone),
      emergencyContactRelation: text(value.emergencyContactRelation),
      patientNotes: text(value.patientNotes),
      sleepPattern: text(value.sleepPattern),
      mentalTemperament: text(value.mentalTemperament),
      stressTriggers: text(value.stressTriggers),
      fearsPhobias: text(value.fearsPhobias),
      concentrationMemory: text(value.concentrationMemory),
      socialBehaviour: text(value.socialBehaviour),
      currentMedications: text(value.currentMedications),
      chronicConditions: text(value.chronicConditions),
      allergies: text(value.allergies),
    };
  }
}
