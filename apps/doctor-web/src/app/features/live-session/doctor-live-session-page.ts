import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ConsultationChatPanelComponent } from '../../shared/consultation-chat-panel/consultation-chat-panel';
import { ConsultationApiService } from '../../core/services/consultation-api.service';
import { ConsultationNavigationService } from '../../core/services/consultation-navigation.service';
import { OnlineDoctorService } from '../../core/services/online-doctor.service';
import { capabilitiesForDoctorType } from '../../core/constants/doctor-types.constants';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import type {
  ConsultationAssessmentSummary,
  ConsultationSessionOutcome,
  ConsultationSessionNote,
  DoctorConsultation,
} from '../../core/types/consultation.types';

type LiveSessionOutcome = 'COMPLETED' | 'USER_MISSED' | 'PROVIDER_NO_SHOW' | 'RESCHEDULE_NEEDED';

@Component({
  selector: 'app-doctor-live-session-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ConsultationChatPanelComponent],
  templateUrl: './doctor-live-session-page.html',
  styleUrl: './doctor-live-session-page.scss',
})
export class DoctorLiveSessionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly consultationApi = inject(ConsultationApiService);
  private readonly consultationNav = inject(ConsultationNavigationService);
  private readonly online = inject(OnlineDoctorService);

  readonly onlineDoctorPath = ROUTE_PATHS.ONLINE_DOCTOR;
  readonly consultation = signal<DoctorConsultation | null>(null);
  readonly loading = signal(true);
  readonly message = signal('');
  readonly error = signal('');
  readonly sessionNotes = signal<ConsultationSessionNote[]>([]);
  readonly sessionNoteText = signal('');
  readonly sessionNotesLoading = signal(false);
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

  ngOnInit(): void {
    this.consultationId = this.route.snapshot.paramMap.get('consultationId') || '';
    if (!this.consultationId) {
      this.error.set('Session not found.');
      this.loading.set(false);
      return;
    }
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [profile, consultation] = await Promise.all([
        this.online.loadProfile().catch(() => null),
        this.consultationApi.loadConsultation(this.consultationId),
      ]);
      if (profile?.profile) this.online.profile.set(profile.profile);
      this.consultation.set(consultation);
      await Promise.all([this.loadSessionNotes(), this.loadAssessmentSummary()]);
    } catch {
      this.error.set('Could not open this live session.');
    } finally {
      this.loading.set(false);
    }
  }

  patientName(): string {
    return this.consultation()?.patient?.name || 'Patient';
  }

  patientCode(): string {
    return this.consultation()?.patient?.patientCode || '';
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

  showCallControls(): boolean {
    return this.sessionMode() !== 'chat';
  }

  allowAudioCall(): boolean {
    const mode = this.sessionMode();
    return mode === 'voice' || mode === 'video' || mode === 'live';
  }

  allowVideoCall(): boolean {
    const mode = this.sessionMode();
    return mode === 'video' || mode === 'live';
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

  isPsychologist(): boolean {
    return this.profile()?.doctorType === 'PSYCHOLOGIST';
  }

  capabilities() {
    return capabilitiesForDoctorType(this.profile()?.doctorType ?? null);
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
