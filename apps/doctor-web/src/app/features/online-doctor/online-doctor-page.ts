import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { OnlineDoctorService } from '../../core/services/online-doctor.service';
import { ROUTE_PATHS } from '../../core/constants/app-routes.constants';
import { DoctorSessionService, type ProviderReadiness } from '../../core/services/doctor-session';
import {
  isClinicalMentalHealthCareTeamType,
  isCoachGuideCareTeamType,
  isListenerCareTeamType,
} from '../../core/constants/doctor-types.constants';

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

  readonly sessionsPath = ROUTE_PATHS.SESSIONS;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly diseases = signal<Array<{ id: string; name: string }>>([]);
  readonly profile = this.online.profile;
  readonly readiness = signal<ProviderReadiness | null>(null);
  readonly instantConsults = signal<InstantConsult[]>([]);
  readonly inboxLoading = signal(false);

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
        acceptsChat: res.profile.acceptsChat,
        acceptsVoiceCall: res.profile.acceptsVoiceCall,
        acceptsVideoCall: res.profile.acceptsVideoCall,
      });
      if (this.isLive()) {
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
    try {
      const res = await this.online.loadInstantConsultations();
      this.instantConsults.set(res.consultations);
    } catch {
      this.instantConsults.set([]);
    } finally {
      this.inboxLoading.set(false);
    }
  }

  isLive() {
    return ['ONLINE', 'BUSY', 'ON_CALL'].includes(this.profile()?.liveStatus ?? 'OFFLINE');
  }

  canAcceptAnyMode() {
    const settings = this.settingsModel();
    return settings.acceptsChat || settings.acceptsVoiceCall || settings.acceptsVideoCall;
  }

  statusLabel() {
    const status = this.profile()?.liveStatus ?? 'OFFLINE';
    if (status === 'ONLINE') return 'Online and accepting new live requests';
    if (status === 'BUSY') return 'Busy with an assigned live session';
    if (status === 'ON_CALL') return 'On a live call';
    return 'Offline — hidden from Live Connect';
  }

  acceptedModesLabel() {
    const modes = [
      this.settingsModel().acceptsChat ? 'chat' : '',
      this.settingsModel().acceptsVoiceCall ? 'voice' : '',
      this.settingsModel().acceptsVideoCall ? 'video' : '',
    ].filter(Boolean);
    return modes.length ? modes.join(' + ') : 'No live mode selected';
  }

  isPsychologist() {
    return this.profile()?.doctorType === 'PSYCHOLOGIST';
  }

  isHomeopathyProvider() {
    return !this.isPsychologist();
  }

  careTeamType() {
    return this.profile()?.mentalHealthProfile?.careTeamType || '';
  }

  isClinicalMentalHealthProvider() {
    return (
      this.isPsychologist() &&
      (!this.careTeamType() || isClinicalMentalHealthCareTeamType(this.careTeamType()))
    );
  }

  isListenerProvider() {
    return this.isPsychologist() && isListenerCareTeamType(this.careTeamType());
  }

  isCoachGuideProvider() {
    return this.isPsychologist() && isCoachGuideCareTeamType(this.careTeamType());
  }

  workspaceTitle() {
    if (this.isClinicalMentalHealthProvider()) return 'Clinical Hope Hub workspace';
    if (this.isListenerProvider()) return 'Listener live workspace';
    if (this.isCoachGuideProvider()) return 'Coaching live workspace';
    if (this.isPsychologist()) return 'Hope Hub live workspace';
    return 'Homeopathy provider — go live';
  }

  workspaceLead() {
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
    if (this.isListenerProvider()) return 'Listener request inbox';
    if (this.isCoachGuideProvider()) return 'Coaching session inbox';
    return 'Live session inbox';
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
        acceptsVideoCall: m.acceptsVideoCall,
      });
      this.online.profile.set(res.profile);
      await this.loadReadiness();
      this.message.set('Settings saved.');
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not save settings.');
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
    if (!this.canAcceptAnyMode()) {
      this.error.set('Choose at least one live mode before going online.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      await this.saveSettings();
      const res = await this.online.setLiveStatus({
        liveStatus: 'ONLINE',
        acceptsChat: this.settingsModel().acceptsChat,
        acceptsVoiceCall: this.settingsModel().acceptsVoiceCall,
        acceptsVideoCall: this.settingsModel().acceptsVideoCall,
      });
      this.online.profile.set(res.profile);
      this.online.connectRealtime();
      this.message.set('You are now visible to users.');
      void this.loadInbox();
      this.startInboxRefresh();
    } catch (error: any) {
      this.error.set(error?.error?.message || 'Could not go online.');
    } finally {
      this.saving.set(false);
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

  ngOnDestroy() {
    this.stopInboxRefresh();
    if (!this.isLive()) this.online.disconnectRealtime();
  }
}
