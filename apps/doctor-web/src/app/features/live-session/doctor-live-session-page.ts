import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConsultationChatPanelComponent } from '../../shared/consultation-chat-panel/consultation-chat-panel';
import { ConsultationApiService } from '../../core/services/consultation-api.service';
import { ConsultationNavigationService } from '../../core/services/consultation-navigation.service';
import {
  DoctorRealtimeService,
  type ConsultationUpdatedPayload,
} from '../../core/services/doctor-realtime.service';
import { OnlineDoctorService } from '../../core/services/online-doctor.service';
import {
  capabilitiesForProvider,
  isClinicalMentalHealthCareTeamType,
  isCoachGuideCareTeamType,
  isListenerCareTeamType,
} from '../../core/constants/doctor-types.constants';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import type {
  ConsultationAssessmentSummary,
  ConsultationCallSession,
  ConsultationSessionOutcome,
  ConsultationSessionNote,
  DoctorConsultation,
} from '../../core/types/consultation.types';
import { providerConsumerSessionModeListLabel } from '@hopehub/contracts';

type LiveSessionOutcome = 'COMPLETED' | 'USER_MISSED' | 'PROVIDER_NO_SHOW' | 'RESCHEDULE_NEEDED';

@Component({
  selector: 'app-doctor-live-session-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ConsultationChatPanelComponent],
  templateUrl: './doctor-live-session-page.html',
  styleUrl: './doctor-live-session-page.scss',
})
export class DoctorLiveSessionPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly consultationApi = inject(ConsultationApiService);
  private readonly consultationNav = inject(ConsultationNavigationService);
  private readonly realtime = inject(DoctorRealtimeService);
  private readonly online = inject(OnlineDoctorService);

  readonly onlineDoctorPath = ROUTE_PATHS.ONLINE_DOCTOR;
  readonly consultation = signal<DoctorConsultation | null>(null);
  readonly loading = signal(true);
  readonly message = signal('');
  readonly error = signal('');
  readonly sessionNotes = signal<ConsultationSessionNote[]>([]);
  readonly callSessions = signal<ConsultationCallSession[]>([]);
  readonly sessionNoteText = signal('');
  readonly sessionNotesLoading = signal(false);
  readonly callSessionsLoading = signal(false);
  readonly sessionNoteSaving = signal(false);
  readonly assessmentSummary = signal<ConsultationAssessmentSummary | null>(null);
  readonly assessmentSummaryLoading = signal(false);
  readonly profile = this.online.profile;
  readonly outcome = signal<LiveSessionOutcome>('COMPLETED');
  readonly outcomeUserSummary = signal('');
  readonly outcomeRecommendedNextStep = signal('');
  readonly outcomePrivateNote = signal('');
  readonly outcomeRestorePackageSession = signal(false);
  readonly outcomeHoldProviderPayout = signal(false);
  readonly closingSession = signal(false);
  readonly outcomeLabels: Record<LiveSessionOutcome | string, string> = {
    COMPLETED: 'Completed',
    USER_MISSED: 'User missed',
    PROVIDER_NO_SHOW: 'Provider no-show',
    RESCHEDULE_NEEDED: 'Reschedule needed',
  };

  private consultationId = '';
  private readonly handleConsultationUpdated = (payload: ConsultationUpdatedPayload) => {
    if (payload.consultationId !== this.consultationId) return;
    void this.load({ silent: true });
  };

  ngOnInit(): void {
    this.consultationId = this.route.snapshot.paramMap.get('consultationId') || '';
    if (!this.consultationId) {
      this.error.set('Session not found.');
      this.loading.set(false);
      return;
    }
    this.realtime.connect(undefined, undefined, this.handleConsultationUpdated);
    this.realtime.subscribeConsultation(this.consultationId);
    void this.load();
  }

  ngOnDestroy(): void {
    this.realtime.clearConsultationUpdatedHandler(this.handleConsultationUpdated);
    this.realtime.unsubscribeConsultation(this.consultationId);
  }

  async load(options: { silent?: boolean } = {}): Promise<void> {
    if (!options.silent) this.loading.set(true);
    this.error.set('');
    try {
      const [profile, loadedConsultation] = await Promise.all([
        this.online.loadProfile().catch(() => null),
        this.consultationApi.loadConsultation(this.consultationId),
      ]);
      let consultation = loadedConsultation;
      if (
        consultation.consultationMode === 'INSTANT_ONLINE' &&
        consultation.status === 'ASSIGNED'
      ) {
        await this.online.acceptInstantConsultation(consultation.id);
        consultation = { ...consultation, status: 'IN_PROGRESS' };
      }
      if (profile?.profile) this.online.profile.set(profile.profile);
      this.consultation.set(consultation);
      await Promise.all([
        this.loadSessionNotes(),
        this.loadAssessmentSummary(),
        this.loadCallSessions(),
      ]);
    } catch {
      this.error.set('Could not open this live session.');
    } finally {
      if (!options.silent) this.loading.set(false);
    }
  }

  patientName(): string {
    return this.consultation()?.patient?.name || this.userLabel();
  }

  patientCode(): string {
    return this.consultation()?.patient?.patientCode || '';
  }

  userLabel(): string {
    return this.isPsychologist() ? 'User' : 'Patient';
  }

  userCodeLabel(): string {
    return this.isPsychologist() ? 'User code' : 'Patient code';
  }

  sessionNoun(): string {
    return this.isPsychologist() ? 'session' : 'consultation';
  }

  serviceName(): string {
    const consultation = this.consultation();
    return (
      String(consultation?.pricingSnapshot?.['serviceName'] || '') ||
      String(consultation?.intakeAnswers?.['serviceName'] || '') ||
      consultation?.disease?.name ||
      'Live session'
    );
  }

  sessionModeLabel(): string {
    const mode = this.sessionMode();
    if (mode === 'video') return 'Video';
    if (mode === 'voice') return 'Voice';
    if (mode === 'chat') return 'Chat';
    return 'Live';
  }

  sessionMode(): 'chat' | 'voice' | 'video' | 'live' {
    const raw = String(
      this.consultation()?.intakeAnswers?.['quickTalkMode'] ||
        this.consultation()?.intakeAnswers?.['sessionMode'] ||
        '',
    ).toLowerCase();
    if (raw.includes('video')) return 'video';
    if (raw.includes('voice') || raw.includes('audio')) return 'voice';
    if (raw.includes('chat')) return 'chat';
    return 'live';
  }

  allowedSessionModes(): Array<'chat' | 'voice' | 'video'> {
    const configured = this.consultation()?.intakeAnswers?.['allowedSessionModes'];
    const values = Array.isArray(configured) ? configured : [];
    const valid = values.filter(
      (mode): mode is 'chat' | 'voice' | 'video' =>
        mode === 'chat' || mode === 'voice' || mode === 'video',
    );
    return valid.length ? valid : [this.sessionMode()].filter((mode) => mode !== 'live');
  }

  canSwitchModes(): boolean {
    return this.allowedSessionModes().length > 1;
  }

  switchableModesLabel(): string {
    return providerConsumerSessionModeListLabel(this.allowedSessionModes());
  }

  showCallControls(): boolean {
    return this.allowAudioCall() || this.allowVideoCall();
  }

  allowAudioCall(): boolean {
    return this.allowedSessionModes().includes('voice') || this.sessionMode() === 'live';
  }

  allowVideoCall(): boolean {
    return this.allowedSessionModes().includes('video') || this.sessionMode() === 'live';
  }

  concernLabel(): string {
    return String(this.consultation()?.intakeAnswers?.['concernCategory'] || '').trim();
  }

  isSessionClosed(): boolean {
    const status = (this.consultation()?.status || '').toUpperCase();
    return ['COMPLETED', 'CANCELLED'].includes(status);
  }

  sessionOutcome(): ConsultationSessionOutcome | null {
    return this.consultation()?.pricingSnapshot?.sessionOutcome ?? null;
  }

  sessionOutcomeLabel(outcome?: string | null): string {
    return outcome ? (this.outcomeLabels[outcome] ?? outcome.replace(/_/g, ' ')) : 'Not recorded';
  }

  callStatusLabel(status: string): string {
    return status ? status.replace(/_/g, ' ').toLowerCase() : 'unknown';
  }

  callReasonLabel(reason?: string | null): string {
    if (!reason) return '';
    const labels: Record<string, string> = {
      active_call_exists: 'Another call was already active',
      consultation_call_already_active: 'Session already had an active call',
      no_answer: 'No answer',
      media_timeout: 'Media did not connect',
      connection_failed: 'Connection failed',
      reconnect_timeout: 'Disconnected during call',
      rejected: 'Declined',
      not_connected: 'Ended before connecting',
      ended_by_user: 'Ended by participant',
      switch_to_video: 'Switched to video',
      switch_to_voice: 'Switched to voice',
      stale_setup_cleanup: 'Previous call attempt expired',
      stale_connected_cleanup: 'Old active call auto-closed',
      consultation_not_found: 'Session not found',
      consultation_not_active: 'Session not active',
      provider_not_assigned: 'Expert not assigned',
      call_participant_mismatch: 'Participant mismatch',
      call_mode_not_allowed: 'Call type not allowed',
      call_not_allowed: 'Call not allowed',
    };
    return labels[reason] || reason.replace(/_/g, ' ');
  }

  callNetworkLabel(call: ConsultationCallSession): string {
    const metadata = call.metadata;
    if (!metadata) return '';
    if (metadata.usedTurnRelay === true) return 'TURN relay';
    if (
      ['host', 'srflx', 'prflx'].includes(String(metadata.localCandidateType || '')) ||
      ['host', 'srflx', 'prflx'].includes(String(metadata.remoteCandidateType || ''))
    ) {
      return 'Direct/P2P';
    }
    return '';
  }

  callDurationLabel(call: ConsultationCallSession): string {
    const seconds = Math.max(0, Number(call.durationSeconds || 0));
    if (!seconds) return call.endedAt ? '0s' : 'In progress';
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
  }

  isPsychologist(): boolean {
    return this.profile()?.doctorType === 'PSYCHOLOGIST';
  }

  careTeamTypes(): string[] {
    const mental = this.profile()?.mentalHealthProfile;
    return mental?.careTeamTypes?.length
      ? mental.careTeamTypes
      : mental?.careTeamType
        ? [mental.careTeamType]
        : [];
  }

  isClinicalMentalHealthProvider(): boolean {
    return (
      this.isPsychologist() &&
      (this.careTeamTypes().length === 0 ||
        this.careTeamTypes().some((type) => isClinicalMentalHealthCareTeamType(type)))
    );
  }

  isListenerProvider(): boolean {
    return (
      this.isPsychologist() && this.careTeamTypes().some((type) => isListenerCareTeamType(type))
    );
  }

  isCoachGuideProvider(): boolean {
    return (
      this.isPsychologist() && this.careTeamTypes().some((type) => isCoachGuideCareTeamType(type))
    );
  }

  isMultiRoleProvider(): boolean {
    return (
      [
        this.isClinicalMentalHealthProvider(),
        this.isListenerProvider(),
        this.isCoachGuideProvider(),
      ].filter(Boolean).length > 1
    );
  }

  sessionNotesTitle(): string {
    if (this.isMultiRoleProvider()) return 'Hope Hub session notes';
    if (this.isClinicalMentalHealthProvider()) return 'Clinical support notes';
    if (this.isListenerProvider()) return 'Listener support notes';
    if (this.isCoachGuideProvider()) return 'Coaching session notes';
    return this.isPsychologist() ? 'Hope Hub session notes' : 'Session notes';
  }

  sessionNotesHint(): string {
    if (this.isMultiRoleProvider()) {
      return 'Record the support requested, what you provided, response, safety context, and next step.';
    }
    if (this.isClinicalMentalHealthProvider()) {
      return 'Record discussion, support given, response, risk level, and next step.';
    }
    if (this.isListenerProvider()) {
      return 'Record what the user wanted support with, listening response, boundaries, and any escalation concern.';
    }
    if (this.isCoachGuideProvider()) {
      return 'Record goals discussed, guidance offered, practice/homework, and next step.';
    }
    return this.isPsychologist()
      ? 'Record support given, response, and next step.'
      : `Record what happened during this ${this.sessionNoun()} and the next step.`;
  }

  sessionNotesPlaceholder(): string {
    if (this.isMultiRoleProvider()) {
      return 'Write a concise private note about the support provided, safety context, and agreed next step.';
    }
    if (this.isClinicalMentalHealthProvider()) {
      return 'Example: User shared anxiety triggers. Provided grounding exercise. No immediate safety risk shared. Next: follow up in 7 days.';
    }
    if (this.isListenerProvider()) {
      return 'Example: User vented about loneliness and exam pressure. Reflected feelings, encouraged support network, no emergency concern shared.';
    }
    if (this.isCoachGuideProvider()) {
      return 'Example: User discussed confidence at work. Practiced reframing and set one small action before next session.';
    }
    return `Write a private ${this.sessionNoun()} note and next step...`;
  }

  capabilities() {
    return capabilitiesForProvider(this.profile());
  }

  openCaseAnalysis(): void {
    if (this.consultationId) void this.consultationNav.openCaseAnalysis(this.consultationId);
  }

  openPrescription(): void {
    if (this.consultationId) void this.consultationNav.openPrescription(this.consultationId);
  }

  async loadSessionNotes(): Promise<void> {
    if (!this.consultationId) return;
    this.sessionNotesLoading.set(true);
    try {
      this.sessionNotes.set(await this.consultationApi.loadSessionNotes(this.consultationId));
    } catch {
      this.error.set('Could not load session notes.');
    } finally {
      this.sessionNotesLoading.set(false);
    }
  }

  async loadCallSessions(): Promise<void> {
    if (!this.consultationId) return;
    this.callSessionsLoading.set(true);
    try {
      this.callSessions.set(await this.consultationApi.loadCallSessions(this.consultationId));
    } catch {
      this.callSessions.set([]);
    } finally {
      this.callSessionsLoading.set(false);
    }
  }

  async loadAssessmentSummary(): Promise<void> {
    if (!this.consultationId) return;
    this.assessmentSummaryLoading.set(true);
    try {
      this.assessmentSummary.set(
        await this.consultationApi.loadAssessmentSummary(this.consultationId),
      );
    } catch {
      this.assessmentSummary.set(null);
      this.error.set('Could not load assessment history.');
    } finally {
      this.assessmentSummaryLoading.set(false);
    }
  }

  async saveSessionNote(): Promise<void> {
    const note = this.sessionNoteText().trim();
    if (!this.consultationId || note.length < 3) return;

    this.sessionNoteSaving.set(true);
    this.error.set('');
    try {
      const saved = await this.consultationApi.addSessionNote(this.consultationId, note);
      this.sessionNotes.update((notes) => [saved, ...notes]);
      this.sessionNoteText.set('');
      this.message.set('Session note saved.');
    } catch {
      this.error.set('Could not save session note.');
    } finally {
      this.sessionNoteSaving.set(false);
    }
  }

  async flagSafetyRisk(): Promise<void> {
    if (!this.consultationId) return;

    this.sessionNoteSaving.set(true);
    this.error.set('');
    try {
      const saved = await this.consultationApi.addSessionNote(
        this.consultationId,
        '[SAFETY] Safety risk flagged by expert. Admin/care team should review and follow escalation protocol.',
      );
      this.sessionNotes.update((notes) => [saved, ...notes]);
      this.message.set('Safety risk flagged for team review.');
    } catch {
      this.error.set('Could not flag safety risk.');
    } finally {
      this.sessionNoteSaving.set(false);
    }
  }

  async closeSession(): Promise<void> {
    if (!this.consultationId || this.closingSession() || this.isSessionClosed()) return;

    this.closingSession.set(true);
    this.error.set('');
    try {
      const outcome = this.outcome();
      const response = await this.consultationApi.closeConsultation(this.consultationId, {
        outcome,
        privateNote: this.outcomePrivateNote().trim() || undefined,
        userSummary: this.outcomeUserSummary().trim() || undefined,
        recommendedNextStep: this.outcomeRecommendedNextStep().trim() || undefined,
        restorePackageSession:
          this.outcomeRestorePackageSession() ||
          outcome === 'PROVIDER_NO_SHOW' ||
          outcome === 'RESCHEDULE_NEEDED',
        holdProviderPayout:
          this.outcomeHoldProviderPayout() ||
          outcome === 'PROVIDER_NO_SHOW' ||
          outcome === 'RESCHEDULE_NEEDED',
      });
      if (response.consultation) this.consultation.set(response.consultation);
      this.message.set('Session outcome saved. Your live availability has been released.');
    } catch {
      this.error.set('Could not close this session.');
    } finally {
      this.closingSession.set(false);
    }
  }
}
