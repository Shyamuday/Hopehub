import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import {
  LISTENER_GUIDELINES_SECTIONS,
  LISTENER_GUIDELINES_VERSION,
} from '../../core/content/listener-guidelines.content';
import {
  LISTENER_TRAINING_MODULES,
  LISTENER_TRAINING_VERSION,
} from '../../core/content/listener-training.content';
import { ContactMethod } from '../../core/models/contact.model';
import { LeadService, LoadingService, NotificationService } from '../../core/services';
import {
  AppButtonComponent,
  FormCheckboxComponent,
  FormDropdownComponent,
  FormDropdownOption,
  FormFieldComponent,
  SelectableCardComponent,
} from '../../shared/components';

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
type ListenerScreeningQuestion = {
  id: string;
  text: string;
  options: Array<{ id: string; text: string }>;
};

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    AppButtonComponent,
    FormCheckboxComponent,
    FormDropdownComponent,
    FormFieldComponent,
    SelectableCardComponent,
  ],
  templateUrl: './careers.component.html',
  styleUrl: './careers.component.scss',
})
export class CareersComponent implements OnInit, OnDestroy {
  readonly notes = NOTE_CONTENT;
  private readonly formBuilder = inject(FormBuilder);
  private readonly leadService = inject(LeadService);
  private readonly loadingService = inject(LoadingService);
  private readonly notificationService = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly selectedTrack = signal<CareContributorTrack>('PROFESSIONAL_PSYCHOLOGIST');
  readonly listenerScreeningAnswers = signal<Record<string, string>>({});
  readonly listenerGuidelinesScrolled = signal(false);
  readonly listenerGuidelinesAccepted = signal(false);
  readonly listenerGuidelinesMinimumReadSeconds = 120;
  readonly listenerGuidelinesRemainingSeconds = signal(this.listenerGuidelinesMinimumReadSeconds);
  readonly listenerGuidelinesTimerComplete = signal(false);
  readonly listenerGuidelinesReadStartedAt = signal<string | null>(null);
  readonly listenerGuidelinesReadSessionToken = signal('');
  readonly listenerGuidelinesReadSessionLoading = signal(false);
  readonly listenerGuidelinesReadSessionError = signal('');
  readonly listenerGuidelinesVersion = LISTENER_GUIDELINES_VERSION;
  readonly listenerGuidelinesSections = LISTENER_GUIDELINES_SECTIONS;
  readonly listenerTrainingScrolled = signal(false);
  readonly listenerTrainingCompleted = signal(false);
  readonly listenerTrainingVersion = LISTENER_TRAINING_VERSION;
  readonly listenerTrainingModules = LISTENER_TRAINING_MODULES;
  private listenerGuidelinesTimerId: ReturnType<typeof setInterval> | null = null;
  private listenerGuidelinesReadStartedAtMs: number | null = null;
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
  readonly listenerScreeningQuestions = signal<ListenerScreeningQuestion[]>([]);
  readonly listenerScreeningQuestionSetId = signal('');
  readonly listenerScreeningQuestionSetVersion = signal('');
  readonly listenerScreeningTitle = signal('Listener safety test');
  readonly listenerScreeningPassScore = signal(0);
  readonly listenerScreeningLoading = signal(false);
  readonly listenerScreeningError = signal('');
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

  ngOnInit(): void {
    this.loadListenerScreeningQuestionSet();
  }

  ngOnDestroy(): void {
    this.clearListenerGuidelinesTimer();
  }

  selectTrack(type: CareTeamMemberType): void {
    const track =
      this.applicationTracks.find((item) => item.value === type)?.track ??
      'PROFESSIONAL_PSYCHOLOGIST';
    this.selectedTrack.set(track);
    this.applicationForm.controls.careTeamType.setValue(type);
    this.applicationForm.controls.applicationTrack.setValue(track);
    this.updateTrackValidators(track);
    this.resetListenerScreeningAndGuidelines();
  }

  isTrack(track: CareContributorTrack): boolean {
    return this.selectedTrack() === track;
  }

  isType(type: CareTeamMemberType): boolean {
    return this.applicationForm.controls.careTeamType.value === type;
  }

