import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { OnlineDoctorService } from '../../core/services/online-doctor.service';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { DoctorSessionService, type ProviderReadiness } from '../../core/services/doctor-session';
import {
  isClinicalMentalHealthCareTeamType,
  isCoachGuideCareTeamType,
  isListenerCareTeamType,
} from '../../core/constants/doctor-types.constants';
import {
  PROVIDER_SESSION_MODES,
  providerConsumerSessionModeListLabel,
  type ProviderSessionMode,
} from '@hopehub/contracts';

type InstantConsult = {
  id: string;
  status: string;
  patient: { id: string; name: string; patientCode?: string | null };
  disease: { id: string; name: string };
};

@Component({
  selector: 'app-online-doctor-page',
  imports: [CommonModule, FormField, RouterLink],
  templateUrl: './online-doctor-page.html',
  styleUrl: './online-doctor-page.scss',
})
export class OnlineDoctorPage implements OnInit, OnDestroy {
  private readonly online = inject(OnlineDoctorService);
  private readonly session = inject(DoctorSessionService);
  private readonly router = inject(Router);

  readonly sessionsPath = ROUTE_PATHS.SESSIONS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly diseases = signal<Array<{ id: string; name: string }>>([]);
  readonly profile = this.online.profile;
  readonly heartbeatHealthy = this.online.heartbeatHealthy;
  readonly realtimeConnected = this.online.realtimeConnected;
  readonly readiness = signal<ProviderReadiness | null>(null);
  readonly instantConsults = signal<InstantConsult[]>([]);
  readonly inboxLoading = signal(false);
  readonly inboxError = signal('');
  readonly respondingConsultationId = signal<string | null>(null);

