import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import { ContactMethod } from '../../core/models/contact.model';
import { LeadService, LoadingService, NotificationService } from '../../core/services';
import { FormDropdownComponent, FormDropdownOption } from '../../shared/components';

type CareContributorTrack =
  'PROFESSIONAL_PSYCHOLOGIST' | 'PSYCHOLOGY_STUDENT_VOLUNTEER' | 'PEER_SUPPORT_VOLUNTEER';
type CareTeamMemberType =
  | 'MENTAL_WELLNESS_PROFESSIONAL'
  | 'QUALIFIED_COUNSELLOR'
  | 'PSYCHOLOGY_STUDENT_VOLUNTEER'
  | 'PEER_SUPPORT_VOLUNTEER'
  | 'NLP_COACH'
  | 'LIFE_COACH'
  | 'MEDITATION_BREATHWORK_GUIDE'
  | 'CAREER_STUDY_MENTOR';

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, FormDropdownComponent],
  templateUrl: './careers.component.html',
  styleUrl: './careers.component.scss',
})
export class CareersComponent {
  readonly notes = NOTE_CONTENT;
  private readonly formBuilder = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly loadingService = inject(LoadingService);
  private readonly notificationService = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly selectedTrack = signal<CareContributorTrack>('PROFESSIONAL_PSYCHOLOGIST');
  readonly applicationTracks: Array<{
    value: CareTeamMemberType;
    track: CareContributorTrack;
    title: string;
    description: string;
  }> = [
    {
      value: 'MENTAL_WELLNESS_PROFESSIONAL',
      track: 'PROFESSIONAL_PSYCHOLOGIST',
      title: 'Mental wellness professional',
      description: 'Verified professional pathway for paid Hope Hub consultations.',
    },
    {
      value: 'QUALIFIED_COUNSELLOR',
      track: 'PROFESSIONAL_PSYCHOLOGIST',
      title: 'Qualified counsellor',
      description: 'Counselling qualification or experience for structured support sessions.',
    },
    {
      value: 'PSYCHOLOGY_STUDENT_VOLUNTEER',
      track: 'PSYCHOLOGY_STUDENT_VOLUNTEER',
      title: 'Psychology student emotional support listener',
      description:
        'Supervised, non-clinical emotional support listening and community learning pathway.',
    },
    {
      value: 'PEER_SUPPORT_VOLUNTEER',
      track: 'PEER_SUPPORT_VOLUNTEER',
      title: 'Peer emotional support listener',
      description: 'Non-clinical listening, community support, and guided escalation.',
    },
    {
      value: 'NLP_COACH',
      track: 'PROFESSIONAL_PSYCHOLOGIST',
      title: 'NLP coach',
      description: 'Mindset, confidence, habits, communication, and change-work support.',
    },
    {
      value: 'LIFE_COACH',
      track: 'PROFESSIONAL_PSYCHOLOGIST',
      title: 'Life coach',
      description: 'Goals, clarity, emotional direction, and practical life guidance.',
    },
    {
      value: 'MEDITATION_BREATHWORK_GUIDE',
      track: 'PROFESSIONAL_PSYCHOLOGIST',
      title: 'Meditation / breathwork guide',
      description: 'Grounding, relaxation, breathing, mindfulness, and calming practices.',
    },
    {
      value: 'CAREER_STUDY_MENTOR',
      track: 'PROFESSIONAL_PSYCHOLOGIST',
      title: 'Career / study mentor',
      description: 'Career confusion, study pressure, confidence, and student guidance.',
    },
  ];
  readonly specializationOptions: FormDropdownOption[] = [
    { value: '', label: 'Select specialization' },
    { value: 'Anxiety and stress', label: 'Anxiety and stress' },
    { value: 'Relationship counselling', label: 'Relationship counselling' },
    { value: 'Breakup support', label: 'Breakup support' },
    { value: 'Career and study pressure', label: 'Career and study pressure' },
    { value: 'Family counselling', label: 'Family counselling' },
    { value: 'General emotional support', label: 'General emotional support' },
    { value: 'Other', label: 'Other' },
  ];
  readonly experienceOptions: FormDropdownOption[] = [
    { value: '', label: 'Select experience' },
    { value: '0-1 years', label: '0-1 years' },
    { value: '1-3 years', label: '1-3 years' },
    { value: '3-5 years', label: '3-5 years' },
    { value: '5+ years', label: '5+ years' },
  ];
  readonly preferredChannelOptions: FormDropdownOption[] = [
    { value: ContactMethod.WHATSAPP, label: 'WhatsApp' },
    { value: ContactMethod.TELEGRAM, label: 'Telegram' },
    { value: ContactMethod.EMAIL, label: 'Email' },
    { value: ContactMethod.PHONE, label: 'Phone' },
  ];
  readonly genderOptions: FormDropdownOption[] = [
    { value: '', label: 'Select gender' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'MALE', label: 'Male' },
    { value: 'OTHER', label: 'Other' },
    { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
  ];

  readonly applicationForm = this.formBuilder.group({
    applicationTrack: ['PROFESSIONAL_PSYCHOLOGIST' as CareContributorTrack, [Validators.required]],
    careTeamType: ['MENTAL_WELLNESS_PROFESSIONAL' as CareTeamMemberType, [Validators.required]],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    gender: [''],
    city: ['', [Validators.required]],
    qualification: ['', [Validators.required]],
    qualifiedFrom: [''],
    specialization: ['', [Validators.required]],
    experienceYears: ['', [Validators.required]],
    registrationDetails: [''],
    languages: ['', [Validators.required]],
    availability: ['', [Validators.required]],
    preferredChannel: [ContactMethod.WHATSAPP, [Validators.required]],
    resumeLink: ['', [Validators.required]],
    portfolioLink: [''],
    supervisionDetails: [''],
    livedExperienceSummary: [''],
    agreesToNonClinicalRole: [false],
    whyJoin: ['', [Validators.required, Validators.minLength(40)]],
    consent: [false, [Validators.requiredTrue]],
  });

  constructor() {
    this.updateTrackValidators(this.selectedTrack());
  }

  selectTrack(type: CareTeamMemberType): void {
    const track =
      this.applicationTracks.find((item) => item.value === type)?.track ??
      'PROFESSIONAL_PSYCHOLOGIST';
    this.selectedTrack.set(track);
    this.applicationForm.controls.careTeamType.setValue(type);
    this.applicationForm.controls.applicationTrack.setValue(track);
    this.updateTrackValidators(track);
  }

  isTrack(track: CareContributorTrack): boolean {
    return this.selectedTrack() === track;
  }

  isType(type: CareTeamMemberType): boolean {
    return this.applicationForm.controls.careTeamType.value === type;
  }

  async onSubmit(): Promise<void> {
    if (this.applicationForm.invalid) {
      this.applicationForm.markAllAsTouched();
      this.notificationService.warning('Please complete the required application fields.');
      return;
    }

    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.loadingService.show();

    const value = this.applicationForm.getRawValue();

    await new Promise<void>((resolve) => {
      this.leadService
        .sendCounsellorApplication({
          applicationTrack: value.applicationTrack as CareContributorTrack,
          careTeamType: value.careTeamType || 'MENTAL_WELLNESS_PROFESSIONAL',
          fullName: value.fullName || '',
          email: value.email || '',
          phone: value.phone || '',
          gender: (value.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY') || null,
          city: value.city || '',
          qualification: value.qualification || '',
          qualifiedFrom: value.qualifiedFrom || '',
          specialization: value.specialization || '',
          experienceYears: value.experienceYears || '',
          registrationDetails: value.registrationDetails || '',
          languages: value.languages || '',
          availability: value.availability || '',
          preferredChannel: value.preferredChannel as ContactMethod,
          resumeLink: value.resumeLink || '',
          portfolioLink: value.portfolioLink || '',
          supervisionDetails: value.supervisionDetails || '',
          livedExperienceSummary: value.livedExperienceSummary || '',
          agreesToNonClinicalRole: Boolean(value.agreesToNonClinicalRole),
          whyJoin: value.whyJoin || '',
        })
        .subscribe({
          next: (success) => {
            if (success) {
              const message = this.successMessageForTrack(
                value.applicationTrack as CareContributorTrack,
              );
              this.successMessage.set(message);
              this.notificationService.success(message);
              this.applicationForm.reset({
                applicationTrack: 'PROFESSIONAL_PSYCHOLOGIST',
                careTeamType: 'MENTAL_WELLNESS_PROFESSIONAL',
                preferredChannel: ContactMethod.WHATSAPP,
                agreesToNonClinicalRole: false,
                consent: false,
              });
              this.selectedTrack.set('PROFESSIONAL_PSYCHOLOGIST');
              this.updateTrackValidators('PROFESSIONAL_PSYCHOLOGIST');
            } else {
              const message = 'Could not submit your application. Please try again.';
              this.errorMessage.set(message);
              this.notificationService.error(message);
            }
            resolve();
          },
          error: () => {
            const message = 'Could not submit your application. Please try again.';
            this.errorMessage.set(message);
            this.notificationService.error(message);
            resolve();
          },
        });
    });

    this.isSubmitting.set(false);
    this.loadingService.hide();
  }

  hasError(controlName: string): boolean {
    const control = this.applicationForm.get(controlName);
    return Boolean(control?.invalid && control?.touched);
  }

  private updateTrackValidators(track: CareContributorTrack): void {
    const setRequired = (
      controlName: keyof typeof this.applicationForm.controls,
      required: boolean,
    ) => {
      const control = this.applicationForm.controls[controlName];
      control.setValidators(required ? [Validators.required] : []);
      control.updateValueAndValidity({ emitEvent: false });
    };

    const professional = track === 'PROFESSIONAL_PSYCHOLOGIST';
    const student = track === 'PSYCHOLOGY_STUDENT_VOLUNTEER';
    const peer = track === 'PEER_SUPPORT_VOLUNTEER';
    const needsRegistration =
      professional &&
      this.applicationForm.controls.careTeamType.value === 'MENTAL_WELLNESS_PROFESSIONAL';

    setRequired('qualification', professional || student);
    setRequired('specialization', professional || student);
    setRequired('experienceYears', professional);
    setRequired('registrationDetails', needsRegistration);
    setRequired('resumeLink', professional);
    setRequired('supervisionDetails', student);
    setRequired('livedExperienceSummary', peer);

    const nonClinicalAgreement = this.applicationForm.controls.agreesToNonClinicalRole;
    nonClinicalAgreement.setValidators(student || peer ? [Validators.requiredTrue] : []);
    nonClinicalAgreement.updateValueAndValidity({ emitEvent: false });
  }

  private successMessageForTrack(track: CareContributorTrack): string {
    if (track === 'PROFESSIONAL_PSYCHOLOGIST') {
      return 'Application submitted. Our team will verify your profile before discussing paid Hope Hub consultations.';
    }
    if (track === 'PSYCHOLOGY_STUDENT_VOLUNTEER') {
      return 'Emotional support listener application submitted. We will review your supervision details and contact shortlisted applicants.';
    }
    return 'Peer emotional support listener application submitted. We will review it and contact shortlisted applicants.';
  }
}