  isListenerTrack(): boolean {
    return (
      this.selectedTrack() === 'PSYCHOLOGY_STUDENT_VOLUNTEER' ||
      this.selectedTrack() === 'PEER_SUPPORT_VOLUNTEER'
    );
  }

  answerScreeningQuestion(questionId: string, optionId: string): void {
    this.listenerScreeningAnswers.update((answers) => ({ ...answers, [questionId]: optionId }));
    this.resetListenerGuidelineAcceptance();
    if (this.listenerGuidelinesRequired()) {
      void this.startListenerGuidelinesTimer();
    }
  }

  screeningAnsweredCount(): number {
    const answers = this.listenerScreeningAnswers();
    return this.listenerScreeningQuestions().filter((question) => answers[question.id]).length;
  }

  screeningComplete(): boolean {
    const totalQuestions = this.listenerScreeningQuestions().length;
    return totalQuestions > 0 && this.screeningAnsweredCount() === totalQuestions;
  }

  listenerGuidelinesRequired(): boolean {
    return this.isListenerTrack() && this.screeningComplete();
  }

  listenerGuidelinesAcceptReady(): boolean {
    return this.listenerGuidelinesScrolled() && this.listenerGuidelinesTimerComplete();
  }

  listenerTrainingRequired(): boolean {
    return this.listenerGuidelinesRequired() && this.listenerGuidelinesAccepted();
  }

  listenerTrainingAcceptReady(): boolean {
    return this.listenerTrainingScrolled();
  }