  readonly settingsModel = signal({
    category: 'GENERALIST' as 'GENERALIST' | 'SPECIALIST',
    specialtyDiseaseIds: [] as string[],
    acceptsChat: true,
    acceptsVoiceCall: true,
    acceptsVideoCall: true,
  });
  readonly settingsForm = form(this.settingsModel);

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    void this.load();
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
        acceptsChat: this.modeAllowed('CHAT') && res.profile.acceptsChat,
        acceptsVoiceCall: this.modeAllowed('VOICE') && res.profile.acceptsVoiceCall,
        acceptsVideoCall: this.modeAllowed('VIDEO') && res.profile.acceptsVideoCall,
      });
      if (this.isLive()) {
        this.online.connectRealtime();
        void this.loadInbox();
        this.startInboxRefresh();
      }
      await this.loadReadiness();
    } catch {
      this.error.set('Could not load online provider settings.');
    } finally {
      this.loading.set(false);
    }
  }

  async loadReadiness() {
    try {
      this.readiness.set(await this.session.readiness());
    } catch {
      this.readiness.set(null);
    }
  }

  async loadInbox() {
    if (!this.isLive()) return;
    this.inboxLoading.set(true);
    this.inboxError.set('');
    try {
      const res = await this.online.loadInstantConsultations();
      this.instantConsults.set(res.consultations);
    } catch {
      this.inboxError.set('Could not check for new requests. Your availability is unchanged.');
    } finally {
      this.inboxLoading.set(false);
    }
  }

  isWaitingConsultation(consultation: InstantConsult): boolean {
    return consultation.status === 'ASSIGNED';
  }

  consultationStatusLabel(consultation: InstantConsult): string {
    if (consultation.status === 'ASSIGNED') return 'Waiting for your response';
    if (consultation.status === 'IN_PROGRESS') return 'Session in progress';
    if (consultation.status === 'PRESCRIPTION_UPLOADED') return 'Ready to complete';
    return consultation.status.toLowerCase().replaceAll('_', ' ');
  }

  async acceptConsultation(consultation: InstantConsult): Promise<void> {
    if (this.respondingConsultationId()) return;
    this.respondingConsultationId.set(consultation.id);
    this.inboxError.set('');
    try {
      await this.online.acceptInstantConsultation(consultation.id);
      await this.router.navigate(['/', this.sessionsPath, consultation.id]);
    } catch (error: any) {
      this.inboxError.set(
        error?.error?.message || 'This request is no longer available. Refresh the inbox.',
      );
      await this.loadInbox();
    } finally {
      this.respondingConsultationId.set(null);
    }
  }

  async declineConsultation(consultation: InstantConsult): Promise<void> {
    if (this.respondingConsultationId()) return;
    this.respondingConsultationId.set(consultation.id);
    this.inboxError.set('');
    try {
      await this.online.declineInstantConsultation(
        consultation.id,
        'Provider unavailable for this incoming live request',
      );
      this.instantConsults.update((items) => items.filter((item) => item.id !== consultation.id));
      this.message.set('Request returned for matching with another available provider.');
    } catch (error: any) {
      this.inboxError.set(error?.error?.message || 'Could not return this request. Try again.');
      await this.loadInbox();
    } finally {
      this.respondingConsultationId.set(null);
    }
  }

  isLive() {
    return ['ONLINE', 'BUSY', 'ON_CALL'].includes(this.profile()?.liveStatus ?? 'OFFLINE');
  }

  canAcceptAnyMode() {
    const settings = this.settingsModel();
    return settings.acceptsChat || settings.acceptsVoiceCall || settings.acceptsVideoCall;
  }

  modeAllowed(mode: ProviderSessionMode): boolean {
    return (this.profile()?.allowedModes || PROVIDER_SESSION_MODES).includes(mode);
  }

  statusLabel() {
    const status = this.profile()?.liveStatus ?? 'OFFLINE';
    if (status === 'ONLINE') return 'Online and accepting new live requests';
    if (status === 'BUSY') return 'Busy with an assigned live session';
    if (status === 'ON_CALL') return 'On a live call';
    return 'Offline — not accepting new requests';
  }

  availabilityTitle(): string {
    const status = this.profile()?.liveStatus ?? 'OFFLINE';
    if (status === 'BUSY') return 'You are busy';
    if (status === 'ON_CALL') return 'You are on a call';
    return this.isLive() ? 'You are online' : 'You are offline';
  }

  availabilityDescription(): string {
    const status = this.profile()?.liveStatus ?? 'OFFLINE';
    if (status === 'BUSY') {
      return 'Respond to the assigned request before changing your availability.';
    }
    if (status === 'ON_CALL') {
      return 'Your availability will return automatically when this session ends.';
    }
    if (this.isLive()) return `Users can reach you by ${this.acceptedModesLabel()}.`;
    return 'Go online when you are ready to receive a new request.';
  }

  availabilityLocked(): boolean {
    return ['BUSY', 'ON_CALL'].includes(this.profile()?.liveStatus ?? 'OFFLINE');
  }

  availabilityActionLabel(): string {
    if (this.saving()) return 'Updating…';
    const status = this.profile()?.liveStatus ?? 'OFFLINE';
    if (status === 'BUSY') return 'Request assigned';
    if (status === 'ON_CALL') return 'Session active';
    return status === 'ONLINE' ? 'Go offline' : 'Go online';
  }

  async toggleLiveStatus(): Promise<void> {
    if (this.availabilityLocked()) return;
    if (this.isLive()) await this.goOffline();
    else await this.goOnline();
  }

  acceptedModesLabel() {
    const modes = [
      this.settingsModel().acceptsChat ? 'chat' : '',
      this.settingsModel().acceptsVoiceCall ? 'voice' : '',
      this.settingsModel().acceptsVideoCall ? 'video' : '',
    ].filter((mode): mode is 'chat' | 'voice' | 'video' => Boolean(mode));
    return modes.length ? providerConsumerSessionModeListLabel(modes) : 'No live mode selected';
  }

  setModePreference(
    field: 'acceptsChat' | 'acceptsVoiceCall' | 'acceptsVideoCall',
    enabled: boolean,
  ): void {
    this.settingsModel.update((settings) => ({ ...settings, [field]: enabled }));
  }

  connectionLabel() {
    if (!this.heartbeatHealthy()) return 'Checking your connection…';
    if (!this.realtimeConnected()) return 'Online · reconnecting…';
    return 'Ready for new requests';
  }

  isPsychologist() {
    return this.profile()?.doctorType === 'PSYCHOLOGIST';
  }

  isHomeopathyProvider() {
    return !this.isPsychologist();
  }

  careTeamTypes() {
    const mental = this.profile()?.mentalHealthProfile;
    return mental?.careTeamTypes?.length
      ? mental.careTeamTypes
      : mental?.careTeamType
        ? [mental.careTeamType]
        : [];
  }

  isClinicalMentalHealthProvider() {
    return (
      this.isPsychologist() &&
      (this.careTeamTypes().length === 0 ||
        this.careTeamTypes().some((type) => isClinicalMentalHealthCareTeamType(type)))
    );
  }

  isListenerProvider() {
    return (
      this.isPsychologist() && this.careTeamTypes().some((type) => isListenerCareTeamType(type))
    );
  }

  isCoachGuideProvider() {
    return (
      this.isPsychologist() && this.careTeamTypes().some((type) => isCoachGuideCareTeamType(type))
    );
  }

  isMultiRoleProvider() {
    return (
      [
        this.isClinicalMentalHealthProvider(),
        this.isListenerProvider(),
        this.isCoachGuideProvider(),
      ].filter(Boolean).length > 1
    );
  }

  workspaceTitle() {
    if (this.isMultiRoleProvider()) return 'Hope Hub multi-role workspace';
    if (this.isClinicalMentalHealthProvider()) return 'Clinical Hope Hub workspace';
    if (this.isListenerProvider()) return 'Listener live workspace';
    if (this.isCoachGuideProvider()) return 'Coaching live workspace';
    if (this.isPsychologist()) return 'Hope Hub live workspace';
    return 'Homeopathy provider — go live';
  }

  workspaceLead() {
    if (this.isMultiRoleProvider()) {
      return 'Accept sessions that match your selected support roles and the live modes you enable.';
    }
    if (this.isClinicalMentalHealthProvider()) {
      return 'Review assigned mental-wellness sessions, support users by chat or call, record notes, and follow up safely.';
    }
    if (this.isListenerProvider()) {
      return 'Offer safe emotional support listening by chat or call. Keep boundaries clear and escalate risk concerns.';
    }
    if (this.isCoachGuideProvider()) {
      return 'Accept coaching, guidance, meditation, study, or life-support sessions by chat or call.';
    }
    return 'Show yourself online for instant user consults (chat + voice & video). Separate from your clinic worklist.';
  }

  inboxTitle() {
    if (this.isHomeopathyProvider()) return 'Live consult inbox';
    if (this.isMultiRoleProvider()) return 'Support request inbox';
    if (this.isListenerProvider()) return 'Listener request inbox';
    if (this.isCoachGuideProvider()) return 'Coaching session inbox';
    return 'Live session inbox';
  }

  async saveSettings() {
    this.saving.set(true);
    this.message.set('');
    this.error.set('');
    try {
      await this.persistConnectionPreferences();
      this.message.set('Connection preferences saved.');
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not save settings.');
    } finally {
      this.saving.set(false);
    }
  }

  private async persistConnectionPreferences(): Promise<void> {
    const settings = this.settingsModel();
    const response = await this.online.saveProfile({
      enabled: true,
      category: settings.category,
      specialtyDiseaseIds: settings.specialtyDiseaseIds,
      acceptsChat: settings.acceptsChat,
      acceptsVoiceCall: settings.acceptsVoiceCall,
      acceptsVideoCall: settings.acceptsVideoCall,
    });
    this.online.profile.set(response.profile);
    await this.loadReadiness();
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
    if (!this.canAcceptAnyMode()) {
      this.error.set('Choose at least one live mode before going online.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.requestAssignmentNotifications();
    try {
      await this.persistConnectionPreferences();
      const res = await this.online.setLiveStatus({
        liveStatus: 'ONLINE',
        acceptsChat: this.settingsModel().acceptsChat,
        acceptsVoiceCall: this.settingsModel().acceptsVoiceCall,
        acceptsVideoCall: this.settingsModel().acceptsVideoCall,
      });
      this.online.profile.set(res.profile);
      this.online.connectRealtime();
      this.message.set('You are online and can receive new requests.');
      void this.loadInbox();
      this.startInboxRefresh();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not go online.');
    } finally {
      this.saving.set(false);
    }
  }

  private requestAssignmentNotifications() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    void Notification.requestPermission().catch(() => undefined);
  }

  async goOffline() {
    if (this.availabilityLocked()) {
      this.error.set('Finish or return the active request before pausing availability.');
      return;
    }
    this.saving.set(true);
    try {
      const res = await this.online.setLiveStatus({ liveStatus: 'OFFLINE' });
      this.online.profile.set(res.profile);
      this.online.disconnectRealtime();
      this.stopInboxRefresh();
      this.instantConsults.set([]);
      this.message.set('You are offline and will not receive new requests.');
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

  ngOnDestroy() {
    this.stopInboxRefresh();
    if (!this.isLive()) this.online.disconnectRealtime();
  }
}
