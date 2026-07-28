import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { ConsultationChatPanelComponent } from '../../shared/consultation-chat-panel/consultation-chat-panel';
import { ConsultationApiService } from '../../core/services/consultation-api.service';
import { ConsultationNavigationService } from '../../core/services/consultation-navigation.service';
import { OnlineDoctorService } from '../../core/services/online-doctor.service';
import { capabilitiesForDoctorType } from '../../core/constants/doctor-types.constants';
import type {
  ConsultationAssessmentSummary,
  DoctorConsultation,
  ConsultationSessionNote,
} from '../../core/types/consultation.types';

type InstantConsult = {
  id: string;
  status: string;
  patient: { id: string; name: string; patientCode?: string | null };
  disease: { id: string; name: string };
};

@Component({
  selector: 'app-online-doctor-page',
  imports: [CommonModule, FormField, ConsultationChatPanelComponent],
  templateUrl: './online-doctor-page.html',
  styleUrl: './online-doctor-page.scss',
})
export class OnlineDoctorPage implements OnInit, OnDestroy {
  private readonly online = inject(OnlineDoctorService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly consultationNav = inject(ConsultationNavigationService);
  private readonly consultationApi = inject(ConsultationApiService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly diseases = signal<Array<{ id: string; name: string }>>([]);
  readonly profile = this.online.profile;
  readonly instantConsults = signal<InstantConsult[]>([]);
  readonly directConsultation = signal<DoctorConsultation | null>(null);
  readonly selectedConsultId = signal('');
  readonly inboxLoading = signal(false);
  readonly sessionNotes = signal<ConsultationSessionNote[]>([]);
  readonly sessionNoteText = signal('');
  readonly sessionNotesLoading = signal(false);
  readonly sessionNoteSaving = signal(false);
  readonly assessmentSummary = signal<ConsultationAssessmentSummary | null>(null);
  readonly assessmentSummaryLoading = signal(false);

  readonly settingsModel = signal({
    category: 'GENERALIST' as 'GENERALIST' | 'SPECIALIST',
    specialtyDiseaseIds: [] as string[],
    acceptsChat: true,
    acceptsVoiceCall: true,
  });
  readonly settingsForm = form(this.settingsModel);

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    void this.load();
    this.route.queryParamMap.subscribe((params) => {
      const id = params.get('consultationId');
      if (id) {
        this.selectedConsultId.set(id);
        void this.loadDirectConsultation(id);
        if (this.isLive()) void this.loadInbox();
      }
    });
  }

  async load() {
    this.loading.set(true);
    try {
      const res = await this.online.loadProfile();
      this.online.profile.set(res.profile);
      this.diseases.set(res.diseases ?? []);
      this.settingsModel.set({
        category: res.profile.category,
        specialtyDiseaseIds: [...res.profile.specialtyDiseaseIds],
        acceptsChat: res.profile.acceptsChat,
        acceptsVoiceCall: res.profile.acceptsVoiceCall,
      });
      if (this.isLive()) {
        void this.loadInbox();
        this.startInboxRefresh();
      }
    } catch {
      this.error.set('Could not load online doctor settings.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadInbox() {
    if (!this.isLive()) return;
    this.inboxLoading.set(true);
    try {
      const res = await this.online.loadInstantConsultations();
      this.instantConsults.set(res.consultations);
      const selected = this.selectedConsultId();
      if (!selected && res.consultations.length) {
        const firstId = res.consultations[0].id;
        this.selectedConsultId.set(firstId);
        void this.loadConsultationContext(firstId);
      } else if (selected) {
        void this.loadConsultationContext(selected);
      }
    } catch {
      this.instantConsults.set([]);
    } finally {
      this.inboxLoading.set(false);
    }
  }

  selectConsult(id: string) {
    this.selectedConsultId.set(id);
    this.sessionNotes.set([]);
    this.sessionNoteText.set('');
    this.assessmentSummary.set(null);
    void this.loadConsultationContext(id);
    void this.router.navigate([], {
      queryParams: { consultationId: id },
      queryParamsHandling: 'merge',
    });
  }

  selectedConsult() {
    const id = this.selectedConsultId();
    return this.instantConsults().find((c) => c.id === id) ?? this.directConsultation();
  }

  isLive() {
    return ['ONLINE', 'BUSY', 'ON_CALL'].includes(this.profile()?.liveStatus ?? 'OFFLINE');
  }

  capabilities() {
    return capabilitiesForDoctorType(this.profile()?.doctorType ?? null);
  }

  isPsychologist() {
    return this.profile()?.doctorType === 'PSYCHOLOGIST';
  }

  async saveSettings() {
    this.saving.set(true);
    this.message.set('');
    try {
      const m = this.settingsModel();
      const res = await this.online.saveProfile({
        enabled: true,
        category: m.category,
        specialtyDiseaseIds: m.specialtyDiseaseIds,
        acceptsChat: m.acceptsChat,
        acceptsVoiceCall: m.acceptsVoiceCall,
      });
      this.online.profile.set(res.profile);
      this.message.set('Settings saved.');
    } catch {
      this.error.set('Could not save settings.');
    } finally {
      this.saving.set(false);
    }
  }

  toggleDisease(id: string) {
    this.settingsModel.update((m) => {
      const has = m.specialtyDiseaseIds.includes(id);
      return {
        ...m,
        specialtyDiseaseIds: has
          ? m.specialtyDiseaseIds.filter((x) => x !== id)
          : [...m.specialtyDiseaseIds, id],
      };
    });
  }

  async goOnline() {
    this.saving.set(true);
    try {
      await this.saveSettings();
      const res = await this.online.setLiveStatus({
        liveStatus: 'ONLINE',
        acceptsChat: this.settingsModel().acceptsChat,
        acceptsVoiceCall: this.settingsModel().acceptsVoiceCall,
      });
      this.online.profile.set(res.profile);
      this.online.connectRealtime();
      this.message.set('You are now visible to patients.');
      void this.loadInbox();
      this.startInboxRefresh();
    } catch {
      this.error.set('Could not go online.');
    } finally {
      this.saving.set(false);
    }
  }

  async loadDirectConsultation(consultationId = this.selectedConsultId()) {
    if (!consultationId) return;
    try {
      this.directConsultation.set(await this.consultationApi.loadConsultation(consultationId));
      this.loadConsultationContext(consultationId);
    } catch {
      this.directConsultation.set(null);
      this.error.set('Could not load this session.');
    }
  }

  async goOffline() {
    this.saving.set(true);
    try {
      const res = await this.online.setLiveStatus({ liveStatus: 'OFFLINE' });
      this.online.profile.set(res.profile);
      this.online.disconnectRealtime();
      this.stopInboxRefresh();
      this.instantConsults.set([]);
      this.selectedConsultId.set('');
      this.message.set('You are offline.');
    } catch {
      this.error.set('Could not go offline.');
    } finally {
      this.saving.set(false);
    }
  }

  private startInboxRefresh() {
    this.stopInboxRefresh();
    this.refreshTimer = setInterval(() => void this.loadInbox(), 20_000);
  }

  private stopInboxRefresh() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    this.refreshTimer = null;
  }

  openCaseAnalysis(consultationId: string) {
    void this.consultationNav.openCaseAnalysis(consultationId);
  }

  openPrescription(consultationId: string) {
    void this.consultationNav.openPrescription(consultationId);
  }

  async loadSessionNotes(consultationId = this.selectedConsultId()) {
    if (!consultationId) return;
    this.sessionNotesLoading.set(true);
    try {
      this.sessionNotes.set(await this.consultationApi.loadSessionNotes(consultationId));
    } catch {
      this.error.set('Could not load session notes.');
    } finally {
      this.sessionNotesLoading.set(false);
    }
  }

  async loadAssessmentSummary(consultationId = this.selectedConsultId()) {
    if (!consultationId) return;
    this.assessmentSummaryLoading.set(true);
    try {
      this.assessmentSummary.set(await this.consultationApi.loadAssessmentSummary(consultationId));
    } catch {
      this.assessmentSummary.set(null);
      this.error.set('Could not load assessment history.');
    } finally {
      this.assessmentSummaryLoading.set(false);
    }
  }

  loadConsultationContext(consultationId = this.selectedConsultId()) {
    void this.loadSessionNotes(consultationId);
    void this.loadAssessmentSummary(consultationId);
  }

  async saveSessionNote() {
    const consultationId = this.selectedConsultId();
    const note = this.sessionNoteText().trim();
    if (!consultationId || note.length < 3) return;

    this.sessionNoteSaving.set(true);
    this.error.set('');
    try {
      const saved = await this.consultationApi.addSessionNote(consultationId, note);
      this.sessionNotes.update((notes) => [saved, ...notes]);
      this.sessionNoteText.set('');
      this.message.set('Session note saved.');
    } catch {
      this.error.set('Could not save session note.');
    } finally {
      this.sessionNoteSaving.set(false);
    }
  }

  ngOnDestroy() {
    this.stopInboxRefresh();
    if (!this.isLive()) this.online.disconnectRealtime();
  }
}
