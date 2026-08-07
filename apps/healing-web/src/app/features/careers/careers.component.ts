import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NOTE_CONTENT } from '../../core/constants/note-content.constants';
import {
  LISTENER_GUIDELINES_SECTIONS,
  LISTENER_GUIDELINES_VERSION,
} from '../../core/content/listener-guidelines.content';
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
type ListenerScreeningQuestion = {
  id: string;
  text: string;
  options: Array<{ id: string; text: string }>;
};

@Component({
  selector: 'app-careers',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, FormDropdownComponent],
  templateUrl: './careers.component.html',
  styleUrl: './careers.component.scss',
})
export class CareersComponent implements OnDestroy {
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
  readonly listenerGuidelinesVersion = LISTENER_GUIDELINES_VERSION;
  readonly listenerGuidelinesSections = LISTENER_GUIDELINES_SECTIONS;
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
  readonly listenerScreeningQuestions: ListenerScreeningQuestion[] = [
    {
      id: 'boundaries-role',
      text: 'A user asks you to become their therapist and make decisions for them. What should you do?',
      options: [
        { id: 'take-control', text: 'Take control so they feel safe.' },
        {
          id: 'listen-and-boundary',
          text: 'Listen supportively and explain your non-clinical listener boundary.',
        },
        { id: 'give-diagnosis', text: 'Diagnose their issue so they know what is happening.' },
      ],
    },
    {
      id: 'crisis-self-harm',
      text: 'A user says they may harm themselves tonight. What is the best response?',
      options: [
        { id: 'keep-secret', text: 'Promise secrecy and continue chatting casually.' },
        {
          id: 'escalate-immediately',
          text: 'Stay calm, encourage immediate emergency/crisis support, and escalate per Hope Hub safety process.',
        },
        { id: 'wait-tomorrow', text: 'Ask them to sleep and talk tomorrow.' },
      ],
    },
    {
      id: 'confidentiality-risk',
      text: 'Which confidentiality statement is safest?',
      options: [
        { id: 'absolute-secret', text: 'Everything is always secret, no matter what.' },
        {
          id: 'explain-limits',
          text: 'Privacy matters, but safety risks may need escalation to protect someone.',
        },
        { id: 'share-team', text: 'I can share your story anywhere in our team chat.' },
      ],
    },
    {
      id: 'diagnosis',
      text: 'A user asks, “Do I have depression?” What should you say?',
      options: [
        { id: 'confirm-depression', text: 'Yes, based on this chat you have depression.' },
        {
          id: 'avoid-diagnosis',
          text: 'I cannot diagnose, but I can listen and suggest professional assessment/support.',
        },
        { id: 'ignore', text: 'Ignore the question and change the topic.' },
      ],
    },
    {
      id: 'medication-advice',
      text: 'A user asks whether to stop their medication. What do you do?',
      options: [
        { id: 'say-stop', text: 'Tell them to stop if they feel better.' },
        {
          id: 'refer-professional',
          text: 'Do not advise; ask them to speak with their doctor/qualified professional.',
        },
        { id: 'internet-dose', text: 'Search online and suggest a dose.' },
      ],
    },
    {
      id: 'active-listening',
      text: 'Which response shows active listening?',
      options: [
        { id: 'compare-story', text: 'That happened to me too; here is my whole story.' },
        { id: 'reflect-and-ask', text: 'It sounds exhausting. What part feels hardest right now?' },
        { id: 'fix-fast', text: 'Just be positive and move on.' },
      ],
    },
    {
      id: 'judgement',
      text: 'A user shares something embarrassing. Best listener response?',
      options: [
        { id: 'lecture', text: 'Lecture them about why it was wrong.' },
        {
          id: 'validate-without-judging',
          text: 'Thank them for sharing and respond without shame or judgement.',
        },
        { id: 'joke', text: 'Make a joke to lighten it.' },
      ],
    },
    {
      id: 'dependency',
      text: 'A user says they only want to talk to you and no one else. What is safest?',
      options: [
        { id: 'exclusive', text: 'Agree to be their only support.' },
        {
          id: 'encourage-support-network',
          text: 'Support them while encouraging broader safe support and professional help if needed.',
        },
        { id: 'block', text: 'Block them immediately.' },
      ],
    },
    {
      id: 'privacy',
      text: 'A user asks for your personal phone number/social media. What should you do?',
      options: [
        { id: 'share-number', text: 'Share it if they seem trustworthy.' },
        {
          id: 'no-personal-contact',
          text: 'Keep communication on approved Hope Hub channels only.',
        },
        { id: 'ask-theirs', text: 'Ask for their personal social profile first.' },
      ],
    },
    {
      id: 'minor-safety',
      text: 'A minor discloses a serious safety concern. What matters most?',
      options: [
        { id: 'promise-secret', text: 'Promise not to tell anyone.' },
        {
          id: 'follow-safeguarding',
          text: 'Follow safeguarding/escalation rules and involve appropriate support.',
        },
        { id: 'give-punishment', text: 'Tell them they will get punished.' },
      ],
    },
    {
      id: 'abuse-disclosure',
      text: 'Someone discloses abuse. Best first approach?',
      options: [
        { id: 'investigate', text: 'Interrogate them for proof.' },
        {
          id: 'validate-and-escalate',
          text: 'Validate, avoid blame, and escalate/suggest safe professional or emergency support.',
        },
        { id: 'confront', text: 'Tell them to confront the abuser immediately.' },
      ],
    },
    {
      id: 'overpromising',
      text: 'Which promise should a listener avoid?',
      options: [
        { id: 'clear-scope', text: 'I can listen and support within Hope Hub safety boundaries.' },
        { id: 'cure', text: 'I will fix your anxiety completely.' },
        { id: 'available', text: 'I will be present during this session.' },
      ],
    },
    {
      id: 'triggered-listener',
      text: 'You feel personally triggered during a chat. What should you do?',
      options: [
        { id: 'push-through', text: 'Push through even if you are overwhelmed.' },
        {
          id: 'pause-and-supervise',
          text: 'Pause safely, use supervision/escalation, and protect the user experience.',
        },
        { id: 'snap', text: 'Tell the user they upset you.' },
      ],
    },
    {
      id: 'cultural-sensitivity',
      text: 'A user has beliefs different from yours. Best response?',
      options: [
        { id: 'correct-beliefs', text: 'Correct their beliefs to match yours.' },
        { id: 'ask-respectfully', text: 'Ask respectfully and avoid assumptions.' },
        { id: 'dismiss', text: 'Dismiss what you do not understand.' },
      ],
    },
    {
      id: 'financial-request',
      text: 'A user asks you for money or offers to pay you directly. What should you do?',
      options: [
        { id: 'accept', text: 'Accept if it is a small amount.' },
        {
          id: 'decline-and-report',
          text: 'Decline direct money exchange and report/escalate per policy.',
        },
        { id: 'negotiate', text: 'Negotiate outside Hope Hub.' },
      ],
    },
    {
      id: 'romantic-boundary',
      text: 'A user becomes romantic/flirtatious with you. What is appropriate?',
      options: [
        { id: 'flirt-back', text: 'Flirt back if both are adults.' },
        { id: 'firm-boundary', text: 'Set a respectful boundary and keep the session supportive.' },
        { id: 'meet', text: 'Plan to meet outside the platform.' },
      ],
    },
    {
      id: 'data-notes',
      text: 'What should session notes contain?',
      options: [
        { id: 'everything', text: 'Every private detail and gossip.' },
        {
          id: 'minimal-safe-notes',
          text: 'Only minimal, relevant safety/support notes needed for continuity.',
        },
        { id: 'screenshots', text: 'Personal screenshots saved on your phone.' },
      ],
    },
    {
      id: 'high-risk-escalation',
      text: 'If a user is high-risk but refuses help, what should you do?',
      options: [
        { id: 'drop', text: 'End the chat immediately.' },
        {
          id: 'warm-escalation',
          text: 'Stay supportive, encourage immediate help, and escalate using Hope Hub protocol.',
        },
        { id: 'argue', text: 'Argue until they agree.' },
      ],
    },
    {
      id: 'advice-giving',
      text: 'A user asks, “Should I break up today?” What is safest?',
      options: [
        { id: 'tell-breakup', text: 'Tell them exactly what to do.' },
        {
          id: 'support-choice',
          text: 'Help them reflect on safety, feelings, options, and support — without deciding for them.',
        },
        { id: 'avoid-topic', text: 'Say relationship topics are not allowed.' },
      ],
    },
    {
      id: 'end-session',
      text: 'How should you close a supportive chat?',
      options: [
        { id: 'vanish', text: 'Disappear once time is over.' },
        {
          id: 'summarize-next-step',
          text: 'Summarize what was shared, offer grounding/next step, and remind them of support options.',
        },
        { id: 'promise-daily', text: 'Promise daily personal check-ins.' },
      ],
    },
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
      this.startListenerGuidelinesTimer();
    }
  }

  screeningAnsweredCount(): number {
    const answers = this.listenerScreeningAnswers();
    return this.listenerScreeningQuestions.filter((question) => answers[question.id]).length;
  }

  screeningComplete(): boolean {
    return this.screeningAnsweredCount() === this.listenerScreeningQuestions.length;
  }

  listenerGuidelinesRequired(): boolean {
    return this.isListenerTrack() && this.screeningComplete();
  }

  listenerGuidelinesAcceptReady(): boolean {
    return this.listenerGuidelinesScrolled() && this.listenerGuidelinesTimerComplete();
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

  onGuidelinesScroll(event: Event): void {
    const element = event.target as HTMLElement | null;
    if (!element) return;
    const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (remaining <= 12) {
      this.listenerGuidelinesScrolled.set(true);
    }
  }

  acceptListenerGuidelines(): void {
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

  listenerScreeningPayload(): Array<{ questionId: string; optionId: string }> {
    const answers = this.listenerScreeningAnswers();
    return this.listenerScreeningQuestions.map((question) => ({
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
    if (this.isListenerTrack() && !this.screeningComplete()) {
      this.notificationService.warning('Please complete all 20 listener screening questions.');
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
          listenerGuidelinesAccepted: this.listenerGuidelinesRequired()
            ? this.listenerGuidelinesAccepted()
            : undefined,
          listenerGuidelinesVersion: this.listenerGuidelinesRequired()
            ? this.listenerGuidelinesVersion
            : undefined,
          listenerGuidelinesReadStartedAt: this.listenerGuidelinesRequired()
            ? this.listenerGuidelinesReadStartedAt()
            : undefined,
          listenerGuidelinesReadSeconds: this.listenerGuidelinesRequired()
            ? this.listenerGuidelinesReadSeconds()
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

  private resetListenerGuidelineAcceptance(): void {
    this.clearListenerGuidelinesTimer();
    this.listenerGuidelinesScrolled.set(false);
    this.listenerGuidelinesAccepted.set(false);
    this.listenerGuidelinesRemainingSeconds.set(this.listenerGuidelinesMinimumReadSeconds);
    this.listenerGuidelinesTimerComplete.set(false);
    this.listenerGuidelinesReadStartedAt.set(null);
    this.listenerGuidelinesReadStartedAtMs = null;
  }

  private startListenerGuidelinesTimer(): void {
    if (this.listenerGuidelinesTimerId) return;
    this.listenerGuidelinesReadStartedAtMs = Date.now();
    this.listenerGuidelinesReadStartedAt.set(
      new Date(this.listenerGuidelinesReadStartedAtMs).toISOString(),
    );
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