  listenerGuidelinesTimerLabel(): string {
    const remaining = this.listenerGuidelinesRemainingSeconds();
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  listenerGuidelinesReadSeconds(): number {
    if (!this.listenerGuidelinesReadStartedAtMs) return 0;
    return Math.max(0, Math.floor((Date.now() - this.listenerGuidelinesReadStartedAtMs) / 1000));
  }

  startSecureGuidelineReadSession(): void {
    void this.startListenerGuidelinesTimer();
  }

  onGuidelinesScroll(event: Event): void {
    const element = event.target as HTMLElement | null;
    if (!element) return;
    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (remaining <= 12) {
      this.listenerGuidelinesScrolled.set(true);
    }
  }

  acceptListenerGuidelines(): void {
    if (!this.listenerGuidelinesReadSessionToken()) {
      this.notificationService.warning(
        'Please start the secure listener guideline reading session first.',
      );
      void this.startListenerGuidelinesTimer();
      return;
    }
    if (!this.listenerGuidelinesTimerComplete()) {
      this.notificationService.warning(
        `Please spend at least 2 minutes reading the listener guidelines. ${this.listenerGuidelinesTimerLabel()} remaining.`,
      );
      return;
    }
    if (!this.listenerGuidelinesScrolled()) {
      this.notificationService.warning(
        'Please scroll to the end of the listener guidelines first.',
      );
      return;
    }
    this.listenerGuidelinesAccepted.set(true);
  }

  onTrainingScroll(event: Event): void {
    const element = event.target as HTMLElement | null;
    if (!element) return;
    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (remaining <= 12) {
      this.listenerTrainingScrolled.set(true);
    }
  }

  acceptListenerTraining(): void {
    if (!this.listenerTrainingScrolled()) {
      this.notificationService.warning('Please scroll to the end of listener training first.');
      return;
    }
    this.listenerTrainingCompleted.set(true);
  }

  listenerScreeningPayload(): Array<{ questionId: string; optionId: string }> {
    const answers = this.listenerScreeningAnswers();
    return this.listenerScreeningQuestions().map((question) => ({
      questionId: question.id,
      optionId: answers[question.id] || '',
    }));
  }

  async onSubmit(): Promise<void> {
    if (this.applicationForm.invalid) {
      this.applicationForm.markAllAsTouched();
      this.notificationService.warning('Please complete the required application fields.');
      return;
    }
    if (this.isListenerTrack() && this.listenerScreeningLoading()) {
      this.notificationService.warning('Listener screening test is still loading. Please wait.');
      return;
    }
    if (this.isListenerTrack() && !this.listenerScreeningQuestions().length) {
      this.notificationService.warning(
        this.listenerScreeningError() ||
          'Listener screening test is not available right now. Please try again later.',
      );
      return;
    }
    if (this.isListenerTrack() && !this.screeningComplete()) {
      this.notificationService.warning('Please complete all listener screening questions.');
      return;
    }
    if (
      this.isListenerTrack() &&
      this.listenerGuidelinesRequired() &&
      !this.listenerGuidelinesAccepted()
    ) {
      this.notificationService.warning(
        'Please spend 2 minutes reading, scroll to the end, and accept the listener guidelines before submitting.',
      );
      return;
    }
    if (
      this.isListenerTrack() &&
      this.listenerTrainingRequired() &&
      !this.listenerTrainingCompleted()
    ) {
      this.notificationService.warning('Please complete listener training before submitting.');
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
          listenerScreeningAnswers: this.isListenerTrack()
            ? this.listenerScreeningPayload()
            : undefined,
          listenerScreeningQuestionSetId: this.isListenerTrack()
            ? this.listenerScreeningQuestionSetId()
            : undefined,
          listenerScreeningQuestionSetVersion: this.isListenerTrack()
            ? this.listenerScreeningQuestionSetVersion()
            : undefined,
          listenerGuidelinesAccepted: this.listenerGuidelinesRequired()
            ? this.listenerGuidelinesAccepted()
            : undefined,
          listenerGuidelinesVersion: this.listenerGuidelinesRequired()
            ? this.listenerGuidelinesVersion
            : undefined,
          listenerGuidelinesReadSessionToken: this.listenerGuidelinesRequired()
            ? this.listenerGuidelinesReadSessionToken()
            : undefined,
          listenerGuidelinesReadStartedAt: this.listenerGuidelinesRequired()
            ? this.listenerGuidelinesReadStartedAt()
            : undefined,
          listenerGuidelinesReadSeconds: this.listenerGuidelinesRequired()
            ? this.listenerGuidelinesReadSeconds()
            : undefined,
          listenerTrainingCompleted: this.listenerGuidelinesRequired()
            ? this.listenerTrainingCompleted()
            : undefined,
          listenerTrainingVersion: this.listenerGuidelinesRequired()
            ? this.listenerTrainingVersion
            : undefined,
          whyJoin: value.whyJoin || '',
        })
        .subscribe({
          next: (response) => {
            if (response.success) {
              const message = this.successMessageForTrack(
                value.applicationTrack as CareContributorTrack,
                response.autoApproved,
                response.screeningScore ?? undefined,
                response.screeningMaxScore ?? undefined,
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
              this.resetListenerScreeningAndGuidelines();
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

  private resetListenerScreeningAndGuidelines(): void {
    this.listenerScreeningAnswers.set({});
    this.resetListenerGuidelineAcceptance();
  }

  private loadListenerScreeningQuestionSet(): void {
    this.listenerScreeningLoading.set(true);
    this.listenerScreeningError.set('');
    this.leadService.getListenerScreeningQuestionSet().subscribe({
      next: ({ questionSet }) => {
        this.listenerScreeningQuestions.set(questionSet.questions || []);
        this.listenerScreeningQuestionSetId.set(questionSet.id);
        this.listenerScreeningQuestionSetVersion.set(questionSet.version);
        this.listenerScreeningTitle.set(questionSet.title || 'Listener safety test');
        this.listenerScreeningPassScore.set(questionSet.passScore || 0);
        this.resetListenerScreeningAndGuidelines();
        this.listenerScreeningLoading.set(false);
      },
      error: () => {
        this.listenerScreeningQuestions.set([]);
        this.listenerScreeningQuestionSetId.set('');
        this.listenerScreeningQuestionSetVersion.set('');
        this.listenerScreeningPassScore.set(0);
        this.listenerScreeningError.set(
          'Listener screening test is not available right now. Please try again later.',
        );
        this.listenerScreeningLoading.set(false);
      },
    });
  }

  private resetListenerGuidelineAcceptance(): void {
    this.clearListenerGuidelinesTimer();
    this.listenerGuidelinesScrolled.set(false);
    this.listenerGuidelinesAccepted.set(false);
    this.listenerGuidelinesRemainingSeconds.set(this.listenerGuidelinesMinimumReadSeconds);
    this.listenerGuidelinesTimerComplete.set(false);
    this.listenerGuidelinesReadStartedAt.set(null);
    this.listenerGuidelinesReadSessionToken.set('');
    this.listenerGuidelinesReadSessionLoading.set(false);
    this.listenerGuidelinesReadSessionError.set('');
    this.listenerGuidelinesReadStartedAtMs = null;
    this.listenerTrainingScrolled.set(false);
    this.listenerTrainingCompleted.set(false);
  }

  private async startListenerGuidelinesTimer(): Promise<void> {
    if (this.listenerGuidelinesTimerId || this.listenerGuidelinesReadSessionToken()) return;
    const email = this.applicationForm.controls.email.value || '';
    const phone = this.applicationForm.controls.phone.value || '';
    if (!email || !phone) {
      this.listenerGuidelinesReadSessionError.set(
        'Add email and phone to start the secure reading timer.',
      );
      return;
    }
    this.listenerGuidelinesReadSessionLoading.set(true);
    this.listenerGuidelinesReadSessionError.set('');
    try {
      const session = await new Promise<{
        token: string;
        startedAt: string;
        minReadSeconds: number;
      }>((resolve, reject) => {
        this.leadService
          .startListenerGuidelineReadSession({
            applicationTrack: this.selectedTrack() as
              'PSYCHOLOGY_STUDENT_VOLUNTEER' | 'PEER_SUPPORT_VOLUNTEER',
            email,
            phone,
            listenerGuidelinesVersion: this.listenerGuidelinesVersion,
          })
          .subscribe({ next: resolve, error: reject });
      });
      this.listenerGuidelinesReadSessionToken.set(session.token);
      this.listenerGuidelinesReadStartedAt.set(session.startedAt);
      this.listenerGuidelinesReadStartedAtMs = new Date(session.startedAt).getTime();
      this.listenerGuidelinesRemainingSeconds.set(session.minReadSeconds);
    } catch {
      this.listenerGuidelinesReadSessionError.set(
        'Could not start the secure reading timer. Check email/phone and try again.',
      );
      return;
    } finally {
      this.listenerGuidelinesReadSessionLoading.set(false);
    }
    this.listenerGuidelinesTimerId = setInterval(() => {
      const elapsedSeconds = this.listenerGuidelinesReadSeconds();
      const nextRemaining = Math.max(0, this.listenerGuidelinesMinimumReadSeconds - elapsedSeconds);
      this.listenerGuidelinesRemainingSeconds.set(nextRemaining);
      if (nextRemaining === 0) {
        this.listenerGuidelinesTimerComplete.set(true);
        this.clearListenerGuidelinesTimer();
      }
    }, 1000);
  }

  private clearListenerGuidelinesTimer(): void {
    if (!this.listenerGuidelinesTimerId) return;
    clearInterval(this.listenerGuidelinesTimerId);
    this.listenerGuidelinesTimerId = null;
  }

  private successMessageForTrack(
    track: CareContributorTrack,
    autoApproved?: boolean,
    score?: number,
    maxScore?: number,
  ): string {
    if (autoApproved) {
      return `Listener screening passed (${score}/${maxScore}). Your listener profile is auto-approved with chat/voice ₹99 and video ₹299 for 30 minutes.`;
    }
    if (track === 'PROFESSIONAL_PSYCHOLOGIST') {
      return 'Application submitted. Our team will verify your profile before discussing paid Hope Hub consultations.';
    }
    if (track === 'PSYCHOLOGY_STUDENT_VOLUNTEER') {
      return score != null && maxScore != null
        ? `Screening score ${score}/${maxScore}. Application submitted for manual review/orientation.`
        : 'Emotional support listener application submitted. We will review your supervision details and contact shortlisted applicants.';
    }
    return score != null && maxScore != null
      ? `Screening score ${score}/${maxScore}. Application submitted for manual review/orientation.`
      : 'Peer emotional support listener application submitted. We will review it and contact shortlisted applicants.';
  }
}
